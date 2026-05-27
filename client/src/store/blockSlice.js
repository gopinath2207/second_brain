/**
 * blockSlice.js — Redux slice for the Block editor with optimistic updates.
 *
 * Optimistic update strategy:
 * 1. Immediately update Redux state (user sees change instantly)
 * 2. Send API request in background
 * 3. If API fails, revert to previous state and show error toast
 *
 * This hides Render's cold-start latency from the user.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';
import toast from 'react-hot-toast';

// ── Async Thunks ──────────────────────────────────────────────────────────────
export const fetchPageBlocks = createAsyncThunk(
  'blocks/fetchPageBlocks',
  async (pageId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/pages/${pageId}/blocks`);
      return { pageId, blocks: data.blocks };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch blocks.');
    }
  }
);

export const createBlockAsync = createAsyncThunk(
  'blocks/create',
  async (blockData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/blocks', blockData);
      // Carry _tempId forward so reducer can match and replace the placeholder
      return { ...data.block, _tempId: blockData._tempId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create block.');
    }
  }
);

export const updateBlockAsync = createAsyncThunk(
  'blocks/update',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/blocks/${id}`, updates);
      return data.block;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update block.');
    }
  }
);

export const deleteBlockAsync = createAsyncThunk(
  'blocks/delete',
  async (blockId, { rejectWithValue }) => {
    try {
      await api.delete(`/blocks/${blockId}`);
      return blockId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete block.');
    }
  }
);

export const moveBlockAsync = createAsyncThunk(
  'blocks/move',
  async ({ id, newParentId, newOrder }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/blocks/${id}/move`, { newParentId, newOrder });
      return data.block;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to move block.');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────
const blockSlice = createSlice({
  name: 'blocks',
  initialState: {
    // Map of pageId → array of blocks (flat, tree reconstructed in selector)
    byPage: {},
    currentPageId: null,
    loading: false,
    saving: false, // Background sync indicator
    error: null,
  },
  reducers: {
    setCurrentPage: (state, action) => {
      state.currentPageId = action.payload;
    },
    // Optimistic: update a block locally before API confirms
    optimisticUpdateBlock: (state, action) => {
      const { pageId, blockId, updates } = action.payload;
      if (!state.byPage[pageId]) return;
      const idx = state.byPage[pageId].findIndex((b) => b._id === blockId);
      if (idx !== -1) {
        state.byPage[pageId][idx] = { ...state.byPage[pageId][idx], ...updates };
      }
    },
    // Optimistic: add block locally before API confirms
    optimisticAddBlock: (state, action) => {
      const { pageId, block } = action.payload;
      if (!state.byPage[pageId]) state.byPage[pageId] = [];
      state.byPage[pageId].push(block);
    },
    // Optimistic: remove block locally before API confirms
    optimisticRemoveBlock: (state, action) => {
      const { pageId, blockId } = action.payload;
      if (!state.byPage[pageId]) return;
      // Remove the block and all its descendants
      const removeWithChildren = (blocks, id) => {
        const children = blocks.filter((b) => b.parent === id);
        const filtered = blocks.filter((b) => b._id !== id);
        return children.reduce((acc, child) => removeWithChildren(acc, child._id), filtered);
      };
      state.byPage[pageId] = removeWithChildren(state.byPage[pageId], blockId);
    },
    clearBlocks: (state) => {
      state.byPage = {};
      state.currentPageId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPageBlocks
      .addCase(fetchPageBlocks.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPageBlocks.fulfilled, (state, action) => {
        state.loading = false;
        state.byPage[action.payload.pageId] = action.payload.blocks;
      })
      .addCase(fetchPageBlocks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createBlock: replace temp block with real one from API
      .addCase(createBlockAsync.fulfilled, (state, action) => {
        const block = action.payload;
        const pageId = block.page;
        if (!state.byPage[pageId]) state.byPage[pageId] = [];

        // 1. Try to find and replace the optimistic temp placeholder by _tempId
        if (block._tempId) {
          const tempIdx = state.byPage[pageId].findIndex(
            (b) => b._id === block._tempId || b._tempId === block._tempId
          );
          if (tempIdx !== -1) {
            state.byPage[pageId][tempIdx] = block;
            state.saving = false;
            return;
          }
        }

        // 2. Check if already present by real _id (avoid duplicates)
        const existsIdx = state.byPage[pageId].findIndex((b) => b._id === block._id);
        if (existsIdx !== -1) {
          state.byPage[pageId][existsIdx] = block;
        } else {
          state.byPage[pageId].push(block);
        }
        state.saving = false;
      })
      .addCase(createBlockAsync.rejected, (state, action) => {
        state.saving = false;
        toast.error(action.payload || 'Failed to save block.');
      })
      // updateBlock
      .addCase(updateBlockAsync.fulfilled, (state, action) => {
        const block = action.payload;
        const pageId = block.page;
        if (!state.byPage[pageId]) return;
        const idx = state.byPage[pageId].findIndex((b) => b._id === block._id);
        if (idx !== -1) state.byPage[pageId][idx] = block;
        state.saving = false;
      })
      .addCase(updateBlockAsync.rejected, (state, action) => {
        state.saving = false;
        toast.error(action.payload || 'Failed to update block.');
      })
      // deleteBlock
      .addCase(deleteBlockAsync.rejected, (state, action) => {
        state.saving = false;
        toast.error(action.payload || 'Failed to delete block.');
      })
      // moveBlock
      .addCase(moveBlockAsync.fulfilled, (state, action) => {
        const block = action.payload;
        const pageId = block.page;
        if (!state.byPage[pageId]) return;
        const idx = state.byPage[pageId].findIndex((b) => b._id === block._id);
        if (idx !== -1) state.byPage[pageId][idx] = block;
      });
  },
});

export const {
  setCurrentPage,
  optimisticUpdateBlock,
  optimisticAddBlock,
  optimisticRemoveBlock,
  clearBlocks,
} = blockSlice.actions;

// ── Selector: build tree from flat list ───────────────────────────────────────
export const selectBlockTree = (state, pageId) => {
  const flat = state.blocks.byPage[pageId] || [];

  const buildTree = (parentId) => {
    return flat
      .filter((b) => {
        const bParent = b.parent || null;
        const target = parentId || null;
        return bParent === target || bParent?.toString() === target?.toString();
      })
      .sort((a, b) => a.order - b.order)
      .map((b) => ({
        ...b,
        children: buildTree(b._id),
      }));
  };

  return buildTree(null);
};

export default blockSlice.reducer;
