/**
 * HabitLog.js — Individual habit completion record.
 * One document per habit-per-day completion.
 * Queried heavily for heatmap and streak calculations.
 */
const mongoose = require('mongoose');

const HabitLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    habit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
    },
    // Store the DATE only (normalized to midnight UTC) for easy day-grouping
    date: {
      type: Date,
      required: true,
    },
    // Optional note logged with the completion
    note: {
      type: String,
      default: '',
      maxlength: 500,
    },
    // Bounty awarded for this specific completion
    bountyEarned: {
      type: Number,
      default: 10,
    },
    // Completion quality: 1=did it, 2=crushed it, 3=perfect
    quality: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
    },
  },
  { timestamps: true }
);

// Prevent duplicate completions for same habit on same day
HabitLogSchema.index({ user: 1, habit: 1, date: 1 }, { unique: true });
// Heatmap query: all logs for a user in a date range
HabitLogSchema.index({ user: 1, date: 1 });
// Habit analytics
HabitLogSchema.index({ habit: 1, date: -1 });

module.exports = mongoose.model('HabitLog', HabitLogSchema);
