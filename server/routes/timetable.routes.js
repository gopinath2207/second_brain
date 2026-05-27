const express = require('express');
const router = express.Router();
const {
  getTodayClasses, getAllEntries, createEntry, updateEntry, deleteEntry
} = require('../controllers/timetable.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/today', getTodayClasses);
router.get('/', getAllEntries);
router.post('/', createEntry);
router.patch('/:id', updateEntry);
router.delete('/:id', deleteEntry);

module.exports = router;
