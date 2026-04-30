import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, RefreshCw, Loader2, HandHeart } from 'lucide-react';
import MapView from '../components/MapView';
import { getNgoNearbyDonations, acceptDonation, getNgoProfile } from '../services/donationService';
import { ROUTES } from '../utils/constants';

const NGONearby = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  const loadNearby = async () => {
    setLoading(true);
    try {
      const profile = await getNgoProfile();
      if (!profile) {
        navigate(ROUTES.NGO_ONBOARDING, { replace: true });
        setLoading(false);
        return;
      }
      const results = await getNgoNearbyDonations();
      setDonations(results);
    } catch (err) {
      console.warn('Failed to load nearby donations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNearby();
  }, [navigate]);

  const handleAccept = async (id) => {
    setAcceptingId(id);
    try {
      const key = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${id}`;
      await acceptDonation(id, key);
      await loadNearby();
    } catch (err) {
      console.warn('Accept failed', err);
    } finally {
      setAcceptingId(null);
    }
  };

  const markers = donations
    .filter((d) => d.lat && d.lng)
    .map((d) => ({ id: d.id, lat: Number(d.lat), lng: Number(d.lng), label: d.item_name }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Nearby Donations</h1>
          <p className="text-gray-500 dark:text-gray-400">Live opportunities within your service radius.</p>
        </div>
        <button onClick={loadNearby} className="btn-outline flex items-center gap-2">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dashboard-card p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-blue-600" size={28} />
            </div>
          ) : donations.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No nearby donations right now.</p>
          ) : (
            <div className="space-y-4">
              {donations.map((donation) => (
                <div key={donation.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">{donation.item_name}</h3>
                      <p className="text-sm text-gray-500">
                        {donation.quantity} {donation.unit} • {donation.distance_km} km away
                        {donation.eta_minutes ? ` • ${donation.eta_minutes} min ETA` : ''}
                      </p>
                      <p className="text-xs text-gray-400">Pickup: {donation.pickup_start?.slice(11, 16)} - {donation.pickup_end?.slice(11, 16)}</p>
                    </div>
                    <button
                      className="btn-primary flex items-center gap-2"
                      onClick={() => handleAccept(donation.id)}
                      disabled={acceptingId === donation.id}
                    >
                      {acceptingId === donation.id ? <Loader2 className="animate-spin" size={16} /> : <HandHeart size={16} />}
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <MapPin size={18} />
            <h2 className="text-lg font-semibold">Map View</h2>
          </div>
          <MapView markers={markers} height="360px" />
        </div>
      </div>
    </div>
  );
};

export default NGONearby;
