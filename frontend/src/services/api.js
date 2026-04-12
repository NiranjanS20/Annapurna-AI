import axios from 'axios';
import { auth } from './authService';

const api = axios.create({
  baseURL: "https://annapurna-ai-6dih.onrender.com" ,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    return Promise.reject(new Error(errMsg));
  }
);

export default api;
