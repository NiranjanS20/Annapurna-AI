import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center h-8 w-[60px] rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
          : 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)',
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Track icons */}
      <Sun
        size={12}
        className={`absolute left-2 transition-opacity duration-300 ${
          isDark ? 'opacity-30 text-gray-400' : 'opacity-100 text-amber-500'
        }`}
      />
      <Moon
        size={12}
        className={`absolute right-2 transition-opacity duration-300 ${
          isDark ? 'opacity-100 text-blue-300' : 'opacity-30 text-gray-400'
        }`}
      />

      {/* Thumb */}
      <span
        className={`absolute top-1 h-6 w-6 rounded-full shadow-md transition-all duration-300 ease-in-out flex items-center justify-center ${
          isDark
            ? 'translate-x-[32px] bg-slate-700'
            : 'translate-x-[2px] bg-white'
        }`}
      >
        {isDark ? (
          <Moon size={13} className="text-blue-300" />
        ) : (
          <Sun size={13} className="text-amber-500" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
