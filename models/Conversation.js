const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
  lastMessage:  { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  lastActivity: { type: Date, default: Date.now },
}, { timestamps: true });

// Ensure only one conversation per pair
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);