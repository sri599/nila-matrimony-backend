const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
router.put("/forgot-password", async (req, res) => {
  try {
    const { mobile, newPassword } = req.body;

    if (!mobile || !newPassword) {
      return res.status(400).json({ msg: "Mobile and new password required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        msg: "Password must be at least 6 characters",
      });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({
        msg: "New password cannot be same as current password",
      });
    }

    const history = user.passwordHistory || [];

    for (let old of history) {
      const match = await bcrypt.compare(newPassword, old);
      if (match) {
        return res.status(400).json({
          msg: "Cannot reuse old password",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.passwordHistory = history;
    user.passwordHistory.unshift(user.password);

    if (user.passwordHistory.length > 5) {
      user.passwordHistory.pop();
    }

    user.password = hashedPassword;

    await user.save();

    res.json({ msg: "Password reset successful" });

  } catch (err) {
    console.error("Forgot password error:", err); // ✅ FIX
    res.status(500).json({ msg: "Forgot password failed" }); // ✅ FIX
  }
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { mobile, password, username } = req.body;

    let user = await User.findOne({ mobile });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      mobile,
      password: hashedPassword,
      username,

      userId: new Date().getTime().toString(),
      matrimonyId: "MT" + Math.floor(100000 + Math.random() * 900000),
      joinedOn: new Date(),
    });

    await newUser.save();

    res.json({ msg: "Registered successfully" });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

router.post("/login", async (req, res) => {
  try {
    const { mobile, password, fcmToken } = req.body;

    // ✅ 1. Validate input
    if (!mobile || !password) {
      return res.status(400).json({ msg: "Mobile and password required" });
    }

    // ✅ 2. Check user
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(400).json({ msg: "Invalid mobile" });
    }

    // ✅ 3. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid password" });
    }

    // ✅ 4. Update last seen + FCM
    user.lastSeen = new Date();
    if (fcmToken) user.fcmToken = fcmToken;

    await user.save();

    // ✅ 5. Generate token
    const token = jwt.sign(
      { user: { id: user.id } },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ 6. REMOVE password before sending
    const userObj = user.toObject();
    delete userObj.password;

    // ✅ 7. Clean response
    res.json({
      msg: "Login successful",
      token,
      user: userObj,
    });

  } catch (err) {
    res.status(500).send("Server Error");
  }
});

module.exports = router;