/**
 * page.controller.js — Workspace pages (Notion-style sea charts).
 */
const Page = require('../models/Page');
const Block = require('../models/Block');

// ── GET /api/pages ────────────────────────────────────────────────────────────
exports.getPages = async (req, res, next) => {
  try {
    const pages = await Page.find({
      user: req.user._id,
      isDeleted: false,
    })
      .sort({ order: 1 })
      .lean();

    res.status(200).json({ success: true, count: pages.length, pages });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/pages/:id ────────────────────────────────────────────────────────
exports.getPage = async (req, res, next) => {
  try {
    const page = await Page.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: false,
    }).lean();

    if (!page) return res.status(404).json({ success: false, message: 'Sea Chart not found.' });

    res.status(200).json({ success: true, page });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/pages ───────────────────────────────────────────────────────────
exports.createPage = async (req, res, next) => {
  try {
    const { title, icon, category, parentId, tags } = req.body;

    // Calculate order
    const lastPage = await Page.findOne({ user: req.user._id, isDeleted: false })
      .sort({ order: -1 })
      .lean();
    const order = lastPage ? lastPage.order + 1000 : 1000;

    const page = await Page.create({
      user: req.user._id,
      title: title || 'Untitled Sea Chart',
      icon: icon || '🗺️',
      category: category || 'notes',
      parent: parentId || null,
      tags: tags || [],
      order,
    });

    res.status(201).json({ success: true, page });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/pages/:id ──────────────────────────────────────────────────────
exports.updatePage = async (req, res, next) => {
  try {
    const { title, icon, category, tags, coverImage, isInSidebar } = req.body;

    const page = await Page.findOne({ _id: req.params.id, user: req.user._id, isDeleted: false });
    if (!page) return res.status(404).json({ success: false, message: 'Sea Chart not found.' });

    if (title !== undefined) page.title = title;
    if (icon !== undefined) page.icon = icon;
    if (category !== undefined) page.category = category;
    if (tags !== undefined) page.tags = tags;
    if (coverImage !== undefined) page.coverImage = coverImage;
    if (isInSidebar !== undefined) page.isInSidebar = isInSidebar;

    await page.save();
    res.status(200).json({ success: true, page });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/pages/:id ─────────────────────────────────────────────────────
exports.deletePage = async (req, res, next) => {
  try {
    const page = await Page.findOne({ _id: req.params.id, user: req.user._id, isDeleted: false });
    if (!page) return res.status(404).json({ success: false, message: 'Sea Chart not found.' });

    // Soft delete page and all its blocks
    page.isDeleted = true;
    await page.save();

    await Block.updateMany(
      { page: page._id, user: req.user._id },
      { isDeleted: true, deletedAt: new Date() }
    );

    res.status(200).json({ success: true, message: 'Sea Chart cast to the depths.' });
  } catch (err) {
    next(err);
  }
};
