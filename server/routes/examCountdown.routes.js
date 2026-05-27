const express = require('express');
const router = express.Router();
const {
  getExams, createExam, updateExam, deleteExam
} = require('../controllers/examCountdown.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', getExams);
router.post('/', createExam);
router.patch('/:id', updateExam);
router.delete('/:id', deleteExam);

module.exports = router;
