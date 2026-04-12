import { getToken, onMessage } from 'firebase/messaging';
import { getAppMessaging } from './firebase';

// Use the VAPID key provided
const PUBLIC_VAPID_KEY = "FU8SB0o_DvNT-Fs9P7urIURC9yXjWL1RHfszYBVFHOE";

export const requestNotificationPermission = async () => {
  try {
    const messaging = await getAppMessaging();
    if (!messaging) {
      console.warn("Messaging is not supported in this browser.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      // Keep getting token
      const currentToken = await getToken(messaging, { 
        vapidKey: PUBLIC_VAPID_KEY,
      });

      if (currentToken) {
        console.log('FCM Token received:', currentToken);
        // Simulate sending token to backend
        // e.g. await axios.post('/api/notifications/saveToken', { token: currentToken });
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Notification permission not granted.');
    }
  } catch (err) {
    console.error('An error occurred while retrieving token:', err);
  }
  return null;
};

export const onForegroundMessage = async (callback) => {
  try {
    const messaging = await getAppMessaging();
    if (messaging) {
      return onMessage(messaging, (payload) => {
        console.log('Message received in foreground:', payload);
        callback(payload);
      });
    }
  } catch (err) {
    console.error('Failed to setup foreground listener', err);
  }
  return () => {}; // return empty unmount fn
};
