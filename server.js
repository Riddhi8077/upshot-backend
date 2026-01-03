import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import Razorpay from "razorpay";
import crypto from "crypto";

dotenv.config(); // MUST be at top

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Razorpay ----------
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ---------- OpenAI ----------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- Health Check ----------
app.get("/", (req, res) => {
  res.send("Upshot backend running successfully 🚀");
});

// ---------- AI GENERATION ----------
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ text: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failed" });
  }
});

// ---------- CREATE ORDER ----------
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: "Payment order failed" });
  }
});

// ---------- VERIFY PAYMENT ----------
app.post("/api/verify-payment", (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Invalid signature" });
  }
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
