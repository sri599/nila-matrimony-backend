const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");

const auth = require("../middleware/authMiddleware");
const Payment = require("../models/Payment");
const User = require("../models/User");

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 🟢 1. CREATE ORDER
router.post("/create-order", auth, async (req, res) => {
  try {
    const { amount, plan } = req.body;

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    await Payment.create({
      user: req.user.id,
      plan,
      amount,
      status: "created",
      razorpay_order_id: order.id,
    });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Order creation failed" });
  }
});

// 🟢 2. VERIFY PAYMENT
router.post("/verify-payment", auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpay_order_id },
        { status: "failed", failure_reason: "Signature mismatch" }
      );

      return res.status(400).json({ msg: "Invalid payment" });
    }

    // ✅ Update payment success
    await Payment.findOneAndUpdate(
      { razorpay_order_id },
      {
        status: "success",
        razorpay_payment_id,
        razorpay_signature,
      }
    );

    // ✅ Assign plan
    const user = await User.findById(req.user.id);

    if (plan === "basic") {
      user.plan = "basic";
      user.contactsRemaining = 5;
    } else if (plan === "standard") {
      user.plan = "standard";
      user.contactsRemaining = 15;
    } else if (plan === "premium") {
      user.plan = "premium";
      user.contactsRemaining = 50;
    }

    await user.save();

    res.json({ msg: "Payment verified & plan activated" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Verification failed" });
  }
});

// 🟢 3. PAYMENT FAILED
router.post("/payment-failed", auth, async (req, res) => {
  try {
    const { razorpay_order_id, reason } = req.body;

    await Payment.findOneAndUpdate(
      { razorpay_order_id },
      {
        status: "failed",
        failure_reason: reason,
      }
    );

    res.json({ msg: "Failure recorded" });

  } catch (err) {
    res.status(500).json({ msg: "Failed to record failure" });
  }
});

// 🟢 4. GET MY PAYMENTS
router.get("/my-payments", auth, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      count: payments.length,
      payments,
    });

  } catch (err) {
    res.status(500).json({ msg: "Error fetching payments" });
  }
});

// 🟢 5. CHECK USER PLAN
router.get("/my-plan", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      plan: user.plan,
      contactsRemaining: user.contactsRemaining,
    });

  } catch (err) {
    res.status(500).json({ msg: "Error" });
  }
});

// 🟢 6. USE CONTACT (unlock phone)
router.post("/use-contact", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.contactsRemaining <= 0) {
      return res.status(400).json({ msg: "No contacts left" });
    }

    user.contactsRemaining -= 1;
    await user.save();

    res.json({
      msg: "Contact unlocked",
      remaining: user.contactsRemaining,
    });

  } catch (err) {
    res.status(500).json({ msg: "Error" });
  }
});

module.exports = router;