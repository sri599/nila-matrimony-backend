const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");

const auth = require("../middleware/authMiddleware");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Plan = require("../models/Plan");

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// 🟢 1. CREATE ORDER (Dynamic Plan)
router.post("/create-order", auth, async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ msg: "Plan ID required" });
    }

    const plan = await Plan.findById(planId);

    if (!plan || !plan.isActive) {
      return res.status(400).json({ msg: "Invalid plan" });
    }

    const options = {
      amount: plan.price * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    await Payment.create({
      user: req.user.id,
      planId: plan._id,
      planName: plan.name,
      amount: plan.price,
      status: "created",
      razorpay_order_id: order.id,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      plan: plan.name,
    });

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
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ msg: "Missing payment data" });
    }

    const payment = await Payment.findOne({ razorpay_order_id });

    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    // 🔐 Signature verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      payment.status = "failed";
      payment.failure_reason = "Signature mismatch";
      await payment.save();

      return res.status(400).json({ msg: "Invalid payment" });
    }

    // ✅ Mark success
    payment.status = "success";
    payment.razorpay_payment_id = razorpay_payment_id;
    payment.razorpay_signature = razorpay_signature;
    await payment.save();

    // ✅ Assign plan
    const user = await User.findById(req.user.id);
    const plan = await Plan.findById(payment.planId);

    if (!plan) {
      return res.status(400).json({ msg: "Plan not found" });
    }

    user.plan = plan.name;
    user.contactsRemaining = plan.contactsLimit;

    await user.save();

    res.json({
      msg: "Payment success & plan activated",
      plan: plan.name,
      contacts: plan.contactsLimit,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Verification failed" });
  }
});


// 🟢 3. PAYMENT FAILED
router.post("/payment-failed", auth, async (req, res) => {
  try {
    const { razorpay_order_id, reason } = req.body;

    if (!razorpay_order_id) {
      return res.status(400).json({ msg: "Order ID required" });
    }

    await Payment.findOneAndUpdate(
      { razorpay_order_id },
      {
        status: "failed",
        failure_reason: reason || "Unknown",
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
      .populate("planId", "name price contactsLimit")
      .sort({ createdAt: -1 });

    res.json({
      count: payments.length,
      payments,
    });

  } catch (err) {
    res.status(500).json({ msg: "Error fetching payments" });
  }
});


// 🟢 5. GET MY PLAN
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


// 🟢 6. USE CONTACT
router.post("/use-contact", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.plan) {
      return res.status(400).json({ msg: "No active plan" });
    }

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