/**
 * SortableBlockList.jsx — Drag-and-drop block reordering using @dnd-kit.
 *
 * Only handles TOP-LEVEL blocks in a page for now (depth = 0).
 * Touch-compatible via the TouchSensor and PointerSensor from @dnd-kit.
 * On drag end, fractional indices are recalculated and saved.
 */
import React, { useCallback } from 'react';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  KeyboardSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { useDispatch } from 'react-redux';
import { optimisticUpdateBlock, moveBlockAsync } from '../../store/blockSlice';
import BlockNode from './BlockNode';
import { GripVertical } from 'lucide-react';

// ── Drag handle component ─────────────────────────────────────────────────────
export function DragHandle({ listeners, attributes }) {
  return (
    <button
      {...listeners}
      {...attributes}
      style={{
        background: 'none', border: 'none', cursor: 'grab', padding: '4px 2px',
        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
        borderRadius: 4, touchAction: 'none', flexShrink: 0,
        outline: 'none',
      }}
      onMouseDown={e => e.currentTarget.style.cursor = 'grabbing'}
      onMouseUp={e => e.currentTarget.style.cursor = 'grab'}
      aria-label="Drag to reorder"
    >
      <GripVertical size={14} />
    </button>
  );
}

// ── Single sortable item wrapper ──────────────────────────────────────────────
function SortableBlockItem({ block, pageId, onAddTask, onAddSection }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: block._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle positioned left of block content */}
      <div style={{
        position: 'absolute', left: -24, top: 4, opacity: 0,
        transition: 'opacity 0.15s',
      }} className="block-drag-handle">
        <DragHandle listeners={listeners} attributes={attributes} />
      </div>
      <BlockNode block={block} pageId={pageId} depth={0} onAddTask={onAddTask} onAddSection={onAddSection} />

      <style>{`
        div:hover > .block-drag-handle { opacity: 1 !important; }
        @media (max-width: 768px) { .block-drag-handle { opacity: 1 !important; } }
      `}</style>
    </div>
  );
}

// ── Main sortable list ────────────────────────────────────────────────────────
export default function SortableBlockList({ blocks, pageId, onAddTask, onAddSection }) {
  const dispatch = useDispatch();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // Prevent accidental drags
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;

    const activeIndex = blocks.findIndex((b) => b._id === active.id);
    const overIndex = blocks.findIndex((b) => b._id === over.id);
    if (activeIndex === -1 || overIndex === -1) return;

    // ── Compute new fractional order ─────────────────────────────────────────
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const newSorted = [...sorted];
    const [moved] = newSorted.splice(activeIndex, 1);
    newSorted.splice(overIndex, 0, moved);

    // Calculate new order value between neighbors
    const prev = newSorted[overIndex - 1];
    const next = newSorted[overIndex + 1];
    let newOrder;
    if (!prev) newOrder = (next?.order || 1000) / 2;
    else if (!next) newOrder = (prev.order || 0) + 1000;
    else newOrder = (prev.order + next.order) / 2;

    // Optimistic update
    dispatch(optimisticUpdateBlock({
      pageId, blockId: active.id, updates: { order: newOrder },
    }));

    // Persist to server
    dispatch(moveBlockAsync({ id: active.id, newParentId: null, newOrder }));
  }, [blocks, dispatch, pageId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map((b) => b._id)}
        strategy={verticalListSortingStrategy}
      >
        {blocks.map((block) => (
          <SortableBlockItem key={block._id} block={block} pageId={pageId} onAddTask={onAddTask} onAddSection={onAddSection} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
