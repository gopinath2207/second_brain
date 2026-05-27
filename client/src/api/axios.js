/**
 * axios.js — Configured Axios instance.
 * Automatically attaches JWT token and handles 401 responses.
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://second-brain-9224.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s — accounts for Render cold start
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: attach JWT ───────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sb_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: handle 401 ─────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear auth and redirect to login
      localStorage.removeItem('sb_token');
      localStorage.removeItem('sb_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
