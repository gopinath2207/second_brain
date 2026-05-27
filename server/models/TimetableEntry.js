/**
 * TimetableEntry.js — A scheduled class or recurring event for the Log Pose Timetable.
 *
 * Supports both one-time and recurring (weekly by day-of-week) events.
 */
const mongoose = require('mongoose');

const TimetableEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Class title is required'],
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    // Room/location
    location: {
      type: String,
      default: '',
    },
    // Color code for the timetable UI (hex)
    color: {
      type: String,
      default: '#00ff9d', // Neon green default (Zoro's aura)
    },

    // ── Timing ────────────────────────────────────────────────────────────────
    startTime: {
      type: String, // "09:00" 24hr format
      required: true,
    },
    endTime: {
      type: String, // "10:30"
      required: true,
    },

    // ── Recurrence ────────────────────────────────────────────────────────────
    isRecurring: {
      type: Boolean,
      default: true,
    },
    // Days of week: 0=Sunday, 1=Monday, ... 6=Saturday
    daysOfWeek: {
      type: [Number],
      default: [],
      validate: {
        validator: (v) => v.every((d) => d >= 0 && d <= 6),
        message: 'Days must be 0–6',
      },
    },
    // For one-time events
    specificDate: {
      type: Date,
      default: null,
    },

    // ── Academic metadata ────────────────────────────────────────────────────
    professor: {
      type: String,
      default: '',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    meetLink: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Fetch today's classes efficiently
TimetableEntrySchema.index({ user: 1, isActive: 1, daysOfWeek: 1 });

module.exports = mongoose.model('TimetableEntry', TimetableEntrySchema);
