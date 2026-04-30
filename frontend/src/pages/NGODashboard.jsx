import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, MapPin, Loader2 } from 'lucide-react';
import MapView from '../components/MapView';
import { getNgoProfile, getNgoAcceptedDonations } from '../services/donationService';
import { ROUTES } from '../utils/constants';

const NGODashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [accepted, setAccepted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const ngoProfile = await getNgoProfile();
        if (!ngoProfile) {
          navigate(ROUTES.NGO_ONBOARDING, { replace: true });
          return;
        }
        const acceptedList = await getNgoAcceptedDonations();
        setProfile(ngoProfile);
        setAccepted(acceptedList);
      } catch (err) {
        console.warn('NGO dashboard load failed', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="ml-3 text-gray-500 dark:text-gray-400 text-lg">Loading NGO dashboard...</span>
      </div>
    );
  }

  const markers = accepted
    .map((item) => item.listing)
    .filter(Boolean)
    .map((listing) => ({
      id: listing.id,
      lat: Number(listing.lat),
      lng: Number(listing.lng),
      label: listing.item_name,
    }))
    .filter((m) => m.lat && m.lng);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">NGO Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {profile?.ngo_name ? `${profile.ngo_name} • ` : ''}Track your accepted donations and pickup activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dashboard-card p-5 border-l-4 border-l-green-500">
          <p className="text-sm text-gray-500">Accepted Donations</p>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{accepted.length}</h3>
        </div>
        <div className="dashboard-card p-5 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-500">Service Radius</p>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{profile?.service_radius_km || 0} km</h3>
        </div>
        <div className="dashboard-card p-5 border-l-4 border-l-amber-500">
          <p className="text-sm text-gray-500">Status</p>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{profile?.is_active ? 'Active' : 'Inactive'}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={18} className="text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Accepted Listings</h2>
          </div>
          {accepted.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No accepted donations yet.</p>
          ) : (
            <div className="space-y-3">
              {accepted.map((entry) => (
                <div key={entry.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{entry.listing?.item_name || 'Donation'}</p>
                  <p className="text-sm text-gray-500">Status: {entry.status}</p>
                  <p className="text-sm text-gray-500">Accepted: {entry.accepted_at?.slice(0, 16).replace('T', ' ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <MapPin size={18} />
            <h2 className="text-lg font-semibold">Pickup Map</h2>
          </div>
          <MapView
            center={profile ? { lat: profile.base_lat, lng: profile.base_lng } : undefined}
            markers={markers}
            height="360px"
          />
        </div>
      </div>
    </div>
  );
};

export default NGODashboard;
