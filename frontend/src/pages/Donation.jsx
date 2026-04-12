import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { Heart, PackageCheck } from 'lucide-react';
import { getDonations, markDonation } from '../services/dataService';

const Donation = () => {
  const [surplus, setSurplus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      const data = await getDonations();
      console.log("Donations data received:", data);
      setSurplus(data);
      setLoading(false);
    };
    fetchDonations();
  }, []);

  const handleMark = async (id) => {
    // Optimistic UI update
    setSurplus(surplus.map(s => s.id === id ? { ...s, status: 'picked' } : s));
    
    // Call backend
    const result = await markDonation(id);
    if (!result.success) {
      // Revert on failure
      setSurplus(surplus.map(s => s.id === id ? { ...s, status: 'available' } : s));
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return ''; }
  };

  if (loading) {
    return <div className="p-8 text-gray-400 dark:text-gray-500 text-center">Loading donations...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 tracking-tight">
          <Heart className="text-blue-600 dark:text-blue-400" /> Food Donation
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Manage surplus food and connect with local charities.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {surplus.map((item) => {
          const isPicked = item.status === 'picked';
          return (
            <div key={item.id} className={`dashboard-card p-5 flex flex-col sm:flex-row items-center justify-between border-l-4 ${isPicked ? 'border-l-gray-300 dark:border-l-gray-600 opacity-60' : 'border-l-blue-600'}`}>
              <div className="flex-1 w-full text-center sm:text-left mb-4 sm:mb-0">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{item.item_name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Quantity: <span className="font-semibold text-gray-700 dark:text-gray-200">{item.quantity}</span> • {formatTime(item.created_at)}</p>
              </div>
              
              <button
                onClick={() => handleMark(item.id)}
                disabled={isPicked}
                className={`w-full sm:w-auto px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                  isPicked 
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-600' 
                  : 'btn-primary'
                }`}
              >
                {isPicked ? (
                  <>
                    <PackageCheck size={18} /> Marked for Pickup
                  </>
                ) : (
                  <>
                    Mark for Donation
                  </>
                )}
              </button>
            </div>
          );
        })}
        {surplus.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed">
            No surplus food available for donation.
          </div>
        )}
      </div>
    </div>
  );
};

export default Donation;
