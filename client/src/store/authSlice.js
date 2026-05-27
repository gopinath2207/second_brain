/**
 * authSlice.js — Redux slice for authentication state.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

// ── Load persisted state from localStorage ────────────────────────────────────
const loadAuthState = () => {
  try {
    const token = localStorage.getItem('sb_token');
    const userStr = localStorage.getItem('sb_user');
    if (token && userStr) {
      return { token, user: JSON.parse(userStr), isAuthenticated: true };
    }
  } catch (_) {}
  return { token: null, user: null, isAuthenticated: false };
};

// ── Async Thunks ──────────────────────────────────────────────────────────────
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login failed.');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ username, email, password }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/register', { username, email, password });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed.');
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/auth/me');
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch user.');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    ...loadAuthState(),
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('sb_token');
      localStorage.removeItem('sb_user');
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUserBounty: (state, action) => {
      if (state.user) {
        state.user.bountyPoints = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // Helper to handle auth success (same logic for login + register)
    const handleAuthSuccess = (state, action) => {
      state.loading = false;
      state.error = null;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem('sb_token', action.payload.token);
      localStorage.setItem('sb_user', JSON.stringify(action.payload.user));
    };

    const handleAuthPending = (state) => {
      state.loading = true;
      state.error = null;
    };

    const handleAuthRejected = (state, action) => {
      state.loading = false;
      state.error = action.payload;
    };

    builder
      .addCase(loginUser.pending, handleAuthPending)
      .addCase(loginUser.fulfilled, handleAuthSuccess)
      .addCase(loginUser.rejected, handleAuthRejected)
      .addCase(registerUser.pending, handleAuthPending)
      .addCase(registerUser.fulfilled, handleAuthSuccess)
      .addCase(registerUser.rejected, handleAuthRejected)
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        localStorage.setItem('sb_user', JSON.stringify(action.payload.user));
      });
  },
});

export const { logout, clearError, updateUserBounty } = authSlice.actions;
export default authSlice.reducer;
