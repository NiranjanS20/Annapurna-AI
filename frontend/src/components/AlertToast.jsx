import React, { useEffect } from 'react';
import { BellRing, X } from 'lucide-react';

export default function AlertToast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 animate-bounce-in flex items-start w-80 max-w-sm rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="bg-red-50 dark:bg-red-900/30 p-4 text-red-500 dark:text-red-400 flex items-center justify-center">
          <BellRing size={24} className="animate-pulse" />
        </div>
        <div className="p-4 flex-1">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{toast.title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{toast.body}</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounce-in {
          0% { transform: translateY(100px); opacity: 0; }
          60% { transform: translateY(-10px); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}} />
    </>
  );
}
