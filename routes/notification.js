const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");


// ✅ CREATE
router.post("/", auth, async (req, res) => {
  try {
    const notification = new Notification({
      userId: req.user.id,
      ...req.body
    });

    await notification.save();
    res.json(notification);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


// ✅ GET ALL
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id });
    res.json(notifications);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


// ✅ UPDATE (mark read)
router.put("/:id", auth, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(notification);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


// ✅ DELETE
router.delete("/:id", auth, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted" });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

module.exports = router;