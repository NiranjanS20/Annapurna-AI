import { useState, useEffect, useCallback } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '../services/notificationService';

// Dummy alerts specified in requirements
const INITIAL_ALERTS = [
  { id: '1', title: '⚠️ Food expiring soon', body: 'Check inventory for tomatoes.', read: false, createdAt: new Date().toISOString() },
  { id: '2', title: '📦 Excess food detected', body: '50kg surplus found in pantry.', read: true, createdAt: new Date().toISOString() },
  { id: '3', title: '🤝 Donation request nearby', body: 'Local shelter is looking for grains.', read: false, createdAt: new Date().toISOString() }
];

export const useNotifications = () => {
  const [notifications, setNotifications] = useState(INITIAL_ALERTS);
  const [fcmToken, setFcmToken] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [latestToast, setLatestToast] = useState(null);

  useEffect(() => {
    let unmountHandler = () => {};

    const setupPush = async () => {
      if (Notification.permission === 'granted') {
        setPermissionGranted(true);
        const token = await requestNotificationPermission();
        if (token) setFcmToken(token);
      }

      unmountHandler = await onForegroundMessage((payload) => {
        // Create new alert object
        const newAlert = {
          id: Date.now().toString(),
          title: payload.notification?.title || payload.data?.title || 'New Alert',
          body: payload.notification?.body || payload.data?.body || '',
          read: false,
          createdAt: new Date().toISOString()
        };

        // Prepend to list
        setNotifications((prev) => [newAlert, ...prev]);
        
        // Show in toast
        setLatestToast(newAlert);
        
        // Clear toast after 5s
        setTimeout(() => setLatestToast(null), 5000);
      });
    };

    setupPush();

    return () => unmountHandler && unmountHandler();
  }, []);

  const enableNotifications = useCallback(async () => {
    const token = await requestNotificationPermission();
    if (token) {
      setFcmToken(token);
      setPermissionGranted(true);
    }
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    fcmToken,
    permissionGranted,
    enableNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    latestToast,
    setLatestToast
  };
};
