import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/authService';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { currentUser, backendUser } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10 transition-colors duration-300">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 hidden sm:block tracking-tight">Annapurna AI</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <ThemeToggle />

        <div className="hidden sm:flex items-center gap-2">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-full border border-blue-100 dark:border-blue-800">
            <User size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
            <div>{currentUser?.email || 'User'}</div>
            <div className="text-xs text-gray-400">{backendUser?.role || 'canteen'}</div>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-gray-600 hover:border-red-200 dark:hover:border-red-700 transition-colors flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
