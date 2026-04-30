const express = require("express");
const router = express.Router();

const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

// =========================
// 🟢 CREATE CONVERSATION
// =========================
router.post("/conversation", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    let conv = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conv) {
      conv = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    res.json(conv);
  } catch (err) {
    res.status(500).json({ msg: "Error creating conversation" });
  }
});

// =========================
// 🟢 SEND MESSAGE (CREATE)
// =========================
router.post("/message", async (req, res) => {
  try {
    const { conversationId, senderId, text } = req.body;

    if (!text) {
      return res.status(400).json({ msg: "Message required" });
    }

    const message = await Message.create({
      conversationId,
      sender: senderId,
      text,
      readBy: [senderId],
    });

    res.json(message);
  } catch (err) {
    res.status(500).json({ msg: "Error sending message" });
  }
});

// =========================
// 🟢 GET ALL MESSAGES
// =========================
router.get("/messages/:conversationId", async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching messages" });
  }
});

// =========================
// 🟢 GET USER CONVERSATIONS
// =========================
router.get("/conversations/:userId", async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.params.userId,
    });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching conversations" });
  }
});

// =========================
// 🟡 UPDATE MESSAGE
// =========================
router.put("/message/:messageId", async (req, res) => {
  try {
    const { text } = req.body;

    const updated = await Message.findByIdAndUpdate(
      req.params.messageId,
      { text },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ msg: "Error updating message" });
  }
});

// =========================
// 🔴 DELETE MESSAGE
// =========================
router.delete("/message/:messageId", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.messageId);
    res.json({ msg: "Message deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Error deleting message" });
  }
});
// PATCH /api/messages/message/:messageId/read
router.patch("/message/:messageId/read", async (req, res) => {
  try {
    const { userId } = req.body;
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { $addToSet: { readBy: userId } },   // addToSet avoids duplicates
      { new: true }
    );
    res.json(message);
  } catch (err) {
    res.status(500).json({ msg: "Error marking as read" });
  }
});

// PATCH /api/messages/conversation/:conversationId/read-all  
router.patch("/conversation/:conversationId/read-all", async (req, res) => {
  try {
    const { userId } = req.body;
    await Message.updateMany(
      { conversationId: req.params.conversationId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
    res.json({ msg: "All messages marked as read" });
  } catch (err) {
    res.status(500).json({ msg: "Error marking messages as read" });
  }
});

module.exports = router;