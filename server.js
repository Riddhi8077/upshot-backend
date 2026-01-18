import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import Razorpay from "razorpay";
import crypto from "crypto";

const PLAN_CREDITS = {
  trial: 1,   // ₹9
  basic: 10,  // ₹99
  pro: 50     // ₹349
};

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
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
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
    const { plan } = req.body;

    const PLAN_AMOUNT = {
      trial: 9,
      basic: 99,
      pro: 349,
    };

    const amount = PLAN_AMOUNT[plan];
    if (!amount) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: "Order creation failed" });
  }
});

app.post("/api/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      userId
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // ✅ Payment verified — add credits
    const creditsToAdd = PLAN_CREDITS[plan];

    if (!creditsToAdd) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    await User.updateOne(
      { _id: userId },
      { $inc: { credits: creditsToAdd } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Payment verification failed" });
  }
});

/* ------------------ START ------------------ */
const PORT = Number(process.env.PORT);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
