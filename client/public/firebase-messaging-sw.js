/* firebase-messaging-sw.js — Service Worker for FCM push notifications */
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY || '__FIREBASE_API_KEY__',
  authDomain: self.FIREBASE_AUTH_DOMAIN || '__FIREBASE_AUTH_DOMAIN__',
  projectId: self.FIREBASE_PROJECT_ID || '__FIREBASE_PROJECT_ID__',
  messagingSenderId: self.FIREBASE_SENDER_ID || '__FIREBASE_SENDER_ID__',
  appId: self.FIREBASE_APP_ID || '__FIREBASE_APP_ID__',
});

const messaging = firebase.messaging();

// Handle background messages (when app is not in focus)
messaging.onBackgroundMessage(function (payload) {
  console.log('[SW] Background message received:', payload);

  const { title, body } = payload.notification || {};
  const notificationOptions = {
    body: body || 'Check your Second Brain!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: payload.data,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(title || '⚓ Second Brain', notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
