import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileTerminal, TrendingUp, BarChart2, BellRing, HeartHandshake, MapPin, HandHeart, ClipboardList } from 'lucide-react';
import { ROUTES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { backendUser } = useAuth();
  const role = backendUser?.role || 'canteen';

  const canteenMenu = [
    { name: 'Dashboard', path: ROUTES.DASHBOARD, icon: <LayoutDashboard size={20} /> },
    { name: 'Data Entry', path: ROUTES.DATA_ENTRY, icon: <FileTerminal size={20} /> },
    { name: 'Prediction', path: ROUTES.PREDICTION, icon: <TrendingUp size={20} /> },
    { name: 'Analytics', path: ROUTES.ANALYTICS, icon: <BarChart2 size={20} /> },
    { name: 'Alerts', path: ROUTES.ALERTS, icon: <BellRing size={20} /> },
    { name: 'Donation', path: ROUTES.DONATION, icon: <HeartHandshake size={20} /> },
  ];

  const ngoMenu = [
    { name: 'NGO Dashboard', path: ROUTES.NGO_DASHBOARD, icon: <HandHeart size={20} /> },
    { name: 'Nearby Donations', path: ROUTES.NGO_NEARBY, icon: <MapPin size={20} /> },
    { name: 'Accepted', path: ROUTES.NGO_DASHBOARD, icon: <ClipboardList size={20} /> },
  ];

  const menuItems = role === 'ngo' ? ngoMenu : canteenMenu;

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col h-full z-10 transition-colors duration-300">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
            A
          </div>
          <span className="font-bold text-xl text-gray-800 dark:text-gray-100 tracking-tight">Annapurna AI</span>
        </div>

        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-200'
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
