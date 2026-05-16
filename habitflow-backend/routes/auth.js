const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ==========================================
// 📝 USER REGISTRATION ENDPOINT (/api/auth/signup)
// ==========================================
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validation: Verify all fields exist
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all required profile registration fields.' });
    }

    // 2. Check for existing user account
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email address already exists.' });
    }

    // 3. Cryptography: Hash and Salt the password safely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Persistence: Save the clean profile to MongoDB Atlas
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });
    const savedUser = await newUser.save();

    // 5. Security: Sign a session JWT token
    const token = jwt.sign(
      { id: savedUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Session stays valid for 1 week
    );

    // 6. Response: Dispatch token and public user details
    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 🔑 USER LOGIN ENDPOINT (/api/auth/login)
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validation Check
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password credentials.' });
    }

    // 2. Lookup record in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials. User account record not found.' });
    }

    // 3. Verification: Decrypt and compare passwords safely
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials. Password verification failed.' });
    }

    // 4. Session Token Signing
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Dispatch success payout response
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;