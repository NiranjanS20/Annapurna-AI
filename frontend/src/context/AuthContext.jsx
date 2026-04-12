import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, syncUser, getCurrentUser } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);   // Firebase user
  const [backendUser, setBackendUser] = useState(null);   // Backend DB user
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);

      if (firebaseUser) {
        // Attempt to fetch existing Postgres user on bootstrap/refresh ONLY
        try {
          setSyncError(null);
          const idToken = await firebaseUser.getIdToken(true);
          const result = await getCurrentUser(idToken);
          setBackendUser(result.data);
        } catch (err) {
          console.warn('Backend user not found on bootstrap. Awaiting manual sync.', err);
          setBackendUser(null);
        }
      } else {
        // User logged out — clear backend user too
        setBackendUser(null);
        setSyncError(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const triggerSync = async (user, profile = {}) => {
    try {
      setSyncError(null);
      const idToken = await user.getIdToken(true);
      const result = await syncUser(idToken, profile);
      setBackendUser(result.user);
    } catch (err) {
      console.error('Explicit Backend sync failed:', err);
      setSyncError(err.message || 'Explicit backend sync failed.');
      setBackendUser(null);
      throw err;
    }
  };

  const value = {
    currentUser,
    backendUser,
    syncError,
    loading,
    triggerSync, // exposed for Auth.jsx to inject UPSERTs safely
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
