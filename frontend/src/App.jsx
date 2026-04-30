import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ROUTES } from './utils/constants';

// Pages
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import DataEntry from './pages/DataEntry';
import Prediction from './pages/Prediction';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import Donation from './pages/Donation';
import Landing from './pages/Landing';
import NGODashboard from './pages/NGODashboard';
import NGONearby from './pages/NGONearby';
import NGOOnboarding from './pages/NGOOnboarding';

// Layout Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

const ProtectedRoute = ({ children }) => {
  const {
    currentUser,
    backendUser,
    authInitialized,
    authLoading,
    tokenReady,
    syncLoading,
    tokenRefreshing,
    reconnecting,
    syncError,
  } = useAuth();
  
  const isBooting = !authInitialized || authLoading || syncLoading || tokenRefreshing;

  if (isBooting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to={ROUTES.AUTH} replace />;
  }

  if (!backendUser || !tokenReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="animate-pulse h-3 w-24 rounded-full bg-blue-200 dark:bg-blue-900"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {reconnecting ? 'Reconnecting to the server...' : 'Syncing your profile...'}
          </p>
          {syncError && <p className="text-xs text-gray-400 dark:text-gray-500">{syncError}</p>}
        </div>
      </div>
    );
  }
  
  return children;
};

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

const RoleRoute = ({ roles, children }) => {
  const { backendUser } = useAuth();
  const role = backendUser?.role || 'canteen';

  if (!roles.includes(role)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path={ROUTES.AUTH} element={<Auth />} />
            
            <Route path={ROUTES.HOME} element={<Landing />} />

            <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path={ROUTES.DATA_ENTRY} element={<ProtectedRoute><Layout><DataEntry /></Layout></ProtectedRoute>} />
            <Route path={ROUTES.PREDICTION} element={<ProtectedRoute><Layout><Prediction /></Layout></ProtectedRoute>} />
            <Route path={ROUTES.ANALYTICS} element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
            <Route path={ROUTES.ALERTS} element={<ProtectedRoute><Layout><Alerts /></Layout></ProtectedRoute>} />
            <Route path={ROUTES.DONATION} element={<ProtectedRoute><Layout><Donation /></Layout></ProtectedRoute>} />

            <Route path={ROUTES.NGO_ONBOARDING} element={<ProtectedRoute><Layout><NGOOnboarding /></Layout></ProtectedRoute>} />
            <Route path={ROUTES.NGO_DASHBOARD} element={<ProtectedRoute><RoleRoute roles={['ngo', 'admin']}><Layout><NGODashboard /></Layout></RoleRoute></ProtectedRoute>} />
            <Route path={ROUTES.NGO_NEARBY} element={<ProtectedRoute><RoleRoute roles={['ngo', 'admin']}><Layout><NGONearby /></Layout></RoleRoute></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to={ROUTES.HOME} />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
