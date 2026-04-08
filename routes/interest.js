const express = require("express");
const router = express.Router();
const Interest = require("../models/Interest");
const auth = require("../middleware/authMiddleware");


// ✅ SEND INTEREST
router.post("/", auth, async (req, res) => {
  try {
    const { receiverId } = req.body;

    // ❌ Prevent self request
    if (receiverId === req.user.id) {
      return res.status(400).json({ msg: "Cannot send interest to yourself" });
    }

    // ❌ Prevent duplicate
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


// ✅ ACCEPT / REJECT INTEREST
router.put("/:id", auth, async (req, res) => {
  try {
    const { status } = req.body; // accepted / rejected

    const interest = await Interest.findById(req.params.id);

    if (!interest) {
      return res.status(404).json({ msg: "Interest not found" });
    }

    // Only receiver can update
    if (interest.receiver.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    interest.status = status;

    await interest.save();

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