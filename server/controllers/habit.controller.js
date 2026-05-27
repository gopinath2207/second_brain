/**
 * habit.controller.js — Haki Training habit CRUD + analytics.
 */
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const User = require('../models/User');

// ── GET /api/habits ───────────────────────────────────────────────────────────
exports.getHabits = async (req, res, next) => {
  try {
    const habits = await Habit.find({ user: req.user._id, isActive: true })
      .sort({ order: 1 })
      .lean();

    // Attach today's completion status to each habit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayLogs = await HabitLog.find({
      user: req.user._id,
      date: { $gte: todayStart, $lte: todayEnd },
    })
      .select('habit')
      .lean();

    const completedTodayIds = new Set(todayLogs.map((l) => l.habit.toString()));

    const habitsWithStatus = habits.map((h) => ({
      ...h,
      completedToday: completedTodayIds.has(h._id.toString()),
    }));

    res.status(200).json({ success: true, count: habits.length, habits: habitsWithStatus });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/habits ──────────────────────────────────────────────────────────
exports.createHabit = async (req, res, next) => {
  try {
    const { name, description, icon, color, bountyReward, frequency, targetDays } = req.body;

    const lastHabit = await Habit.findOne({ user: req.user._id }).sort({ order: -1 }).lean();
    const order = lastHabit ? lastHabit.order + 1000 : 1000;

    const habit = await Habit.create({
      user: req.user._id,
      name,
      description,
      icon: icon || '⚔️',
      color: color || '#00ff9d',
      bountyReward: bountyReward || 10,
      frequency: frequency || 'daily',
      targetDays: targetDays || [0, 1, 2, 3, 4, 5, 6],
      order,
    });

    res.status(201).json({ success: true, habit });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/habits/:id/log ──────────────────────────────────────────────────
exports.logHabit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note, quality = 1 } = req.body;

    const habit = await Habit.findOne({ _id: id, user: req.user._id, isActive: true });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found.' });

    // Normalize to today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already logged today
    const existing = await HabitLog.findOne({ user: req.user._id, habit: id, date: today });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This Haki training is already recorded for today.',
      });
    }

    // Create log
    const log = await HabitLog.create({
      user: req.user._id,
      habit: id,
      date: today,
      note,
      bountyEarned: habit.bountyReward * quality,
      quality,
    });

    // Update habit stats
    habit.totalCompletions += 1;
    // Update streak (simplified; full streak calc is done by analytics)
    await habit.save();

    // Award bounty to user
    const bountyEarned = habit.bountyReward * quality;
    await User.findByIdAndUpdate(req.user._id, { $inc: { bountyPoints: bountyEarned } });

    res.status(201).json({ success: true, log, bountyEarned });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/habits/:id/log/today ─────────────────────────────────────────
// Un-log a habit (undo accidental completion)
exports.unlogHabit = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const log = await HabitLog.findOneAndDelete({
      user: req.user._id,
      habit: req.params.id,
      date: today,
    });

    if (!log) return res.status(404).json({ success: false, message: 'No log found for today.' });

    // Reverse bounty
    await User.findByIdAndUpdate(req.user._id, { $inc: { bountyPoints: -log.bountyEarned } });

    res.status(200).json({
      success: true,
      message: 'Habit log removed.',
      bountyReturned: log.bountyEarned,  // Tell client how much was deducted
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/habits/analytics ────────────────────────────────────────────────
// Returns 30-day completion data + heatmap data for all habits.
exports.getAnalytics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const numDays = parseInt(days, 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);
    startDate.setHours(0, 0, 0, 0);

    // Aggregate: count completions per day in range
    const dailyCompletions = await HabitLog.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
          totalBounty: { $sum: '$bountyEarned' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Per-habit data for the line graph
    const habits = await Habit.find({ user: req.user._id, isActive: true }).lean();

    // Build the 30-day line graph data points
    const lineData = [];
    for (let i = numDays; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = dailyCompletions.find((dc) => dc._id === dateStr);
      lineData.push({
        date: dateStr,
        completions: found ? found.count : 0,
        bounty: found ? found.totalBounty : 0,
      });
    }

    // Calculate streaks per habit
    const streakData = {};
    for (const habit of habits) {
      const logs = await HabitLog.find({ habit: habit._id, date: { $gte: startDate } })
        .sort({ date: -1 })
        .lean();

      let streak = 0;
      let checkDate = new Date();
      checkDate.setHours(0, 0, 0, 0);

      for (const log of logs) {
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);
        if (logDate.getTime() === checkDate.getTime()) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else break;
      }
      streakData[habit._id] = streak;
    }

    // Total bounty in period
    const totalBounty = dailyCompletions.reduce((sum, d) => sum + d.totalBounty, 0);

    res.status(200).json({
      success: true,
      lineData,
      heatmapData: dailyCompletions,
      streakData,
      totalBountyInPeriod: totalBounty,
      habitsCount: habits.length,
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/habits/:id ────────────────────────────────────────────────────
exports.updateHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found.' });

    Object.assign(habit, req.body);
    await habit.save();
    res.status(200).json({ success: true, habit });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/habits/:id ────────────────────────────────────────────────────
exports.deleteHabit = async (req, res, next) => {
  try {
    await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isActive: false }
    );
    res.status(200).json({ success: true, message: 'Habit retired.' });
  } catch (err) {
    next(err);
  }
};
