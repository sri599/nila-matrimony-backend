const express      = require("express");
const router       = express.Router();
const auth         = require("../middleware/authMiddleware");
const Message      = require("../models/Message");
const Conversation = require("../models/Conversation");
const User         = require("../models/User");

// In routes/message.js — getOrCreateConversation
router.post("/conversation/:userId", auth, async (req, res) => {
  try {
    const me    = req.user.id;
    const other = req.params.userId;

    if (me === other) return res.status(400).json({ msg: "Cannot message yourself" });

    let conv = await Conversation.findOne({
      participants: { $all: [me, other], $size: 2 },
    });

    if (!conv) {
      conv = await Conversation.create({ participants: [me, other] });
    }

    // Populate both participants AND lastMessage
    conv = await conv.populate("participants", "-password");
    conv = await conv.populate({
      path: "lastMessage",
      populate: { path: "sender", select: "username images" },
    });

    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── Get all conversations for current user ────────────────────────────────
router.get("/conversations", auth, async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user.id })
      .populate("participants", "-password")
      .populate("lastMessage")
      .sort({ lastActivity: -1 });

    res.json(convs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── Get messages in a conversation (paginated) ────────────────────────────
router.get("/:conversationId/messages", auth, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (page - 1) * limit;

    const conv = await Conversation.findById(req.params.conversationId);
    if (!conv) return res.status(404).json({ msg: "Conversation not found" });

    if (!conv.participants.includes(req.user.id)) {
      return res.status(403).json({ msg: "Not a participant" });
    }

    const messages = await Message.find({
      conversationId: req.params.conversationId,
      deletedFor:     { $nin: [req.user.id] },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("sender", "username images");

    // Mark messages as read
    await Message.updateMany(
      { conversationId: req.params.conversationId, sender: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    );

    res.json(messages.reverse()); // oldest first
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── Send a message (REST fallback — primary is Socket.IO) ─────────────────
router.post("/:conversationId/send", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ msg: "Message required" });

    const conv = await Conversation.findById(req.params.conversationId);
    if (!conv) return res.status(404).json({ msg: "Conversation not found" });
    if (!conv.participants.includes(req.user.id)) {
      return res.status(403).json({ msg: "Not a participant" });
    }

    const msg = await Message.create({
      conversationId: req.params.conversationId,
      sender:         req.user.id,
      text:           text.trim(),
      readBy:         [req.user.id],
    });

    // Update conversation last activity
    conv.lastMessage  = msg._id;
    conv.lastActivity = new Date();
    await conv.save();

    const populated = await msg.populate("sender", "username images");
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── Delete a message (for me only) ───────────────────────────────────────
router.delete("/:messageId", auth, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ msg: "Message not found" });

    await Message.findByIdAndUpdate(req.params.messageId, {
      $addToSet: { deletedFor: req.user.id },
    });

    res.json({ msg: "Deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// ── Unread count ──────────────────────────────────────────────────────────
router.get("/unread/count", auth, async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user.id });
    const convIds = convs.map((c) => c._id);

    const count = await Message.countDocuments({
      conversationId: { $in: convIds },
      sender:         { $ne: req.user.id },
      readBy:         { $nin: [req.user.id] },
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;