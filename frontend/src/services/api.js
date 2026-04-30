import axios from 'axios';
import { auth } from './authService';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
});

// Interceptor to attach Firebase token
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

// Response interceptor: auto-refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const user = auth.currentUser;
        if (user) {
          // Force token refresh
          const newToken = await user.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Logout user on refresh failure
        try {
          const { logout } = await import('./authService');
          await logout();
        } catch {}
      }
    }
    
    // Standardize error
    const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Network Error';
    const wrapped = new Error(errMsg);
    wrapped.response = error.response;
    wrapped.status = error.response?.status;
    return Promise.reject(wrapped);
  }
);

export default api;
