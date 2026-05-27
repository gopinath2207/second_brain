/**
 * upload.controller.js — PDF upload and processing pipeline.
 */
const { processPdf } = require('../services/pdfExtract.service');
const Page = require('../models/Page');
const Block = require('../models/Block');

// ── POST /api/upload/pdf ──────────────────────────────────────────────────────
exports.uploadPdf = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
    }

    const { pageId, context = '' } = req.body;

    // Verify page ownership if provided
    if (pageId) {
      const page = await Page.findOne({ _id: pageId, user: req.user._id, isDeleted: false });
      if (!page) {
        return res.status(404).json({ success: false, message: 'Target Sea Chart not found.' });
      }
    }

    // Process PDF (usedAI=false means AI was unavailable, used text fallback)
    const { blocks: blockDefs, rawTextLength, usedAI } = await processPdf(req.file.buffer, context);

    const aiNote = usedAI
      ? ''
      : ' (AI unavailable — used text extraction. Add GROQ_API_KEY for AI-structured roadmaps.)';

    // If a pageId was provided, save blocks directly
    if (pageId) {
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
        });
        if (def.tempId) tempToReal[def.tempId] = block._id;
        createdBlocks.push(block);
      }

      return res.status(200).json({
        success: true,
        message: `Extracted ${blockDefs.length} blocks from PDF (${rawTextLength} chars).${aiNote}`,
        blocksCreated: createdBlocks.length,
        blocks: createdBlocks,
        usedAI,
      });
    }

    // Otherwise just return the block definitions (client will choose page)
    res.status(200).json({
      success: true,
      message: `PDF processed: ${rawTextLength} characters extracted.${aiNote}`,
      blockDefs,
      usedAI,
    });
  } catch (err) {
    next(err);
  }
};
