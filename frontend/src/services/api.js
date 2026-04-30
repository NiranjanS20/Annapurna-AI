import axios from 'axios';
import { auth } from './authService';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
});

// Remove default Content-Type so axios can set it properly for FormData

// ── Request Interceptor ──────────────────────────────────────────────
// Automatically attach the Firebase JWT token to every outgoing request.
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Could not attach auth token:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ─────────────────────────────────────────────
// Handle 401s globally (e.g. expired tokens).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized — token may be expired.');
    }
    
    // Standardize error parser
    const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Network Error';
    const wrapped = new Error(errMsg);
    wrapped.response = error.response;
    wrapped.status = error.response?.status;
    return Promise.reject(wrapped);
  }
);

export default api;
