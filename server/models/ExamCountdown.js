/**
 * ExamCountdown.js — "Buster Call" high-priority exam/event countdown.
 * Pinned to the dashboard and changes UI state as date approaches.
 */
const mongoose = require('mongoose');

const ExamCountdownSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
    },
    subject: {
      type: String,
      default: '',
    },
    examDate: {
      type: Date,
      required: [true, 'Exam date is required'],
    },
    // Alert threshold in days (turns red when this close)
    alertThresholdDays: {
      type: Number,
      default: 7,
    },
    // Linked syllabus page
    syllabusPage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Page',
      default: null,
    },
    // Visual urgency level
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    notes: {
      type: String,
      default: '',
    },
    isPinned: {
      type: Boolean,
      default: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

ExamCountdownSchema.index({ user: 1, examDate: 1, isCompleted: 1 });

module.exports = mongoose.model('ExamCountdown', ExamCountdownSchema);
