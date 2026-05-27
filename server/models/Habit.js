/**
 * Habit.js — A recurring "Haki Training" habit definition.
 * HabitLog tracks each completion instance separately.
 */
const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Habit name is required'],
      trim: true,
      maxlength: [100, 'Habit name too long'],
    },
    description: {
      type: String,
      default: '',
    },
    // Icon emoji for UI display
    icon: {
      type: String,
      default: '⚔️',
    },
    // Color for heatmap cells (hex)
    color: {
      type: String,
      default: '#00ff9d',
    },
    // Bounty points awarded per completion
    bountyReward: {
      type: Number,
      default: 10,
    },
    // Target frequency: 'daily' | 'weekly'
    frequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'daily',
    },
    // For weekly habits, which days (0-6)
    targetDays: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6], // All days by default
    },
    // Streak tracking (updated via HabitLog aggregation)
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    totalCompletions: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Ordering in the Quick Add UI
    order: {
      type: Number,
      default: 1000,
    },
  },
  { timestamps: true }
);

HabitSchema.index({ user: 1, isActive: 1, order: 1 });

module.exports = mongoose.model('Habit', HabitSchema);
