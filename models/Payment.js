const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  plan: String,

  amount: Number,

  status: {
    type: String,
    enum: ["created", "success", "failed"],
    default: "created",
  },

  razorpay_order_id: String,
  razorpay_payment_id: String,
  razorpay_signature: String,

  failure_reason: String,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Payment", PaymentSchema);