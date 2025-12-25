import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

import crypto from "crypto";

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("Backend running successfully 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

app.post("/api/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest("hex");

  if (expected === razorpay_signature) {
    // ✅ Payment verified
    // 👉 Add credits to DB here
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Invalid signature" });
  }
});

dotenv.config();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Test route
app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

// AI Text Generation
app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({
      text: response.choices[0].message.content,
    });
  } catch (error) {
    res.status(500).json({ error: "AI failed" });
  }
});

app.listen(process.env.PORT, () =>
  console.log("Server running on port", process.env.PORT)
);

app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body; // amount in rupees

    const options = {
      amount: amount * 100, // Razorpay uses paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    res.status(500).json({ error: "Payment order failed" });
  }
});
