/**
 * timetable.controller.js — Log Pose timetable management.
 */
const TimetableEntry = require('../models/TimetableEntry');

// ── GET /api/timetable/today ───────────────────────────────────────────────────
// Returns classes scheduled for today (by day of week or specific date).
exports.getTodayClasses = async (req, res, next) => {
  try {
    const now = new Date();
    const todayDayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...

    // Start and end of today (UTC)
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const entries = await TimetableEntry.find({
      user: req.user._id,
      isActive: true,
      $or: [
        // Recurring entries that include today's day
        { isRecurring: true, daysOfWeek: todayDayOfWeek },
        // One-time events today
        { isRecurring: false, specificDate: { $gte: startOfDay, $lte: endOfDay } },
      ],
    })
      .sort({ startTime: 1 })
      .lean();

    res.status(200).json({ success: true, count: entries.length, entries });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/timetable ────────────────────────────────────────────────────────
exports.getAllEntries = async (req, res, next) => {
  try {
    const entries = await TimetableEntry.find({
      user: req.user._id,
      isActive: true,
    })
      .sort({ startTime: 1 })
      .lean();

    res.status(200).json({ success: true, count: entries.length, entries });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/timetable ───────────────────────────────────────────────────────
exports.createEntry = async (req, res, next) => {
  try {
    const {
      title, subject, location, color,
      startTime, endTime,
      isRecurring, daysOfWeek, specificDate,
      professor, isOnline, meetLink, notes,
    } = req.body;

    const entry = await TimetableEntry.create({
      user: req.user._id,
      title,
      subject,
      location,
      color,
      startTime,
      endTime,
      isRecurring: isRecurring !== undefined ? isRecurring : true,
      daysOfWeek: daysOfWeek || [],
      specificDate: specificDate || null,
      professor,
      isOnline,
      meetLink,
      notes,
    });

    res.status(201).json({ success: true, entry });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/timetable/:id ──────────────────────────────────────────────────
exports.updateEntry = async (req, res, next) => {
  try {
    const entry = await TimetableEntry.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!entry) return res.status(404).json({ success: false, message: 'Timetable entry not found.' });

    Object.assign(entry, req.body);
    await entry.save();

    res.status(200).json({ success: true, entry });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/timetable/:id ─────────────────────────────────────────────────
exports.deleteEntry = async (req, res, next) => {
  try {
    const entry = await TimetableEntry.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isActive: false }
    );
    if (!entry) return res.status(404).json({ success: false, message: 'Not found.' });

    res.status(200).json({ success: true, message: 'Timetable entry removed.' });
  } catch (err) {
    next(err);
  }
};
