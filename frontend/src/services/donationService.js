import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const unwrap = (response) => {
  const body = response.data;
  if (body && body.success !== undefined && body.data !== undefined) {
    return body.data;
  }
  return body;
};

export const getDonationListings = async () => {
  const response = await api.get('/api/donations/listings');
  return unwrap(response) || [];
};

export const createDonationListing = async (data) => {
  const response = await api.post('/api/donations/listings', data);
  return unwrap(response);
};

export const finalizeDonationListing = async (listingId, data) => {
  const response = await api.post(`/api/donations/listings/${listingId}/finalize`, data);
  return unwrap(response);
};

export const schedulePickup = async (listingId, pickupEta) => {
  const response = await api.post(`/api/donations/listings/${listingId}/schedule-pickup`, { pickup_eta: pickupEta });
  return unwrap(response);
};

export const completeDonation = async (listingId) => {
  const response = await api.post(`/api/donations/listings/${listingId}/complete`);
  return unwrap(response);
};

export const getNgoProfile = async () => {
  const response = await api.get('/api/ngo/profile');
  return unwrap(response);
};

export const saveNgoProfile = async (data) => {
  const response = await api.post('/api/ngo/profile', data);
  return unwrap(response);
};

export const getNgoNearbyDonations = async (params = {}) => {
  const response = await api.get('/api/ngo/donations/nearby', { params });
  return unwrap(response) || [];
};

export const acceptDonation = async (listingId, idempotencyKey) => {
  const response = await api.post(`/api/ngo/donations/${listingId}/accept`, null, {
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  });
  return unwrap(response);
};

export const getNgoAcceptedDonations = async () => {
  const response = await api.get('/api/ngo/donations/accepted');
  return unwrap(response) || [];
};

export const getNgoNotifications = async () => {
  const response = await api.get('/api/ngo/notifications');
  return unwrap(response) || [];
};

export const markNgoNotificationRead = async (notificationId) => {
  const response = await api.post(`/api/ngo/notifications/${notificationId}/read`);
  return unwrap(response);
};

export const connectNotificationStream = (token, onMessage) => {
  const url = `${API_BASE_URL}/api/stream/notifications?token=${encodeURIComponent(token)}`;
  const source = new EventSource(url);

  source.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data, event);
    } catch {
      onMessage({ type: 'message' }, event);
    }
  };

  return source;
};
