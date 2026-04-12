import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';

export default function NotificationBell({
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
  clearAll,
  enableNotifications,
  permissionGranted
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Bell className="text-gray-600 dark:text-gray-300" size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 flex flex-col rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-50 animate-fade-in-down">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 tracking-tight text-sm">Notifications</h3>
            <div className="flex gap-2">
              <button 
                title="Mark all as read"
                onClick={markAllAsRead} 
                className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                <CheckCheck size={18} />
              </button>
              <button 
                title="Clear all"
                onClick={clearAll} 
                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                No notifications right now.
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 border-b border-gray-50 dark:border-gray-700/50 cursor-pointer transition-colors duration-200 ${notification.read ? 'bg-white dark:bg-gray-800 opacity-70' : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <strong className="text-sm text-gray-800 dark:text-gray-100">{notification.title}</strong>
                    {!notification.read && <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.body}</p>
                </div>
              ))
            )}
          </div>

          {/* Footer (Permission Prompt) */}
          {!permissionGranted && (
            <div className="p-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 text-center">
              <button 
                onClick={enableNotifications}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium border border-blue-200 dark:border-blue-700 rounded px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                Enable Push Notifications 🚀
              </button>
            </div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 4px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4B5563;
        }
        @keyframes fadein-down {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fadein-down 0.2s ease-out;
        }
      `}} />
    </div>
  );
}
