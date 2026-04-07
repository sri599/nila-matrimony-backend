const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
// GET ALL USERS (Protected)
router.get("/users", auth, async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json({
      count: users.length,
      users,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});
router.get("/profile/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


router.post("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const fields = [
      "username",
      "maritalStatus",
      "profileCreatedBy",
      "age",
      "height",
      "caste",
      "subcaste",
      "gothram",
      "dosham",
      "religion",
      "degree",
      "workingStatus",
      "occupation",
      "address",
      "pincode",
      "physicalStatus",
      "motherTongue",
      "eatingHabits",
      "dob",
      "familyStatus",
      "ancestralOrigin",
      "about",
      "hobbies",
      "movies",
      "smokingHabits",
      "drinkingHabits"
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res.json(userObj);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


router.put("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const updates = Object.keys(req.body);

    updates.forEach(field => {
      user[field] = req.body[field];
    });

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res.json(userObj);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


// ✅ PARTNER PREFERENCE
router.post("/partner-preference", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.partnerPreference = req.body;

    await user.save();

    res.json(user.partnerPreference);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

module.exports = router;