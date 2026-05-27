/**
 * block.controller.js — Full CRUD for the Block engine.
 *
 * Key design decisions:
 * - We fetch ALL blocks for a page as a FLAT array and reconstruct
 *   the tree CLIENT-SIDE. This avoids recursive populate() chains.
 * - Fractional indexing for ordering: new block order = (prev + next) / 2
 * - Soft delete: blocks are marked isDeleted=true, children cascade
 */
const Block = require('../models/Block');
const Page = require('../models/Page');
const User = require('../models/User');

// ── GET /api/pages/:pageId/blocks ─────────────────────────────────────────────
// Returns a flat list of ALL blocks for a page. Client builds the tree.
exports.getPageBlocks = async (req, res, next) => {
  try {
    const { pageId } = req.params;

    // Verify page ownership
    const page = await Page.findOne({ _id: pageId, user: req.user._id, isDeleted: false });
    if (!page) {
      return res.status(404).json({ success: false, message: 'Sea Chart not found.' });
    }

    // Fetch all non-deleted blocks for this page, sorted for tree reconstruction
    const blocks = await Block.find({
      page: pageId,
      user: req.user._id,
      isDeleted: false,
    })
      .sort({ parent: 1, order: 1 })
      .lean(); // Use .lean() for plain JS objects (faster, no Mongoose overhead)

    res.status(200).json({ success: true, count: blocks.length, blocks });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/blocks ──────────────────────────────────────────────────────────
// Creates a new block. Handles fractional order calculation.
exports.createBlock = async (req, res, next) => {
  try {
    // _tempId is sent from client so we can echo it back for Redux matching
    const { pageId, parentId = null, type = 'text', content = '', afterBlockId, metadata, _tempId } = req.body;

    // Verify page ownership
    const page = await Page.findOne({ _id: pageId, user: req.user._id, isDeleted: false });
    if (!page) {
      return res.status(404).json({ success: false, message: 'Sea Chart not found.' });
    }

    // Calculate order using fractional indexing
    let order = 1000;
    if (afterBlockId) {
      // Find the block we're inserting after
      const afterBlock = await Block.findOne({
        _id: afterBlockId,
        page: pageId,
        isDeleted: false,
      });
      if (afterBlock) {
        // Find the next sibling
        const nextBlock = await Block.findOne({
          page: pageId,
          parent: afterBlock.parent,
          order: { $gt: afterBlock.order },
          isDeleted: false,
        })
          .sort({ order: 1 })
          .lean();

        if (nextBlock) {
          // Place between afterBlock and nextBlock
          order = (afterBlock.order + nextBlock.order) / 2;
        } else {
          // Place after the last block
          order = afterBlock.order + 1000;
        }
      }
    } else {
      // Append to end of siblings
      const lastSibling = await Block.findOne({
        page: pageId,
        parent: parentId,
        isDeleted: false,
      })
        .sort({ order: -1 })
        .lean();
      order = lastSibling ? lastSibling.order + 1000 : 1000;
    }

    const block = await Block.create({
      user: req.user._id,
      page: pageId,
      parent: parentId,
      type,
      content,
      textContent: content, // store plain text on creation too
      order,
      metadata: metadata || {},
    });

    // Echo _tempId back so the Redux reducer can replace the optimistic placeholder
    const responseBlock = block.toObject ? block.toObject() : { ...block._doc };
    if (_tempId) responseBlock._tempId = _tempId;

    res.status(201).json({ success: true, block: responseBlock });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/blocks/:id ─────────────────────────────────────────────────────
// Update block content, checked state, type, or metadata.
exports.updateBlock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, textContent, checked, type, metadata } = req.body;

    const block = await Block.findOne({ _id: id, user: req.user._id, isDeleted: false });
    if (!block) {
      return res.status(404).json({ success: false, message: 'Block not found.' });
    }

    // Only update provided fields
    if (content !== undefined) block.content = content;
    if (textContent !== undefined) block.textContent = textContent;
    if (checked !== undefined) {
      block.checked = checked;
      block.checkedAt = checked ? new Date() : null;

      // Award bounty for checking off a task
      if (checked) {
        await User.findByIdAndUpdate(req.user._id, { $inc: { bountyPoints: 5 } });
      }
    }
    if (type !== undefined) block.type = type;
    if (metadata !== undefined) block.metadata = { ...block.metadata, ...metadata };

    await block.save();
    res.status(200).json({ success: true, block });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/blocks/:id/move ────────────────────────────────────────────────
// Reorder or reparent a block (drag-and-drop).
exports.moveBlock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newParentId = null, newOrder } = req.body;

    const block = await Block.findOne({ _id: id, user: req.user._id, isDeleted: false });
    if (!block) {
      return res.status(404).json({ success: false, message: 'Block not found.' });
    }

    block.parent = newParentId;
    if (newOrder !== undefined) block.order = newOrder;

    await block.save();
    res.status(200).json({ success: true, block });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/blocks/:id ────────────────────────────────────────────────────
// Soft-delete a block and ALL its descendants recursively.
exports.deleteBlock = async (req, res, next) => {
  try {
    const { id } = req.params;

    const block = await Block.findOne({ _id: id, user: req.user._id, isDeleted: false });
    if (!block) {
      return res.status(404).json({ success: false, message: 'Block not found.' });
    }

    // Recursive soft-delete helper
    const softDeleteRecursive = async (blockId) => {
      const now = new Date();
      // Delete this block
      await Block.updateOne({ _id: blockId }, { isDeleted: true, deletedAt: now });
      // Find and delete all direct children
      const children = await Block.find({ parent: blockId, isDeleted: false }).select('_id').lean();
      for (const child of children) {
        await softDeleteRecursive(child._id);
      }
    };

    await softDeleteRecursive(id);

    res.status(200).json({ success: true, message: 'Block and its descendants deleted.' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/blocks/batch ────────────────────────────────────────────────────
// Batch create blocks (used by PDF pipeline).
exports.batchCreateBlocks = async (req, res, next) => {
  try {
    const { pageId, blocks: blockDefs } = req.body;

    // Verify page ownership
    const page = await Page.findOne({ _id: pageId, user: req.user._id, isDeleted: false });
    if (!page) {
      return res.status(404).json({ success: false, message: 'Sea Chart not found.' });
    }

    if (!Array.isArray(blockDefs) || blockDefs.length === 0) {
      return res.status(400).json({ success: false, message: 'No blocks provided.' });
    }

    // Insert all blocks, resolving parent references (IDs may be temp client IDs)
    // blockDefs: [{ tempId, parentTempId, type, content, order, metadata }]
    // We create a tempId-to-realId map
    const tempToReal = {};
    const createdBlocks = [];

    for (const def of blockDefs) {
      const realParentId = def.parentTempId ? tempToReal[def.parentTempId] : null;
      const block = await Block.create({
        user: req.user._id,
        page: pageId,
        parent: realParentId,
        type: def.type || 'checkbox',
        content: def.content || '',
        textContent: def.textContent || def.content || '',
        order: def.order || 1000,
        metadata: def.metadata || {},
      });
      if (def.tempId) tempToReal[def.tempId] = block._id;
      createdBlocks.push(block);
    }

    res.status(201).json({ success: true, count: createdBlocks.length, blocks: createdBlocks });
  } catch (err) {
    next(err);
  }
};
