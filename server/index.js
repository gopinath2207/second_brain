/**
 * index.js — Second Brain Server Entry Point
 *
 * Starts the Express HTTP server with all middleware, routes, and cron jobs.
 * Render free tier note: server spins down after 15 min of inactivity.
 * The React client uses optimistic updates to hide this latency.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables first
dotenv.config();

const connectDB = require('./config/db');
const { initFirebase } = require('./config/firebase');
const errorHandler = require('./middleware/error.middleware');
const { startDailyPlannerCron } = require('./cron/dailyPlanner.cron');

// ── Import Routes ─────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const pageRoutes = require('./routes/page.routes');
const blockRoutes = require('./routes/block.routes');
const timetableRoutes = require('./routes/timetable.routes');
const habitRoutes = require('./routes/habit.routes');
const plannerRoutes = require('./routes/planner.routes');
const uploadRoutes = require('./routes/upload.routes');
const examRoutes = require('./routes/examCountdown.routes');

// ── Initialize Express ────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ── Initialize Firebase ───────────────────────────────────────────────────────
initFirebase();

// ── Core Middleware ───────────────────────────────────────────────────────────
app.use(helmet()); // Security headers

// CORS: Allow Vercel frontend and local dev
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'https://second-brain-topaz-one.vercel.app', // Update with actual Vercel URL
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed.`));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Health Check ──────────────────────────────────────────────────────────────
// Render free tier: this endpoint is pinged by UptimeRobot to prevent spin-down
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'alive',
    message: '⚓ The Thousand Sunny sails on!',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/exams', examRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use('/{*path}', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} leads to the void. Check your compass.`,
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n⚓  Second Brain Server sailing on port ${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);

  // Start the daily AI planner cron job
  startDailyPlannerCron();
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
