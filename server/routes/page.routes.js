const express = require('express');
const router = express.Router();
const {
  getPages, getPage, createPage, updatePage, deletePage
} = require('../controllers/page.controller');
const {
  getPageBlocks
} = require('../controllers/block.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', getPages);
router.post('/', createPage);
router.get('/:id', getPage);
router.patch('/:id', updatePage);
router.delete('/:id', deletePage);

// Blocks nested under pages
router.get('/:pageId/blocks', getPageBlocks);

module.exports = router;
