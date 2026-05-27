/**
 * usePushNotification.js — Firebase Cloud Messaging hook.
 *
 * Usage: Call this hook inside a component that is rendered while the user
 * is authenticated. It will request notification permission, get the FCM
 * token, and register it with the server.
 *
 * Prerequisites:
 *   1. Set VITE_FIREBASE_* env vars in client/.env
 *   2. Set FIREBASE_SERVICE_ACCOUNT in server/.env
 */
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import api from '../api/axios';

// Lazy-import Firebase to avoid errors if env vars are missing
let messagingInstance = null;

async function getFirebaseMessaging() {
  if (messagingInstance) return messagingInstance;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey || apiKey === 'your-firebase-api-key') {
    console.warn('[FCM] Firebase API key not configured. Push notifications disabled.');
    return null;
  }

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

    const firebaseConfig = {
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const app = getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApps()[0];

    messagingInstance = getMessaging(app);
    return { messaging: messagingInstance, getToken, onMessage };
  } catch (err) {
    console.error('[FCM] Firebase init error:', err);
    return null;
  }
}

export function usePushNotification() {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const registered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registered.current) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('[FCM] Notification permission denied.');
          return;
        }

        const fb = await getFirebaseMessaging();
        if (!fb) return;

        const { messaging, getToken, onMessage } = fb;

        // Register the service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        // Get FCM token
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (!token) {
          console.warn('[FCM] Failed to get FCM token.');
          return;
        }

        // Send token to server for storage
        await api.post('/auth/fcm-token', { token });
        registered.current = true;
        console.log('[FCM] Token registered successfully.');

        // Handle foreground messages
        onMessage(messaging, (payload) => {
          console.log('[FCM] Foreground message:', payload);
          const { title, body } = payload.notification || {};
          if (title) {
            // Show in-app toast instead of native notification for foreground
            import('react-hot-toast').then(({ default: toast }) => {
              toast(`🔔 ${title}: ${body || ''}`, { duration: 6000 });
            });
          }
        });
      } catch (err) {
        console.error('[FCM] Push notification setup error:', err);
      }
    };

    register();
  }, [isAuthenticated]);
}
