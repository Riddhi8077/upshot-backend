import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import Razorpay from "razorpay";
import crypto from "crypto";

/* ------------------ ENV ------------------ */
dotenv.config();

/* ------------------ VALIDATION ------------------ */
const REQUIRED_ENV = [
  "PORT",
  "OPENAI_API_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key] || process.env[key].trim() === "") {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1); // hard stop → Railway shows real reason
  }
}

/* ------------------ APP ------------------ */
const app = express();
app.use(cors());
app.use(express.json());

/* ------------------ SERVICES ------------------ */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID.trim(),
  key_secret: process.env.RAZORPAY_KEY_SECRET.trim(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY.trim(),
});

/* ------------------ ROUTES ------------------ */
app.get("/", (req, res) => {
  res.status(200).send("Upshot backend running successfully 🚀");
});

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({
      text: response.choices[0].message.content,
    });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ error: "Payment order failed" });
  }
});

app.post("/api/verify-payment", (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      return res.json({ success: true });
    }

    res.status(400).json({ error: "Invalid signature" });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

/* ------------------ START ------------------ */
const PORT = Number(process.env.PORT);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
