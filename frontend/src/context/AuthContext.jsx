import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, syncUser, getCurrentUser, logout } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

const PROFILE_CACHE_KEY = 'annapurna.backend.profile';

const readCachedProfile = () => {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const persistCachedProfile = (user) => {
  if (!user) return;
  const payload = {
    id: user.id,
    role: user.role,
    business_name: user.business_name,
    business_type: user.business_type,
    location: user.location,
  };
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache write errors.
  }
};

const clearCachedProfile = () => {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Ignore cache removal errors.
  }
};

const isRetryableError = (error) => {
  if (!error) return true;
  if (error.isNetworkError) return true;
  const status = error.status;
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
};

const isFatalAuthError = (error) => {
  const status = error?.status;
  return status === 401 || status === 403;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);   // Firebase user
  const [backendUser, setBackendUser] = useState(() => readCachedProfile()); // Backend DB user
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [tokenRefreshing, setTokenRefreshing] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    let retryTimer = null;

    const clearRetry = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const scheduleRetry = (firebaseUser, attempt) => {
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      setReconnecting(true);
      retryTimer = setTimeout(() => {
        hydrateBackendUser(firebaseUser, attempt + 1);
      }, delay);
    };

    const hydrateBackendUser = async (firebaseUser, attempt = 0) => {
      if (!firebaseUser) return;
      setSyncLoading(true);
      setTokenRefreshing(true);

      try {
        const idToken = await firebaseUser.getIdToken(true);
        setTokenReady(true);
        setTokenRefreshing(false);

        let backendResult;
        try {
          backendResult = await getCurrentUser(idToken);
        } catch (error) {
          if (error?.status === 404 || error?.status === 403) {
            const cachedProfile = readCachedProfile() || {};
            backendResult = await syncUser(idToken, cachedProfile);
          } else {
            throw error;
          }
        }

        const resolvedUser = backendResult.user || backendResult.data || backendResult;
        setBackendUser(resolvedUser);
        persistCachedProfile(resolvedUser);
        setSyncError(null);
        setReconnecting(false);
      } catch (error) {
        setTokenRefreshing(false);

        if (isFatalAuthError(error)) {
          await logout();
          setCurrentUser(null);
          setBackendUser(null);
          clearCachedProfile();
          setTokenReady(false);
          setSyncError('Session expired. Please sign in again.');
          setReconnecting(false);
        } else if (isRetryableError(error)) {
          setSyncError('Reconnecting to the server...');
          scheduleRetry(firebaseUser, attempt);
        } else {
          setSyncError(error.message || 'Backend sync failed.');
          setReconnecting(false);
        }
      } finally {
        setSyncLoading(false);
      }
    };

    // Safety timeout: if Firebase hangs (usually due to missing env vars),
    // force loading to false so the UI can render the error state or landing page.
    const safetyTimeout = setTimeout(() => {
      if (authLoading) {
        console.warn('Firebase Auth is taking too long. Check if VITE_FIREBASE_API_KEY is set in Vercel.');
        setAuthLoading(false);
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(safetyTimeout);
      clearRetry();
      setAuthInitialized(true);
      setAuthLoading(false);
      setCurrentUser(firebaseUser);
      setTokenReady(false);

      if (!firebaseUser) {
        setBackendUser(null);
        clearCachedProfile();
        setSyncError(null);
        setReconnecting(false);
        return;
      }

      const cached = readCachedProfile();
      if (cached) {
        setBackendUser(cached);
      }

      await hydrateBackendUser(firebaseUser, 0);
    });

    return () => {
      clearRetry();
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  const triggerSync = async (user, profile = {}) => {
    try {
      setSyncError(null);
      setTokenRefreshing(true);
      const idToken = await user.getIdToken(true);
      setTokenReady(true);
      const result = await syncUser(idToken, profile);
      setBackendUser(result.user);
      persistCachedProfile(result.user);
      setTokenRefreshing(false);
    } catch (err) {
      console.error('Explicit Backend sync failed:', err);
      setSyncError(err.message || 'Explicit backend sync failed.');
      setTokenRefreshing(false);
      throw err;
    }
  };

  const value = {
    currentUser,
    backendUser,
    syncError,
    authInitialized,
    authLoading,
    tokenReady,
    syncLoading,
    tokenRefreshing,
    reconnecting,
    triggerSync, // exposed for Auth.jsx to inject UPSERTs safely
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
