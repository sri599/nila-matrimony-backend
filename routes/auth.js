const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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