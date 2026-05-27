/**
 * auth.controller.js — Register, login, get current user.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Helper: generate JWT ───────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  // Remove password from output
  user.password = undefined;
  res.status(statusCode).json({
    success: true,
    token,
    user,
  });
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A pirate with that email or username already sails these waters.',
      });
    }

    const user = await User.create({ username, email, password });
    sendToken(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    // Include password field for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. The Sea King does not know you.',
      });
    }

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

// ── PATCH /api/auth/fcm-token ─────────────────────────────────────────────────
exports.updateFcmToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'FCM token required.' });

    // Add token if not already stored
    if (!req.user.fcmTokens.includes(token)) {
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { fcmTokens: token },
      });
    }

    res.status(200).json({ success: true, message: 'FCM token registered.' });
  } catch (err) {
    next(err);
  }
};
