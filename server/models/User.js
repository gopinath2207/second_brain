/**
 * User.js — User schema
 * Stores auth credentials, FCM tokens, and aggregate bounty score.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries by default
    },

    // ── One Piece Theme ───────────────────────────────────────────────────────
    bountyPoints: {
      type: Number,
      default: 0,
      index: true, // For leaderboard queries
    },
    title: {
      type: String,
      default: 'Pirate Apprentice', // Upgrades as bounty grows
    },
    avatar: {
      type: String,
      default: 'zoro', // Maps to a set of avatar options
    },

    // ── FCM / Notifications ───────────────────────────────────────────────────
    fcmTokens: {
      type: [String],
      default: [],
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },

    // ── Preferences ───────────────────────────────────────────────────────────
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    plannerTime: {
      type: String,
      default: '05:00', // Time the cron job fires for this user
    },
  },
  { timestamps: true }
);

// ── Pre-save hook: hash password before saving ────────────────────────────────
// NOTE: Mongoose 8.x no longer passes `next` as a usable callback in pre-hooks.
// Use async/await and return early instead of calling next().
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Instance method: compare entered password with stored hash ────────────────
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ── Static method: update title based on bounty points ───────────────────────
UserSchema.statics.getBountyTitle = function (points) {
  if (points < 100) return 'Pirate Apprentice';
  if (points < 500) return 'Rookie Pirate';
  if (points < 1000) return 'Super Rookie';
  if (points < 5000) return 'Warlord of the Study';
  if (points < 10000) return 'Yonko\'s Commander';
  return 'Pirate King';
};

module.exports = mongoose.model('User', UserSchema);
