/**
 * BlockEditor.jsx — TipTap-powered rich-text editor for a single block.
 * Handles: text, heading1/2/3, checkbox, bullet, numbered, code, quote.
 * Supports slash commands and keyboard shortcuts.
 */
import React, { useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';

const TYPE_TO_TIPTAP = {
  text:     { type: 'paragraph' },
  heading1: { type: 'heading', attrs: { level: 1 } },
  heading2: { type: 'heading', attrs: { level: 2 } },
  heading3: { type: 'heading', attrs: { level: 3 } },
  bullet:   { type: 'bulletList' },
  numbered: { type: 'orderedList' },
  code:     { type: 'codeBlock' },
  quote:    { type: 'blockquote' },
};

/**
 * Parse stored content string back to TipTap JSON.
 * Falls back to plain-text paragraph if not valid JSON.
 */
function parseContent(content, type) {
  if (!content) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    };
  }

  try {
    const parsed = JSON.parse(content);
    if (parsed.type === 'doc') return parsed;
  } catch (_) {}

  // Plain text fallback — wrap in appropriate node
  const nodeType = TYPE_TO_TIPTAP[type]?.type || 'paragraph';
  return {
    type: 'doc',
    content: [{
      type: nodeType,
      ...(TYPE_TO_TIPTAP[type]?.attrs ? { attrs: TYPE_TO_TIPTAP[type].attrs } : {}),
      content: content ? [{ type: 'text', text: content }] : [],
    }],
  };
}

export default function BlockEditor({
  block,
  onUpdate,      // (content: string, textContent: string) => void
  onEnter,       // () => void — create new block on Enter
  onDelete,      // () => void — delete empty block on Backspace
  onFocus,       // () => void
  autoFocus = false,
  placeholder = "Start typing... Use '/' for commands",
}) {
  const isComposing = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {},
        orderedList: {},
        codeBlock: {},
        blockquote: {},
      }),
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
    ],
    content: parseContent(block.content, block.type),
    autofocus: autoFocus ? 'end' : false,

    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      const text = editor.getText();
      onUpdate?.(json, text);
    },

    onFocus: () => onFocus?.(),

    // Custom keyboard shortcuts
    editorProps: {
      handleKeyDown: (view, event) => {
        if (isComposing.current) return false;

        // Enter: create new block (unless Shift+Enter for line break)
        if (event.key === 'Enter' && !event.shiftKey) {
          const { empty } = view.state.selection;
          const isAtEnd = view.state.selection.$head.pos === view.state.doc.content.size - 1;
          if (empty && isAtEnd) {
            event.preventDefault();
            onEnter?.();
            return true;
          }
        }

        // Backspace on empty block: delete it
        if (event.key === 'Backspace') {
          const text = view.state.doc.textContent;
          if (text.length === 0) {
            event.preventDefault();
            onDelete?.();
            return true;
          }
        }

        return false;
      },
      handleCompositionStart: () => { isComposing.current = true; },
      handleCompositionEnd: () => { isComposing.current = false; },
    },
  }, [block._id]); // Re-init editor when block changes

  return (
    <EditorContent
      editor={editor}
      className="tiptap-editor"
      style={{ outline: 'none', width: '100%' }}
    />
  );
}
