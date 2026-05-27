const express = require('express');
const router = express.Router();
const {
  createBlock, updateBlock, moveBlock, deleteBlock, batchCreateBlocks
} = require('../controllers/block.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/', createBlock);
router.post('/batch', batchCreateBlocks);
router.patch('/:id', updateBlock);
router.patch('/:id/move', moveBlock);
router.delete('/:id', deleteBlock);

module.exports = router;
