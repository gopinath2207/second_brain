/**
 * firebase.js — Firebase Admin SDK initialization
 * Used server-side for sending FCM push notifications.
 */
const admin = require('firebase-admin');

let firebaseApp = null;

const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  // Service account credentials are stored as a JSON string in the env
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT not set. Push notifications disabled.');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('🔥  Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (err) {
    console.error(`❌  Firebase init failed: ${err.message}`);
    return null;
  }
};

module.exports = { initFirebase, admin };
