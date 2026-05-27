/**
 * planner.controller.js — AI-powered day plan management.
 */
const DayPlan = require('../models/DayPlan');
const { generateDayPlan } = require('../cron/dailyPlanner.cron');

// ── GET /api/planner/today ─────────────────────────────────────────────────────
exports.getTodayPlan = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const plan = await DayPlan.findOne({
      user: req.user._id,
      date: today,
    }).lean();

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'No Grand Line plan exists for today yet.',
      });
    }

    res.status(200).json({ success: true, plan });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/planner/:date ────────────────────────────────────────────────────
exports.getPlanByDate = async (req, res, next) => {
  try {
    const date = new Date(req.params.date);
    if (isNaN(date)) {
      return res.status(400).json({ success: false, message: 'Invalid date.' });
    }
    date.setHours(0, 0, 0, 0);

    const plan = await DayPlan.findOne({ user: req.user._id, date }).lean();
    if (!plan) {
      return res.status(404).json({ success: false, message: 'No plan for that date.' });
    }

    res.status(200).json({ success: true, plan });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/planner/generate ────────────────────────────────────────────────
// Manually trigger AI plan generation (for testing or user request).
exports.generatePlan = async (req, res, next) => {
  try {
    const plan = await generateDayPlan(req.user._id.toString());
    res.status(200).json({ success: true, plan });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/planner/:planId/item/:itemId ────────────────────────────────────
// Toggle a schedule item as completed / uncompleted.
exports.completeScheduleItem = async (req, res, next) => {
  try {
    const { planId, itemId } = req.params;

    const plan = await DayPlan.findOne({ _id: planId, user: req.user._id });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found.' });

    const item = plan.schedule.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Schedule item not found.' });

    // Toggle: completed → uncompleted, uncompleted → completed
    item.isCompleted = !item.isCompleted;
    item.completedAt = item.isCompleted ? new Date() : null;
    plan.status = 'manually_edited';

    await plan.save();
    res.status(200).json({ success: true, plan });
  } catch (err) {
    next(err);
  }
};
