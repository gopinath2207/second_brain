/**
 * DayPlan.js — AI-generated daily schedule (output of the Autonomous Planner).
 * One document per user per day.
 */
const mongoose = require('mongoose');

const ScheduleItemSchema = new mongoose.Schema(
  {
    time: { type: String, required: true },       // "06:00"
    endTime: { type: String, required: true },    // "07:00"
    duration: { type: Number, required: true },   // minutes
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['study', 'haki_training', 'class', 'break', 'review', 'coding', 'rest', 'other'],
      default: 'study',
    },
    // Reference to a specific block (e.g., a syllabus topic)
    blockRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Block',
      default: null,
    },
    // Reference to a habit
    habitRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      default: null,
    },
    priority: { type: Number, default: 3 },       // 1=critical, 2=high, 3=normal, 4=low
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: true }
);

const DayPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The date this plan covers (normalized to midnight UTC)
    date: {
      type: Date,
      required: true,
    },
    schedule: {
      type: [ScheduleItemSchema],
      default: [],
    },
    // AI's reasoning summary (shown to user as "Gemini's Log")
    aiReasoning: {
      type: String,
      default: '',
    },
    // Snapshot of context sent to AI (for debugging/transparency)
    contextSnapshot: {
      unfinishedTaskCount: Number,
      classCount: Number,
      pendingHabits: [String],
      nextSkillTopic: String,
    },
    // AI model used for generation
    generatedBy: {
      type: String,
      default: 'gemini-1.5-flash',
    },
    // Status of this plan
    status: {
      type: String,
      enum: ['generating', 'ready', 'failed', 'manually_edited'],
      default: 'generating',
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
    // Bounty earned by completing items in this plan
    bountyEarned: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// One plan per user per day
DayPlanSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DayPlan', DayPlanSchema);
