import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Save, Loader2 } from 'lucide-react';
import MapView from '../components/MapView';
import { getNgoProfile, saveNgoProfile } from '../services/donationService';
import { NOMINATIM_BASE_URL } from '../utils/mapConfig';
import { ROUTES } from '../utils/constants';

const NGOOnboarding = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    ngo_name: '',
    phone: '',
    email: '',
    address: '',
    service_radius_km: 8,
  });
  const [location, setLocation] = useState({ lat: 28.6139, lng: 77.2090 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const existing = await getNgoProfile();
        if (existing) {
          navigate(ROUTES.NGO_DASHBOARD, { replace: true });
        }
      } catch {
        // Ignore missing profile
      }
    };
    checkProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async () => {
    if (!form.address) return;
    try {
      const url = `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(form.address)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.length > 0) {
        const hit = data[0];
        setLocation({ lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) });
      }
    } catch (err) {
      console.warn('Geocode failed', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await saveNgoProfile({
        ...form,
        service_radius_km: Number(form.service_radius_km),
        base_lat: location.lat,
        base_lng: location.lng,
      });
      navigate(ROUTES.NGO_DASHBOARD);
    } catch (err) {
      setError(err.message || 'Failed to save NGO profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">NGO Onboarding</h1>
        <p className="text-gray-500 dark:text-gray-400">Set your service radius and base location to receive nearby donations.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dashboard-card p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">NGO Name</label>
            <input name="ngo_name" value={form.ngo_name} onChange={handleChange} className="dash-input" required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} className="dash-input" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Email</label>
            <input name="email" value={form.email} onChange={handleChange} className="dash-input" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Address</label>
            <div className="flex gap-2">
              <input name="address" value={form.address} onChange={handleChange} className="dash-input" />
              <button type="button" onClick={handleSearch} className="btn-outline px-3">Search</button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Service Radius (km)</label>
            <input name="service_radius_km" type="number" min="1" value={form.service_radius_km} onChange={handleChange} className="dash-input" />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button type="submit" className="btn-primary flex items-center gap-2 justify-center" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save NGO Profile
          </button>
        </div>

        <div className="dashboard-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <MapPin size={18} />
            <h2 className="font-semibold">Base Location</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Click the map to set your base location.</p>
          <MapView
            center={location}
            selectable
            markers={[{ id: 'ngo-base', lat: location.lat, lng: location.lng, label: 'NGO Base' }]}
            onSelect={(latlng) => setLocation(latlng)}
            height="360px"
          />
        </div>
      </form>
    </div>
  );
};

export default NGOOnboarding;
