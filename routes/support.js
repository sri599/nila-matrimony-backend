const express = require("express");
const router = express.Router();
const Support = require("../models/Support");


// ✅ CREATE (POST)
router.post("/", async (req, res) => {
  try {
    const { email, phone } = req.body;

    const support = new Support({ email, phone });
    await support.save();

    res.json({
      success: true,
      message: "Support details created",
      data: support
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ✅ GET (Fetch latest support info)
router.get("/", async (req, res) => {
  try {
    const support = await Support.findOne().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: support
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ✅ UPDATE (PUT)
router.put("/:id", async (req, res) => {
  try {
    const { email, phone } = req.body;

    const updated = await Support.findByIdAndUpdate(
      req.params.id,
      { email, phone },
      { new: true }
    );

    res.json({
      success: true,
      message: "Support details updated",
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;