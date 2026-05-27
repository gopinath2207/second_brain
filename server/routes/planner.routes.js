const express = require('express');
const router = express.Router();
const {
  getTodayPlan, getPlanByDate, generatePlan, completeScheduleItem
} = require('../controllers/planner.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/today', getTodayPlan);
router.post('/generate', generatePlan);
router.get('/:date', getPlanByDate);
router.patch('/:planId/item/:itemId', completeScheduleItem);

module.exports = router;
