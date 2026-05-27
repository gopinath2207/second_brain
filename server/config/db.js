/**
 * db.js — MongoDB Atlas connection manager
 * Uses Mongoose with optimized connection pooling for the free M0 tier.
 */
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Optimized for M0 free tier:
      maxPoolSize: 5,          // Limit connections (M0 cap is low)
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`⚓  Grand Line DB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌  DB Connection Failed: ${err.message}`);
    process.exit(1);
  }
};

// Handle disconnections gracefully
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Reconnecting...');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌  MongoDB error: ${err.message}`);
});

module.exports = connectDB;
