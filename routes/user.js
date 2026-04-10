const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const Interest = require("../models/Interest");
const bcrypt = require("bcryptjs");
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
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1️⃣ Validate
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        msg: "Password must be at least 6 characters",
      });
    }

    // 2️⃣ Get user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // 3️⃣ Check current password
    if (!user.password) {
      return res.status(500).json({ msg: "User password missing in DB" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Current password is incorrect" });
    }

    // 4️⃣ Prevent same password
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({
        msg: "New password cannot be same as current password",
      });
    }

    // 5️⃣ Prevent reuse (SAFE)
    const history = user.passwordHistory || [];

    for (let old of history) {
      const match = await bcrypt.compare(newPassword, old);
      if (match) {
        return res.status(400).json({
          msg: "Cannot reuse old password",
        });
      }
    }

    // 6️⃣ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 7️⃣ Store old password
    user.passwordHistory = history;
    user.passwordHistory.unshift(user.password);

    if (user.passwordHistory.length > 5) {
      user.passwordHistory.pop();
    }

    // 8️⃣ Update
    user.password = hashedPassword;

    await user.save();

    res.json({ msg: "Password changed successfully" });

  } catch (err) {
    handleError(res, err, "Change password failed");
  }
});
router.post("/upload-image", auth, async (req, res) => {
  try {
    const { url, public_id } = req.body;

    if (!url || !public_id) {
      return res.status(400).json({ msg: "Image data required" });
    }

    const user = await User.findById(req.user.id);

    user.images.push({ url, public_id });

    await user.save();

    res.json({
      msg: "Image added",
      images: user.images,
    });

  } catch (err) {
    res.status(500).send("Upload failed");
  }
});
router.delete("/delete-image/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const image = user.images.find(
      (img) => img._id.toString() === req.params.id
    );

    if (!image) {
      return res.status(404).json({ msg: "Image not found" });
    }

    // 👉 Later: delete from Cloudinary using public_id

    user.images = user.images.filter(
      (img) => img._id.toString() !== req.params.id
    );

    await user.save();

    res.json({ msg: "Image deleted", images: user.images });

  } catch (err) {
    res.status(500).send("Delete failed");
  }
});
router.post("/upload-horoscope", auth, async (req, res) => {
  try {
    const { url, public_id } = req.body;

    if (!url || !public_id) {
      return res.status(400).json({ msg: "Horoscope required" });
    }

    const user = await User.findById(req.user.id);

    user.horoscope = { url, public_id };

    await user.save();

    res.json({
      msg: "Horoscope uploaded",
      horoscope: user.horoscope,
    });

  } catch (err) {
    res.status(500).send("Upload failed");
  }
});
router.delete("/delete-horoscope", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.horoscope) {
      return res.status(404).json({ msg: "No horoscope found" });
    }

    // 👉 Later: delete from Cloudinary using public_id

    user.horoscope = null;

    await user.save();

    res.json({ msg: "Horoscope deleted" });

  } catch (err) {
    res.status(500).send("Delete failed");
  }
});

module.exports = router;