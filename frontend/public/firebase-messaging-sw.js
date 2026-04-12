importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Using the same configuration as the main app
firebase.initializeApp({
  apiKey: "AIzaSyC9Mh5SuGd8b4b4wFk-7PRE6aDNXgOorj0",
  authDomain: "annapurna-ai-82852.firebaseapp.com",
  projectId: "annapurna-ai-82852",
  storageBucket: "annapurna-ai-82852.firebasestorage.app",
  messagingSenderId: "798023494543",
  appId: "1:798023494543:web:6ac73de0250a4db76e39fa",
  measurementId: "G-80PFP9R9V5"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'New Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification.',
    icon: '/vite.svg', // Default icon, you can add a custom one to public/
    badge: '/vite.svg',
    tag: 'ai-food-waste',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
