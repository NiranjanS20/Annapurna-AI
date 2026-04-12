import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { getAlerts } from '../services/dataService';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      const data = await getAlerts();
      console.log("Alerts data received:", data);
      setAlerts(data);
    };
    fetchAlerts();
  }, []);

  const getAlertStyle = (severity) => {
    switch(severity) {
      case 'critical': 
        return { 
          bg: 'bg-red-50 dark:bg-red-900/20', 
          border: 'border-red-200 dark:border-red-800', 
          icon: <AlertCircle className="text-red-500 dark:text-red-400" />, 
          text: 'text-red-700 dark:text-red-300',
          badge: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300'
        };
      case 'warning': 
        return { 
          bg: 'bg-amber-50 dark:bg-amber-900/20', 
          border: 'border-amber-200 dark:border-amber-800', 
          icon: <AlertTriangle className="text-amber-500 dark:text-amber-400" />, 
          text: 'text-amber-700 dark:text-amber-300',
          badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300'
        };
      case 'info': 
      default:
        return { 
          bg: 'bg-blue-50 dark:bg-blue-900/20', 
          border: 'border-blue-200 dark:border-blue-800', 
          icon: <Info className="text-blue-500 dark:text-blue-400" />, 
          text: 'text-blue-700 dark:text-blue-300',
          badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
        };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch { return dateStr; }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">System Alerts</h1>
        <p className="text-gray-500 dark:text-gray-400">Real-time notifications for operations.</p>
      </div>

      <div className="dashboard-card overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500">No active alerts. All good!</div>
          ) : (
            alerts.map((alert) => {
              const style = getAlertStyle(alert.severity);
              return (
                <div key={alert.id} className={`p-5 flex gap-4 ${style.bg} hover:brightness-[0.98] dark:hover:brightness-110 transition-all`}>
                  <div className="mt-0.5">{style.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-3">
                      <h3 className={`font-semibold ${style.text}`}>
                        {alert.item_name || alert.alert_type}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>{alert.alert_type}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{formatDate(alert.date)}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">{alert.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Alerts;
