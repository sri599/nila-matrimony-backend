const express = require("express");
const router = express.Router();
const Interest = require("../models/Interest");
const auth = require("../middleware/authMiddleware");
const User = require("../models/User");
const sendPush = require("../utils/sendPush");

router.post("/", auth, async (req, res) => {
  try {
    const { receiverId } = req.body;

    if (receiverId === req.user.id) {
      return res.status(400).json({ msg: "Cannot send interest to yourself" });
    }

    const exists = await Interest.findOne({
      sender: req.user.id,
      receiver: receiverId,
    });

    if (exists) {
      return res.status(400).json({ msg: "Interest already sent" });
    }

    const interest = new Interest({
      sender: req.user.id,
      receiver: receiverId,
    });

    await interest.save();

    const sender = await User.findById(req.user.id);
    const receiver = await User.findById(receiverId);

    if (receiver?.fcmToken) {
      await sendPush({
        token: receiver.fcmToken,
        title: "New Interest 💖",
        body: `${sender.username} showed interest in your profile`,
      });
    }

    res.json(interest);

  } catch (err) {
    res.status(500).send("Server Error");
  }
});


// ✅ GET SENT INTERESTS
router.get("/sent", auth, async (req, res) => {
  try {
    const interests = await Interest.find({ sender: req.user.id })
      .populate("receiver", "-password");

    res.json(interests);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


// ✅ GET RECEIVED INTERESTS
router.get("/received", auth, async (req, res) => {
  try {
    const interests = await Interest.find({ receiver: req.user.id })
      .populate("sender", "-password");

    res.json(interests);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


router.put("/:id", auth, async (req, res) => {
  try {
    const { status } = req.body; // accepted / rejected

    const interest = await Interest.findById(req.params.id);

    if (!interest) {
      return res.status(404).json({ msg: "Interest not found" });
    }

    if (interest.receiver.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    interest.status = status;
    await interest.save();

    // 🔔 PUSH NOTIFICATION (ACCEPT / REJECT)
    const sender = await User.findById(interest.sender);
    const receiver = await User.findById(req.user.id);

    if (sender?.fcmToken) {
      let title = "";
      let body = "";

      if (status === "accepted") {
        title = "Interest Accepted ✅";
        body = `${receiver.username} accepted your interest`;
      } else if (status === "rejected") {
        title = "Interest Declined ❌";
        body = `${receiver.username} declined your interest`;
      }

      await sendPush({
        token: sender.fcmToken,
        title,
        body,
      });
    }

    res.json(interest);

  } catch (err) {
    res.status(500).send("Server Error");
  }
});


// ✅ DELETE (Cancel / Remove)
router.delete("/:id", auth, async (req, res) => {
  try {
    const interest = await Interest.findById(req.params.id);

    if (!interest) {
      return res.status(404).json({ msg: "Interest not found" });
    }

    // Only sender OR receiver can delete
    if (
      interest.sender.toString() !== req.user.id &&
      interest.receiver.toString() !== req.user.id
    ) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    await interest.deleteOne();

    res.json({ msg: "Interest removed" });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

module.exports = router;