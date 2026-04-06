const express = require("express");
const router = express.Router();
const Interest = require("../models/Interest");
const auth = require("../middleware/authMiddleware");


// ✅ CREATE INTEREST
router.post("/", auth, async (req, res) => {
  try {
    const interest = new Interest({
      userId: req.user.id,
      interestedIn: req.body.interestedIn
    });

    await interest.save();
    res.json(interest);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


// ✅ GET ALL INTERESTS OF USER
router.get("/", auth, async (req, res) => {
  try {
    const interests = await Interest.find({ userId: req.user.id });
    res.json(interests);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


// ✅ DELETE INTEREST
router.delete("/:id", auth, async (req, res) => {
  try {
    await Interest.findByIdAndDelete(req.params.id);
    res.json({ msg: "Interest removed" });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

module.exports = router;