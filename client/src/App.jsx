/**
 * App.jsx — Root router with protected routes and auth guard.
 */
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCurrentUser } from './store/authSlice';
import { usePushNotification } from './hooks/usePushNotification';
import ErrorBoundary from './components/common/ErrorBoundary';

import Layout from './components/layout/Layout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import BlocksPage from './pages/BlocksPage';
import TimetablePage from './pages/TimetablePage';
import HabitsPage from './pages/HabitsPage';
import PlannerPage from './pages/PlannerPage';
import ExamsPage from './pages/ExamsPage';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Redirect to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Activate push notifications (silently no-ops if Firebase not configured)
  usePushNotification();

  // Refresh user data on app load
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCurrentUser());
    }
  }, [isAuthenticated, dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthPage mode="login" />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <AuthPage mode="register" />
            </PublicRoute>
          }
        />

        {/* Protected routes — all inside Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Layout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="blocks" element={<BlocksPage />} />
          <Route path="blocks/:pageId" element={<BlocksPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="exams" element={<ExamsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
