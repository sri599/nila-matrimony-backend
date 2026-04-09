const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const Interest = require("../models/Interest");
router.get("/users-with-interest", auth, async (req, res) => {
  try {
    // 1️⃣ Get all users except current user
    const users = await User.find({
      _id: { $ne: req.user.id },
    }).select("-password");

    // 2️⃣ Get all interests related to current user
    const interests = await Interest.find({
      $or: [
        { sender: req.user.id },
        { receiver: req.user.id },
      ],
    });

    // 3️⃣ Convert interests to map for fast lookup
    const interestMap = {};

    interests.forEach(i => {
      const key1 = `${i.sender}_${i.receiver}`;
      const key2 = `${i.receiver}_${i.sender}`;

      interestMap[key1] = i;
      interestMap[key2] = i;
    });

    // 4️⃣ Attach interest info to users
    const result = users.map(user => {
      const relation = interestMap[`${req.user.id}_${user._id}`];

      return {
        ...user.toObject(),
        interestStatus: relation ? relation.status : null, // pending / accepted / rejected
        isSender: relation
          ? relation.sender.toString() === req.user.id
          : false,
      };
    });

    res.json({
      count: result.length,
      users: result,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});
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
  "email",              // ✅ NEW
  "gender",             // ✅ NEW
  "maritalStatus",
  "profileCreatedBy",
  "age",
  "height",
  "caste",
  "subcaste",
  "gothram",
  "dosham",
  "rasi",               // ✅ NEW
  "religion",
  "degree",
  "workingStatus",
  "occupation",
  "annualIncome",       // ✅ NEW
  "address",
  "pincode",
  "country",            // ✅ NEW
  "citizenship",        // ✅ NEW
  "residingState",      // ✅ NEW
  "residingCity",       // ✅ NEW
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


router.post("/partner-preference", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const {
      ageFrom,
      ageTo,
      heightFrom,
      heightTo,
      maritalStatus,
      motherTongue,
      physicalStatus,
      eatingHabits,
      smokingHabits,
      drinkingHabits,
      religion,
      caste,
      subcaste,
      star,
      dosham,
      education,
      employmentType,
      occupation,
      annualIncome,
      country,
      citizenship,
      residingState,
      residingCity,
    } = req.body;

    user.partnerPreference = {
      ageFrom,
      ageTo,
      heightFrom,
      heightTo,
      maritalStatus,
      motherTongue,
      physicalStatus,
      eatingHabits,
      smokingHabits,
      drinkingHabits,
      religion,
      caste,
      subcaste,
      star,
      dosham,
      education,
      employmentType,
      occupation,
      annualIncome,
      country,
      citizenship,
      residingState,
      residingCity,
    };

    await user.save();

    res.json(user.partnerPreference);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});
module.exports = router;