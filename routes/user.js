const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const Interest = require("../models/Interest");
const bcrypt = require("bcryptjs");
const cloudinary = require("../config/cloudinary");

router.post("/upload-to-cloudinary", auth, async (req, res) => {
  try {
    const { base64Image, type } = req.body;

    if (!base64Image) {
      return res.status(400).json({ msg: "Image required" });
    }

    // ✅ Log config at request time — not just at startup
    const cloudinaryConfig = require("../config/cloudinary").config();
    console.log("Runtime config:", {
      cloud_name: cloudinaryConfig.cloud_name ?? "❌ MISSING",
      api_key:    cloudinaryConfig.api_key    ? "✅ set" : "❌ MISSING",
      api_secret: cloudinaryConfig.api_secret ? "✅ set" : "❌ MISSING",
    });

    const user = await User.findById(req.user.id);
    const safeName = (user.username || "user")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();

    const folder = `nila_matrimony/users/${user._id}_${safeName}/${type || "gallery"}`;

    const result = await cloudinary.uploader.upload(base64Image, {
      folder,
      overwrite: false,
      resource_type: "image",
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });

  } catch (err) {
    // ✅ Log the FULL error object — not just message
    console.error("Full error:", JSON.stringify(err, null, 2));
    console.error("Error message:", err.message);
    console.error("Error http_code:", err.http_code);
    res.status(500).json({ msg: "Upload failed", detail: err.message });
  }
});

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

    if (user.images.length >= 5) {
      return res.status(400).json({ msg: "Maximum 5 photos allowed" });
    }

    user.images.push({ url, public_id });
    await user.save();

    // ✅ Return the newly added image (last item) so Flutter gets the real _id
    const newImage = user.images[user.images.length - 1];

    res.json({
      msg: "Image added",
      image: newImage,   // { _id, url, public_id }
      images: user.images,
    });
  } catch (err) {
    console.error(err);
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

    // ✅ Delete from Cloudinary
    await cloudinary.uploader.destroy(image.public_id);

    // ✅ Remove from DB
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

    // ✅ Delete from Cloudinary using stored public_id
    if (user.horoscope.public_id) {
      await cloudinary.uploader.destroy(user.horoscope.public_id);
    }

    user.horoscope = null;
    await user.save();

    res.json({ msg: "Horoscope deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Delete failed");
  }
});
router.delete("/delete-account", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 🧹 Delete related data (important)
    await require("../models/Message").deleteMany({ sender: userId });
    await require("../models/Conversation").deleteMany({
      participants: userId,
    });

    await require("../models/Interest").deleteMany({
      $or: [{ sender: userId }, { receiver: userId }],
    });

    // 🗑️ Delete user
    await User.findByIdAndDelete(userId);

    res.json({ msg: "User account deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Delete account failed" });
  }
});
router.post("/shortlist/:userId", auth, async (req, res) => {
  try {
    const shortlist = await require("../models/Shortlist").create({
      sender: req.user.id,
      receiver: req.params.userId,
    });

    res.json({ msg: "Shortlisted", shortlist });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: "Already shortlisted" });
    }
    res.status(500).json({ msg: "Error" });
  }
});
router.delete("/shortlist/:userId", auth, async (req, res) => {
  try {
    await require("../models/Shortlist").findOneAndDelete({
      sender: req.user.id,
      receiver: req.params.userId,
    });

    res.json({ msg: "Removed shortlist" });

  } catch (err) {
    res.status(500).json({ msg: "Error" });
  }
});
router.get("/shortlist/sent", auth, async (req, res) => {
  try {
    const list = await require("../models/Shortlist")
      .find({ sender: req.user.id })
      .populate("receiver", "-password");

    res.json({
      count: list.length,
      users: list.map(i => i.receiver),
    });

  } catch (err) {
    res.status(500).json({ msg: "Error" });
  }
});
router.get("/shortlist/received", auth, async (req, res) => {
  try {
    const list = await require("../models/Shortlist")
      .find({ receiver: req.user.id })
      .populate("sender", "-password");

    res.json({
      count: list.length,
      users: list.map(i => i.sender),
    });

  } catch (err) {
    res.status(500).json({ msg: "Error" });
  }
});
router.get("/users-with-shortlist", auth, async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user.id },
    }).select("-password");

    const shortlists = await require("../models/Shortlist").find({
      $or: [
        { sender: req.user.id },
        { receiver: req.user.id },
      ],
    });

    const map = {};

    shortlists.forEach(s => {
      const key1 = `${s.sender}_${s.receiver}`;
      const key2 = `${s.receiver}_${s.sender}`;

      map[key1] = s;
      map[key2] = s;
    });

    const result = users.map(user => {
      const relation = map[`${req.user.id}_${user._id}`];

      return {
        ...user.toObject(),
        isShortlistedByMe: relation
          ? relation.sender.toString() === req.user.id
          : false,
        shortlistedMe: relation
          ? relation.receiver.toString() === req.user.id
          : false,
      };
    });

    res.json({
      count: result.length,
      users: result,
    });

  } catch (err) {
    res.status(500).json({ msg: "Error" });
  }
});
module.exports = router;