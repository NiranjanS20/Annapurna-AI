import { app } from './firebase';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

// ── Core Firebase auth ────────────────────────────────────────────────

export const loginWithEmail = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const logout = () => {
  return signOut(auth);
};

export const deleteCurrentUser = async () => {
  if (auth.currentUser) {
    try {
      await deleteUser(auth.currentUser);
    } catch (e) {
      console.error('Failed to rollback/delete user:', e);
    }
  }
};

// ── Backend sync helpers ──────────────────────────────────────────────

/**
 * POST /api/auth/sync-user
 * Called after every successful Firebase login.
 * Creates the user in the backend if they don't exist, or returns the existing one.
 *
 * @param {string} idToken  - Firebase ID token
 * @param {object} profile  - Optional profile fields (full_name, business_name, etc.)
 * @returns {Promise<{success: boolean, user: object, isNewUser: boolean}>}
 */
export const syncUser = async (idToken, profile = {}) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/sync-user`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ profile }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || 'Backend user sync failed.');
  }

  return data; // { success, user, isNewUser }
};

/**
 * GET /api/auth/check-user?email=<email>
 * Used by the Google login flow to check if the user already has an account.
 *
 * @param {string} email
 * @returns {Promise<boolean>} - true if user exists, false otherwise
 */
export const checkUserExists = async (email) => {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/check-user?email=${encodeURIComponent(email)}`
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || 'User existence check failed.');
  }

  return data.exists; // boolean
};

/**
 * GET /api/auth/me
 * Fetches the current logged in user from backend without creating a new one.
 */
export const getCurrentUser = async (idToken) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
  
  if (!response.ok) {
    throw new Error('User not found in backend.');
  }
  
  const data = await response.json();
  return data;
};
