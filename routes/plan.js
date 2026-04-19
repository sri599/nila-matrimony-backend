// routes/plan.js
const express = require("express");
const router = express.Router();

const Plan = require("../models/Plan");
const auth = require("../middleware/authMiddleware");

// Optional: admin check
const isAdmin = (req, res, next) => {
  // If you don’t have admin, remove this
  next();
};

// 🟢 CREATE PLAN
router.post("/", auth, isAdmin, async (req, res) => {
  try {
    const { name, price, contactsLimit } = req.body;

    const plan = await Plan.create({
      name,
      price,
      contactsLimit,
    });

    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Create failed" });
  }
});

// 🟢 GET ALL PLANS
router.get("/", async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 });

    res.json({
      count: plans.length,
      plans,
    });
  } catch (err) {
    res.status(500).json({ msg: "Fetch failed" });
  }
});

// 🟢 GET SINGLE PLAN
router.get("/:id", async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ msg: "Plan not found" });
    }

    res.json(plan);
  } catch (err) {
    res.status(500).json({ msg: "Error" });
  }
});

// 🟢 UPDATE PLAN
router.put("/:id", auth, isAdmin, async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(plan);
  } catch (err) {
    res.status(500).json({ msg: "Update failed" });
  }
});

// 🟢 DELETE PLAN (soft)
router.delete("/:id", auth, isAdmin, async (req, res) => {
  try {
    await Plan.findByIdAndUpdate(req.params.id, {
      isActive: false,
    });

    res.json({ msg: "Plan disabled" });
  } catch (err) {
    res.status(500).json({ msg: "Delete failed" });
  }
});

module.exports = router;