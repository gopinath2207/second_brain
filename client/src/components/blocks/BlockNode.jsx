/**
 * BlockNode.jsx — Recursive block renderer.
 * Each block renders itself + its children recursively.
 *
 * Design: Notion-dense layout.
 * - Blocks show compact read-only text by default
 * - Click to enter edit mode (TipTap activates only on demand)
 * - Heading blocks: compact sizes, tight margins
 * - Checkbox blocks: single-line row, no min-height
 */
import React, { useState, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  optimisticUpdateBlock, optimisticAddBlock, optimisticRemoveBlock,
  updateBlockAsync, createBlockAsync, deleteBlockAsync,
} from '../../store/blockSlice';
import BlockEditor from './BlockEditor';
import { GripVertical, Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';

// ── Compact type styles (Notion-density) ──────────────────────────────────────
const TYPE_STYLES = {
  heading1: {
    fontSize: '1.35rem', fontWeight: 800,
    fontFamily: 'var(--font-display)', color: 'var(--text-primary)',
    lineHeight: 1.3, padding: '10px 0 4px',
  },
  heading2: {
    fontSize: '1.05rem', fontWeight: 700,
    fontFamily: 'var(--font-display)', color: 'var(--text-primary)',
    lineHeight: 1.3, padding: '6px 0 2px',
  },
  heading3: {
    fontSize: '0.95rem', fontWeight: 600,
    fontFamily: 'var(--font-display)', color: 'var(--text-secondary)',
    lineHeight: 1.3, padding: '4px 0 1px',
  },
  text: {
    fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6,
  },
  bullet: {
    fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6,
  },
  numbered: {
    fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6,
  },
  code: {
    fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
    background: 'var(--bg-void)', padding: '10px 14px',
    borderRadius: 6, border: '1px solid var(--border-subtle)',
  },
  quote: {
    borderLeft: '3px solid var(--zoro-500)', paddingLeft: 10,
    color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem',
  },
  callout: {
    background: 'rgba(0,255,157,0.05)', border: '1px solid rgba(0,255,157,0.15)',
    borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem',
  },
};

// ── Extract plain text from a block for compact display ───────────────────────
function getDisplayText(block) {
  if (!block.textContent && !block.content) return '';
  if (block.textContent) return block.textContent;
  // Try to parse JSON content
  try {
    const parsed = JSON.parse(block.content);
    const extractText = (node) => {
      if (node.text) return node.text;
      if (node.content) return node.content.map(extractText).join('');
      return '';
    };
    return extractText(parsed);
  } catch (_) {
    return block.content || '';
  }
}

// ── Checkbox Block ─────────────────────────────────────────────────────────────
function CheckboxBlock({ block, pageId, depth, onAddTask }) {
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const saveTimeout = useRef(null);
  const hasChildren = block.children?.length > 0;
  const [collapsed, setCollapsed] = useState(false);

  const displayText = getDisplayText(block);

  const handleCheckboxToggle = (e) => {
    e.stopPropagation();
    const newChecked = !block.checked;
    dispatch(optimisticUpdateBlock({ pageId, blockId: block._id, updates: { checked: newChecked } }));
    dispatch(updateBlockAsync({ id: block._id, updates: { checked: newChecked } }));
  };

  const handleContentUpdate = useCallback((content, textContent) => {
    dispatch(optimisticUpdateBlock({ pageId, blockId: block._id, updates: { content, textContent } }));
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      dispatch(updateBlockAsync({ id: block._id, updates: { content, textContent } }));
    }, 800);
  }, [dispatch, pageId, block._id]);

  const handleEnter = () => {
    const tempId = `temp-${Date.now()}`;
    const newBlock = {
      _id: tempId, _tempId: tempId,
      page: pageId, parent: block.parent,
      type: 'checkbox', content: '',
      order: block.order + 500, children: [], checked: false,
    };
    dispatch(optimisticAddBlock({ pageId, block: newBlock }));
    dispatch(createBlockAsync({ pageId, parentId: block.parent || null, type: 'checkbox', afterBlockId: block._id, _tempId: tempId }));
    setEditing(false);
  };

  const handleDelete = () => {
    dispatch(optimisticRemoveBlock({ pageId, blockId: block._id }));
    dispatch(deleteBlockAsync(block._id));
  };

  return (
    <div style={{ marginLeft: depth * 18 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '1px 0', minHeight: 26 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Collapse toggle */}
        {hasChildren && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, flexShrink: 0, display: 'flex' }}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
        )}

        {/* Checkbox */}
        <button
          onClick={handleCheckboxToggle}
          style={{
            width: 16, height: 16, minWidth: 16,
            border: `2px solid ${block.checked ? 'var(--zoro-500)' : 'var(--border-strong)'}`,
            borderRadius: 3, cursor: 'pointer', flexShrink: 0,
            background: block.checked ? 'var(--zoro-500)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
            boxShadow: block.checked ? 'var(--zoro-glow-sm)' : 'none',
          }}
        >
          {block.checked && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3 5.5L8 1" stroke="#0d1117" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* Content — compact display or editor */}
        <div
          style={{
            flex: 1, minWidth: 0, fontSize: '0.875rem',
            color: block.checked ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: block.checked ? 'line-through' : 'none',
            cursor: 'text', lineHeight: 1.5,
          }}
          onClick={() => setEditing(true)}
          onBlur={() => setEditing(false)}
        >
          {editing ? (
            <BlockEditor
              block={block}
              onUpdate={handleContentUpdate}
              onEnter={handleEnter}
              onDelete={handleDelete}
              autoFocus
              placeholder="Todo item..."
            />
          ) : (
            <span style={{ display: 'block', padding: '1px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {displayText || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>Empty</span>}
            </span>
          )}
        </div>

        {/* Delete button on hover */}
        {hovered && !editing && (
          <button
            onClick={handleDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', flexShrink: 0, display: 'flex', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--buster-500)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Children */}
      {!collapsed && hasChildren && (
        <div style={{ marginLeft: 22 }}>
          {block.children.map(child => (
            <BlockNode key={child._id} block={child} pageId={pageId} depth={depth + 1} onAddTask={onAddTask} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Default Block (headings, text, bullet, code…) ─────────────────────────────
export default function BlockNode({ block, pageId, depth = 0, onFocusNext, onAddTask, onAddSection }) {
  const dispatch = useDispatch();
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const saveTimeout = useRef(null);

  const hasChildren = block.children?.length > 0;
  const displayText = getDisplayText(block);

  const handleContentUpdate = useCallback((content, textContent) => {
    dispatch(optimisticUpdateBlock({ pageId, blockId: block._id, updates: { content, textContent } }));
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      dispatch(updateBlockAsync({ id: block._id, updates: { content, textContent } }));
    }, 800);
  }, [dispatch, pageId, block._id]);

  const handleEnter = () => {
    const tempId = `temp-${Date.now()}`;
    const newBlock = {
      _id: tempId, _tempId: tempId,
      page: pageId, parent: block.parent,
      type: 'text', content: '',
      order: block.order + 500, children: [], checked: false,
    };
    dispatch(optimisticAddBlock({ pageId, block: newBlock }));
    dispatch(createBlockAsync({ pageId, parentId: block.parent || null, type: 'text', afterBlockId: block._id, _tempId: tempId }));
    setEditing(false);
  };

  const handleDelete = () => {
    dispatch(optimisticRemoveBlock({ pageId, blockId: block._id }));
    dispatch(deleteBlockAsync(block._id));
  };

  // ── Checkbox type ────────────────────────────────────────────────────────────
  if (block.type === 'checkbox') {
    return <CheckboxBlock block={block} pageId={pageId} depth={depth} onAddTask={onAddTask} />;
  }

  // ── Divider ──────────────────────────────────────────────────────────────────
  if (block.type === 'divider') {
    return <div className="divider" style={{ margin: '8px 0', marginLeft: depth * 18 }} />;
  }

  const typeStyle = TYPE_STYLES[block.type] || TYPE_STYLES.text;
  const isHeading = block.type?.startsWith('heading');

  return (
    <div
      style={{ marginLeft: depth * 18, marginBottom: isHeading ? 0 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
        {/* Collapse toggle for blocks with children */}
        {hasChildren && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '2px 0', flexShrink: 0, marginTop: 4,
            }}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
        )}

        {/* Content area */}
        <div
          style={{ flex: 1, minWidth: 0, ...typeStyle, cursor: 'text' }}
          onClick={() => setEditing(true)}
          onBlur={() => setEditing(false)}
        >
          {editing ? (
            <BlockEditor
              block={block}
              onUpdate={handleContentUpdate}
              onEnter={handleEnter}
              onDelete={handleDelete}
              autoFocus
              placeholder={
                block.type === 'heading1' ? 'Heading 1' :
                block.type === 'heading2' ? 'Heading 2' :
                block.type === 'heading3' ? 'Heading 3' :
                block.type === 'code'     ? 'Code...' :
                block.type === 'quote'    ? 'Quote...' :
                "Write something..."
              }
            />
          ) : (
            <span style={{ display: 'block', padding: '1px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {displayText || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                {isHeading ? 'Untitled section' : 'Empty block — click to edit'}
              </span>}
            </span>
          )}
        </div>

        {/* Action buttons on hover */}
        {hovered && !editing && (
          <button
            onClick={handleDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '3px', flexShrink: 0, display: 'flex', borderRadius: 4, marginTop: 2 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--buster-500)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* ── Inline "+ Add task" button for heading blocks ────────────────────────── */}
      {isHeading && onAddTask && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginLeft: depth * 18 + 4, marginTop: 2, marginBottom: 4,
          }}
        >
          <button
            onClick={() => onAddTask('', block._id)}
            className="sea-chart-add-task-btn"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 4,
              background: 'none', border: '1px dashed transparent',
              cursor: 'pointer', fontSize: '0.72rem',
              color: 'var(--text-muted)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--zoro-500)';
              e.currentTarget.style.color = 'var(--zoro-500)';
              e.currentTarget.style.background = 'rgba(0,255,157,0.04)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'none';
            }}
          >
            <Plus size={11} /> Add task under this section
          </button>
        </div>
      )}

      {/* Children */}
      {!collapsed && hasChildren && (
        <div style={{ marginLeft: isHeading ? 0 : 8 }}>
          {block.children.map(child => (
            <BlockNode key={child._id} block={child} pageId={pageId} depth={depth + 1} onAddTask={onAddTask} onAddSection={onAddSection} />
          ))}
        </div>
      )}
    </div>
  );
}
