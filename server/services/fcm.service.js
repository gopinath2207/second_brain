/**
 * fcm.service.js — Firebase Cloud Messaging push notification sender.
 */
const { admin } = require('../config/firebase');

/**
 * Send a push notification to one or more FCM tokens.
 * @param {string[]} tokens - Array of FCM registration tokens
 * @param {object} notification - { title, body }
 * @param {object} data - Additional key-value data payload
 * @returns {Promise<object>} FCM batch response
 */
const sendPushNotification = async (tokens, notification, data = {}) => {
  if (!admin) {
    console.warn('[FCM] Firebase not initialized. Skipping push notification.');
    return null;
  }

  if (!tokens || tokens.length === 0) {
    console.warn('[FCM] No FCM tokens provided.');
    return null;
  }

  // Convert all data values to strings (FCM requirement)
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  const message = {
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: stringData,
    // Android-specific: high priority for immediate delivery
    android: {
      priority: 'high',
      notification: {
        icon: 'ic_notification',
        color: '#00ff9d', // Neon green
        sound: 'default',
        channelId: 'second_brain_default',
      },
    },
    // Web/PWA
    webpush: {
      notification: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
      },
      fcmOptions: {
        link: '/',
      },
    },
    tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[FCM] Sent to ${response.successCount}/${tokens.length} tokens.`);
    
    // Log failures for token cleanup
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.warn(`[FCM] Token ${tokens[idx]} failed: ${resp.error?.message}`);
        }
      });
    }

    return response;
  } catch (err) {
    console.error(`[FCM] Send failed: ${err.message}`);
    return null;
  }
};

/**
 * Notify user that their daily plan is ready.
 */
const notifyPlanReady = async (user, planDate) => {
  const dateStr = new Date(planDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  return sendPushNotification(
    user.fcmTokens,
    {
      title: '⚓ Your Grand Line Plan is Ready!',
      body: `Your optimized schedule for ${dateStr} awaits. Set sail!`,
    },
    { type: 'plan_ready', date: planDate.toISOString() }
  );
};

/**
 * Notify user of a missed habit.
 */
const notifyMissedHabit = async (user, habitName) => {
  return sendPushNotification(
    user.fcmTokens,
    {
      title: '⚔️ Haki Training Missed!',
      body: `${habitName} — Don't let your Haki fade. Complete it now!`,
    },
    { type: 'habit_missed', habitName }
  );
};

module.exports = { sendPushNotification, notifyPlanReady, notifyMissedHabit };
