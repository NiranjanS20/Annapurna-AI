import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout,
  checkUserExists,
  deleteCurrentUser
} from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../utils/constants';
import AuthForm from '../components/AuthForm';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, backendUser, triggerSync } = useAuth();

  // Pre-filled email from Google redirect (when user doesn't exist yet)
  const prefillEmail = location.state?.prefillEmail || '';

  // Redirect to dashboard if already fully logged in (waits for Postgres sync!)
  useEffect(() => {
    if (currentUser && backendUser) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [currentUser, backendUser, navigate]);

  // If we arrived here with a prefill email, switch to signup mode
  useEffect(() => {
    if (prefillEmail) {
      setIsLogin(false);
    }
  }, [prefillEmail]);

  // ── Email / Password submit ─────────────────────────────────────────
  const handleSubmit = async (formData) => {
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        // Step 1: Firebase login
        const credential = await loginWithEmail(formData.email, formData.password);

        // Step 2: Trigger sync with context — await but DO NOT navigate directly
        await triggerSync(credential.user);
        // (The useEffect will detect backendUser and seamlessly route to Dashboard)
        
      } else {
        // Step 1: Create Firebase account
        const credential = await registerWithEmail(formData.email, formData.password);

        try {
          // Step 2: Sync with backend, passing full profile natively
          await triggerSync(credential.user, {
            full_name: formData.full_name,
            business_name: formData.business_name,
            business_type: formData.business_type,
            location: formData.location,
          });
          // (The useEffect will route to Dashboard)
        } catch (syncErr) {
          // If backend sync fails during signup, ROLLBACK
          console.error("Backend Sync Failed:", syncErr);
          await deleteCurrentUser();
          await logout();
          throw new Error(`Sync Error: ${syncErr.message}. Account rolled back.`);
        }
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/network-request-failed') {
        setError('Network error: Unable to reach Firebase. Please check your connection or CORS/domain settings.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Account already exists. Please login.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google login ────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      // Step 1: Firebase Google popup
      const credential = await loginWithGoogle();
      const email = credential.user.email;

      // Step 2: Check if this email already has a backend account
      const exists = await checkUserExists(email);

      if (exists) {
        // Step 3a: User exists → sync and wait for dashboard redirect hook
        await triggerSync(credential.user);
      } else {
        // Step 3b: User does NOT exist → sign out of Firebase,
        // redirect to signup with email prefilled
        await logout();
        navigate(ROUTES.AUTH, {
          replace: true,
          state: { prefillEmail: email },
        });
        setError(
          `No account found for ${email}. Please sign up below.`
        );
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6 relative">
      <div
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}
      ></div>

      <div className="w-full max-w-md relative z-10">
        <div className="border-8 border-black bg-white p-8 md:p-12 shadow-[16px_16px_0px_rgba(0,0,0,1)]">

          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-heading font-black uppercase tracking-tighter text-black">
              {isLogin ? 'Welcome Back' : 'Join Us'}
            </h1>
            <p className="mt-4 border-4 border-black bg-[#FCA5A5] inline-block px-4 py-2 font-sans font-bold text-black shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              Annapurna AI
            </p>
          </div>

          <AuthForm
            type={isLogin ? 'login' : 'signup'}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
            prefillEmail={prefillEmail}
          />

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 border-t-4 border-black"></div>
              <span className="font-heading font-black text-black tracking-tight">OR</span>
              <div className="flex-1 border-t-4 border-black"></div>
            </div>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center gap-3 w-full font-heading font-bold text-lg md:text-xl uppercase border-4 border-black bg-white py-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:translate-x-1 active:shadow-none text-black disabled:opacity-50"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="mt-10 pt-8 border-t-4 border-black text-center">
            <p className="font-sans font-medium text-black mb-4">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </p>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="font-heading font-bold text-lg uppercase border-4 border-black bg-white px-6 py-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:translate-x-1 active:shadow-none text-black"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>

            <div className="mt-6">
              <p className="font-sans font-medium text-black mb-2">Joining as an NGO partner?</p>
              <Link
                to={ROUTES.NGO_ONBOARDING}
                className="inline-block font-heading font-bold text-lg uppercase border-4 border-black bg-[#FDE68A] px-6 py-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:translate-x-1 active:shadow-none text-black"
              >
                Register as NGO Partner
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;
