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

// Layout Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

const ProtectedRoute = ({ children }) => {
  const { currentUser, backendUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    );
  }
  
  if (!currentUser || !backendUser) {
    return <Navigate to={ROUTES.AUTH} replace />;
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
            
            <Route path="*" element={<Navigate to={ROUTES.HOME} />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
