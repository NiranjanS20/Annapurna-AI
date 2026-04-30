import { useState, useEffect, useCallback } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '../services/notificationService';
import { connectNotificationStream, getDonationNotifications, markNgoNotificationRead } from '../services/donationService';
import { useAuth } from '../context/AuthContext';

export const useNotifications = () => {
  const { currentUser, backendUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [fcmToken, setFcmToken] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [latestToast, setLatestToast] = useState(null);

  useEffect(() => {
    let unmountHandler = () => {};

    const setupPush = async () => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
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

  useEffect(() => {
    let source = null;
    let isMounted = true;

    const hydrateNgoNotifications = async () => {
      if (backendUser?.role !== 'ngo') return;
      try {
        const response = await getDonationNotifications();
        if (!response.success) return;
        const list = response.data || [];
        if (!isMounted) return;
        setNotifications(
          list.map((n) => ({
            id: n.id,
            title: 'New Donation Available',
            body: `Donation ${n.donation_id} is available nearby.`,
            read: n.read_status,
            createdAt: n.notified_at,
          }))
        );
      } catch (err) {
        console.warn('Failed to load NGO notifications', err);
      }
    };

    const connectStream = async () => {
      if (!currentUser || !backendUser) return;
      try {
        const token = await currentUser.getIdToken(true);
        source = connectNotificationStream(token, (data) => {
          if (!isMounted) return;
          const entry = {
            id: `${Date.now()}-${data.donation_id || 'evt'}`,
            title: data.type === 'donation_accepted'
              ? 'Donation Accepted'
              : data.type === 'donation_available'
              ? 'New Donation Nearby'
              : data.type === 'pickup_scheduled'
              ? 'Pickup Scheduled'
              : 'Donation Update',
            body: data.donation_id
              ? `Donation ${data.donation_id} updated.`
              : 'A donation update was received.',
            read: false,
            createdAt: new Date().toISOString(),
          };

          setNotifications((prev) => [entry, ...prev]);
          setLatestToast(entry);
          setTimeout(() => setLatestToast(null), 5000);
        });
      } catch (err) {
        console.warn('Failed to connect SSE stream', err);
      }
    };

    hydrateNgoNotifications();
    connectStream();

    return () => {
      isMounted = false;
      if (source) source.close();
    };
  }, [currentUser, backendUser?.role]);

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
    if (backendUser?.role === 'ngo' && /^\d+$/.test(String(id))) {
      markNgoNotificationRead(id).catch(() => {});
    }
  }, [backendUser?.role]);

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
