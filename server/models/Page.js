/**
 * Page.js — Top-level workspace page (like a Notion page).
 * A Page is the root container for a tree of Blocks.
 */
const mongoose = require('mongoose');

const PageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Untitled Sea Chart',
      trim: true,
      maxlength: [200, 'Page title cannot exceed 200 characters'],
    },
    icon: {
      type: String,
      default: '🗺️', // Emoji icon shown in sidebar
    },
    coverImage: {
      type: String,
      default: null,
    },
    // Pages can be nested too (sub-pages in sidebar)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Page',
      default: null,
    },
    order: {
      type: Number,
      default: 1000,
    },
    // Whether this page appears in the sidebar
    isInSidebar: {
      type: Boolean,
      default: true,
    },
    // Quick tag system for the Grand Line roadmap view
    tags: {
      type: [String],
      default: [],
    },
    // Category: 'notes' | 'roadmap' | 'syllabus' | 'resource'
    category: {
      type: String,
      enum: ['notes', 'roadmap', 'syllabus', 'resource', 'journal'],
      default: 'notes',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

PageSchema.index({ user: 1, isInSidebar: 1, order: 1 });
PageSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Page', PageSchema);
