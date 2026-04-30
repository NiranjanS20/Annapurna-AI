import axios from 'axios';
import { auth } from './authService';

// ── Environment Validation ───────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

if (!import.meta.env.VITE_API_BASE_URL && import.meta.env.PROD) {
  console.error(
    '⚠️ VITE_API_BASE_URL is not set in production! API calls will fail. ' +
    'Set this in Vercel environment variables to your Render backend URL.'
  );
}

// ── Correlation ID generator ─────────────────────────────────────────
const generateCorrelationId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000, // 20s default timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor ──────────────────────────────────────────────
// 1. Attach Firebase JWT token to every outgoing request
// 2. Detect FormData and remove Content-Type so browser sets multipart boundary
// 3. Attach correlation ID for request tracing
api.interceptors.request.use(
  async (config) => {
    // Correlation ID for request tracing across frontend/backend
    config.headers['X-Correlation-ID'] = generateCorrelationId();

    // CRITICAL FIX: FormData must NOT have Content-Type: application/json
    // Browser needs to set multipart/form-data with the correct boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      // CSV uploads need longer timeout
      if (!config._customTimeout) {
        config.timeout = 120000; // 120s for file uploads
      }
    }

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

// ── Normalize API Error ──────────────────────────────────────────────
// Centralised error normalisation for user-facing display + telemetry
export const normalizeApiError = (error) => {
  let errMsg = 'An unexpected error occurred.';
  let errCode = 'UNKNOWN';
  const correlationId = error.config?.headers?.['X-Correlation-ID'] || null;

  if (error.code === 'ECONNABORTED') {
    errMsg = 'Request timed out. Please check your connection and try again.';
    errCode = 'TIMEOUT';
  } else if (!error.response) {
    errMsg = 'Network error. Please check your internet connection or try again later.';
    errCode = 'NETWORK';
  } else {
    const status = error.response.status;
    const serverMsg = error.response?.data?.error || error.response?.data?.message;

    if (serverMsg) {
      errMsg = serverMsg;
    } else if (status === 401) {
      errMsg = 'Session expired. Please sign in again.';
    } else if (status === 403) {
      errMsg = 'You do not have permission to perform this action.';
    } else if (status === 404) {
      errMsg = 'The requested resource was not found.';
    } else if (status === 408) {
      errMsg = 'Upload is taking longer than expected. Please try again.';
    } else if (status === 413) {
      errMsg = 'File is too large. Please reduce file size and try again.';
    } else if (status === 422) {
      errMsg = 'Validation error. Please check your input.';
    } else if (status >= 500) {
      errMsg = 'Server error. Please try again in a moment.';
    }

    errCode = `HTTP_${status}`;
  }

  return { message: errMsg, code: errCode, correlationId };
};

// ── Response Interceptor ─────────────────────────────────────────────
// 1. Handle 401s with automatic token refresh + retry (once)
// 2. Normalize error messages for user-facing display
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ── Auto-retry on 401 (token expired) ──
    if (
      error.response?.status === 401 &&
      !originalRequest._retried &&
      auth.currentUser
    ) {
      originalRequest._retried = true;
      try {
        const freshToken = await auth.currentUser.getIdToken(true);
        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        console.error('Token refresh failed, logging out:', refreshErr);
        // Don't auto-logout here — let AuthContext handle session expiry
      }
    }

    // ── Normalize error messages ──
    const normalized = normalizeApiError(error);

    const wrapped = new Error(normalized.message);
    wrapped.response = error.response;
    wrapped.status = error.response?.status;
    wrapped.code = error.code;
    wrapped.correlationId = normalized.correlationId;
    wrapped.errorCode = normalized.code;
    return Promise.reject(wrapped);
  }
);

export default api;
