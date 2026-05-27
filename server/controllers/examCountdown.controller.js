/**
 * examCountdown.controller.js — Buster Call countdown management.
 */
const ExamCountdown = require('../models/ExamCountdown');

exports.getExams = async (req, res, next) => {
  try {
    const exams = await ExamCountdown.find({
      user: req.user._id,
      isCompleted: false,
    })
      .sort({ examDate: 1 })
      .populate('syllabusPage', 'title icon')
      .lean();

    // Compute days remaining for each exam
    const now = new Date();
    const examsWithCountdown = exams.map((exam) => {
      const msRemaining = new Date(exam.examDate) - now;
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      const urgency =
        daysRemaining <= 2 ? 'critical' :
        daysRemaining <= 7 ? 'high' :
        daysRemaining <= 14 ? 'medium' : 'low';
      return { ...exam, daysRemaining, urgency };
    });

    res.status(200).json({ success: true, count: exams.length, exams: examsWithCountdown });
  } catch (err) {
    next(err);
  }
};

exports.createExam = async (req, res, next) => {
  try {
    const { title, subject, examDate, alertThresholdDays, syllabusPage, notes } = req.body;

    const exam = await ExamCountdown.create({
      user: req.user._id,
      title,
      subject,
      examDate: new Date(examDate),
      alertThresholdDays: alertThresholdDays || 7,
      syllabusPage: syllabusPage || null,
      notes,
    });

    res.status(201).json({ success: true, exam });
  } catch (err) {
    next(err);
  }
};

exports.updateExam = async (req, res, next) => {
  try {
    const exam = await ExamCountdown.findOne({ _id: req.params.id, user: req.user._id });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

    Object.assign(exam, req.body);
    await exam.save();
    res.status(200).json({ success: true, exam });
  } catch (err) {
    next(err);
  }
};

exports.deleteExam = async (req, res, next) => {
  try {
    await ExamCountdown.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.status(200).json({ success: true, message: 'Buster Call dismissed.' });
  } catch (err) {
    next(err);
  }
};
