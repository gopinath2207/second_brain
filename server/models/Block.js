/**
 * Block.js — Core block schema with infinite recursive nesting.
 *
 * Design decisions:
 * - Self-referential parent field (null = root block of a Page)
 * - `order` uses fractional indexing (1000, 2000, 3000...) so reordering
 *   only requires one document update (change the fraction between neighbors)
 * - `content` stores TipTap's JSON output as a string for flexibility
 * - Compound index on {page, parent, order} is critical for tree queries
 */
const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema(
  {
    // ── Ownership & Hierarchy ─────────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    page: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Page',
      required: true,
    },
    // Parent block (null means this is a top-level block in the page)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Block',
      default: null,
    },

    // ── Block Type ────────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: [
        'text',         // Plain paragraph
        'heading1',     // H1
        'heading2',     // H2
        'heading3',     // H3
        'checkbox',     // Checkable todo item
        'bullet',       // Unordered list item
        'numbered',     // Ordered list item
        'code',         // Code block with language
        'divider',      // Horizontal rule
        'image',        // Image embed
        'callout',      // Highlighted callout box
        'quote',        // Block quote
        'habit_ref',    // Reference to a habit (special block)
        'exam_countdown', // Buster Call countdown block
      ],
      default: 'text',
      required: true,
    },

    // ── Content ───────────────────────────────────────────────────────────────
    // TipTap stores its state as a JSON object — we serialize it as a string
    // for flexible querying. Plain text extraction is done on the client.
    content: {
      type: String, // Serialized TipTap JSON or plain text
      default: '',
    },
    // For plain-text search indexing (extracted from TipTap content)
    textContent: {
      type: String,
      default: '',
    },

    // ── Checkbox state ────────────────────────────────────────────────────────
    checked: {
      type: Boolean,
      default: false,
    },
    checkedAt: {
      type: Date,
      default: null,
    },

    // ── Ordering ──────────────────────────────────────────────────────────────
    // Fractional indexing: new blocks get (prev + next) / 2
    // Initial spacing: 1000 between blocks to allow many insertions
    order: {
      type: Number,
      default: 1000,
      required: true,
    },

    // ── Type-specific metadata ────────────────────────────────────────────────
    metadata: {
      // code block language
      language: String,
      // image block
      imageUrl: String,
      imageAlt: String,
      // callout icon
      icon: String,
      // exam_countdown block
      examDate: Date,
      examTitle: String,
      examSubject: String,
      // habit_ref block
      habitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit' },
      // styling
      color: String,
      backgroundColor: String,
    },

    // ── Soft delete ───────────────────────────────────────────────────────────
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    // Store as flat documents; the tree is reconstructed client-side
    // This avoids recursive populate() chains that hammer M0 Atlas
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Primary tree query: fetch all blocks for a page, grouped by parent, ordered
BlockSchema.index({ page: 1, parent: 1, order: 1 });
// User's blocks (for global search)
BlockSchema.index({ user: 1, type: 1 });
// Soft-delete filter
BlockSchema.index({ isDeleted: 1 });
// Full-text search on extracted text
BlockSchema.index({ textContent: 'text' });

// ── Virtual: has children (computed, not stored) ──────────────────────────────
// Used client-side only after fetching the flat block list

module.exports = mongoose.model('Block', BlockSchema);
