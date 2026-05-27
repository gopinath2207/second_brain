const express = require('express');
const router = express.Router();
const {
  getHabits, createHabit, logHabit, unlogHabit,
  getAnalytics, updateHabit, deleteHabit
} = require('../controllers/habit.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/analytics', getAnalytics);
router.get('/', getHabits);
router.post('/', createHabit);
router.patch('/:id', updateHabit);
router.delete('/:id', deleteHabit);
router.post('/:id/log', logHabit);
router.delete('/:id/log/today', unlogHabit);

module.exports = router;
