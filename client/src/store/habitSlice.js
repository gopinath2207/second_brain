/**
 * habitSlice.js — Redux slice for Haki Training habits.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const fetchHabits = createAsyncThunk('habits/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/habits');
    return data.habits;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch habits.');
  }
});

export const logHabit = createAsyncThunk(
  'habits/log',
  async ({ id, quality = 1, note = '' }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/habits/${id}/log`, { quality, note });
      return { id, bountyEarned: data.bountyEarned };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to log habit.');
    }
  }
);

export const unlogHabit = createAsyncThunk('habits/unlog', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.delete(`/habits/${id}/log/today`);
    return { id, bountyReturned: data.bountyReturned || 0 };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to unlog habit.');
  }
});

export const createHabit = createAsyncThunk(
  'habits/create',
  async (habitData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/habits', habitData);
      return data.habit;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create habit.');
    }
  }
);

export const deleteHabit = createAsyncThunk(
  'habits/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/habits/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete habit.');
    }
  }
);

export const fetchHabitAnalytics = createAsyncThunk(
  'habits/analytics',
  async (days = 30, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/habits/analytics?days=${days}`);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch analytics.');
    }
  }
);

const habitSlice = createSlice({
  name: 'habits',
  initialState: {
    list: [],
    analytics: null,
    loading: false,
    analyticsLoading: false,
    error: null,
  },
  reducers: {
    // Optimistic toggle
    optimisticToggle: (state, action) => {
      const { id, completed } = action.payload;
      const habit = state.list.find((h) => h._id === id);
      if (habit) habit.completedToday = completed;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHabits.pending, (state) => { state.loading = true; })
      .addCase(fetchHabits.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchHabits.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logHabit.fulfilled, (state, action) => {
        const habit = state.list.find((h) => h._id === action.payload.id);
        if (habit) habit.completedToday = true;
      })
      .addCase(logHabit.rejected, (state, action) => {
        state.error = action.payload;
        // Revert optimistic update
        const id = action.meta.arg.id;
        const habit = state.list.find((h) => h._id === id);
        if (habit) habit.completedToday = false;
      })
      .addCase(unlogHabit.fulfilled, (state, action) => {
        const habit = state.list.find((h) => h._id === action.payload.id);
        if (habit) habit.completedToday = false;
      })
      .addCase(createHabit.fulfilled, (state, action) => {
        state.list.push({ ...action.payload, completedToday: false });
      })
      .addCase(deleteHabit.fulfilled, (state, action) => {
        // Remove habit from list by id
        state.list = state.list.filter((h) => h._id !== action.payload);
      })
      .addCase(fetchHabitAnalytics.pending, (state) => { state.analyticsLoading = true; })
      .addCase(fetchHabitAnalytics.fulfilled, (state, action) => {
        state.analyticsLoading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchHabitAnalytics.rejected, (state) => { state.analyticsLoading = false; });
  },
});

export const { optimisticToggle } = habitSlice.actions;
export default habitSlice.reducer;
