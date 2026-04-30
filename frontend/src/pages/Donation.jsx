import React, { useState, useEffect } from 'react';
import { Heart, PackageCheck, MapPin, PlusCircle, Loader2 } from 'lucide-react';
import { getMenuItems } from '../services/dataService';
import {
  getDonations,
  convertDonationToListing,
  createDonationListing,
  getDonationListings,
  finalizeDonationListing,
  schedulePickup,
  completeDonation,
} from '../services/donationService';
import { useAuth } from '../context/AuthContext';
import { presetMenuItems } from '../constants/presetMenuItems';
import { NOMINATIM_BASE_URL } from '../utils/mapConfig';
import MapView from '../components/MapView';

const Donation = () => {
  const { backendUser } = useAuth();
  const [surplus, setSurplus] = useState([]);
  const [listings, setListings] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [geoStatus, setGeoStatus] = useState('');
  const [pickupEta, setPickupEta] = useState({});
  const [form, setForm] = useState({
    item_name: '',
    category: '',
    quantity: '',
    unit: 'units',
    pickup_start: '',
    pickup_end: '',
    address: '',
    notes: '',
  });
  const [location, setLocation] = useState(null);

  const COORDS_CACHE_KEY = 'annapurna.pickup.coords';
  const ADDRESS_CACHE_KEY = 'annapurna.pickup.address';

  const readCachedCoords = () => {
    try {
      const raw = localStorage.getItem(COORDS_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const persistCoords = (coords) => {
    try {
      localStorage.setItem(COORDS_CACHE_KEY, JSON.stringify(coords));
    } catch {
      // Ignore cache errors.
    }
  };

  const readCachedAddress = () => {
    try {
      return localStorage.getItem(ADDRESS_CACHE_KEY) || '';
    } catch {
      return '';
    }
  };

  const persistAddress = (address) => {
    if (!address) return;
    try {
      localStorage.setItem(ADDRESS_CACHE_KEY, address);
    } catch {
      // Ignore cache errors.
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data?.display_name || '';
    } catch {
      return '';
    }
  };

  const forwardGeocode = async (query) => {
    if (!query) return null;
    try {
      const response = await fetch(
        `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
    } catch {
      return null;
    }
  };

  const getItemMeta = (name) => {
    const normalized = (name || '').trim().toLowerCase();
    if (!normalized) return { category: '', unit: 'units' };

    const presetMatch = presetMenuItems.find(
      (item) => item.name.trim().toLowerCase() === normalized
    );
    if (presetMatch) {
      return { category: presetMatch.category || '', unit: presetMatch.unit || 'units' };
    }

    const customMatch = menuItems.find(
      (item) => item.item_name?.trim().toLowerCase() === normalized
    );
    return { category: customMatch?.category || '', unit: 'units' };
  };

  useEffect(() => {
    const fetchDonations = async () => {
      const [donationResponse, listingResponse, menuResponse] = await Promise.all([
        getDonations(),
        getDonationListings(),
        getMenuItems(),
      ]);
      console.log("Donations data received:", donationResponse.data || []);
      setSurplus(donationResponse.data || []);
      setListings(listingResponse.data || []);
      setMenuItems(menuResponse.data || []);
      setLoading(false);
    };
    fetchDonations();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const cachedAddress = readCachedAddress();
    if (cachedAddress) {
      setForm((prev) => (prev.address ? prev : { ...prev, address: cachedAddress }));
    }

    const cachedCoords = readCachedCoords();
    if (cachedCoords) {
      setLocation(cachedCoords);
    }

    const applyLocation = async (coords, shouldReverseGeocode) => {
      if (cancelled) return;
      setLocation(coords);
      persistCoords(coords);

      if (shouldReverseGeocode) {
        const resolvedAddress = await reverseGeocode(coords.lat, coords.lng);
        if (resolvedAddress && !cancelled) {
          setForm((prev) => (prev.address ? prev : { ...prev, address: resolvedAddress }));
          persistAddress(resolvedAddress);
        }
      }
    };

    const fallbackFromProfile = async () => {
      if (!backendUser?.location) return;
      const coords = await forwardGeocode(backendUser.location);
      if (coords) {
        await applyLocation(coords, false);
        setForm((prev) => (prev.address ? prev : { ...prev, address: backendUser.location }));
        persistAddress(backendUser.location);
      }
    };

    const handleGeoSuccess = async (position) => {
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setGeoStatus('Using your current location.');
      await applyLocation(coords, true);
    };

    const handleGeoError = async () => {
      setGeoStatus('Using saved location. Update if needed.');
      if (!cachedCoords) {
        await fallbackFromProfile();
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(handleGeoSuccess, handleGeoError, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      });
    } else {
      handleGeoError();
    }

    return () => {
      cancelled = true;
    };
  }, [backendUser]);

  const refreshListings = async () => {
    const listingResponse = await getDonationListings();
    setListings(listingResponse.data || []);
  };

  const handleMark = async (item) => {
    if (saving) return;
    setError('');

    if (!form.pickup_start || !form.pickup_end || !form.address) {
      setError('Pickup window and address are required to publish a listing.');
      return;
    }

    if (new Date(form.pickup_start) >= new Date(form.pickup_end)) {
      setError('"Available Until" must be after "Available From".');
      return;
    }

    if (!location?.lat || !location?.lng) {
      setError('Pickup location is required. Please allow GPS or select on the map.');
      return;
    }

    setSaving(true);
    const meta = getItemMeta(item.item_name);
    const payload = {
      pickup_start: form.pickup_start,
      pickup_end: form.pickup_end,
      address: form.address,
      lat: location.lat,
      lng: location.lng,
      category: meta.category || form.category,
      unit: meta.unit || form.unit,
      notes: form.notes,
    };

    const result = await convertDonationToListing(item.id, payload);
    if (!result.success) {
      setError(result.message || 'Failed to publish listing.');
    } else {
      setSurplus((prev) => prev.map((s) => (s.id === item.id ? { ...s, status: 'picked' } : s)));
      await refreshListings();
    }
    setSaving(false);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return ''; }
  };

  const combinedItemNames = Array.from(
    new Set([
      ...presetMenuItems.map((item) => item.name),
      ...menuItems.map((item) => item.item_name).filter(Boolean),
    ])
  );

  if (loading) {
    return <div className="p-8 text-gray-400 dark:text-gray-500 text-center">Loading donations...</div>;
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (e) => {
    const value = e.target.value;
    const meta = getItemMeta(value);
    setForm((prev) => ({
      ...prev,
      item_name: value,
      category: meta.category,
      unit: meta.unit,
    }));
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (!location?.lat || !location?.lng) {
      setError('Pickup location is required. Please allow GPS or select on the map.');
      setSaving(false);
      return;
    }

    if (new Date(form.pickup_start) >= new Date(form.pickup_end)) {
      setError('"Available Until" must be after "Available From".');
      setSaving(false);
      return;
    }

    try {
      const result = await createDonationListing({
        ...form,
        quantity: Number(form.quantity),
        lat: location?.lat,
        lng: location?.lng,
        status: 'available',
      });
      if (!result.success) {
        setError(result.message || 'Failed to create listing.');
        return;
      }
      setForm({
        item_name: '',
        category: '',
        quantity: '',
        unit: 'units',
        pickup_start: '',
        pickup_end: '',
        address: '',
        notes: '',
      });
      await refreshListings();
    } catch (err) {
      setError(err.message || 'Failed to create listing.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeDraft = async (listingId) => {
    setSaving(true);
    setError('');
    if (!location?.lat || !location?.lng) {
      setError('Pickup location is required. Please allow GPS or select on the map.');
      setSaving(false);
      return;
    }
    if (new Date(form.pickup_start) >= new Date(form.pickup_end)) {
      setError('"Available Until" must be after "Available From".');
      setSaving(false);
      return;
    }
    try {
      const result = await finalizeDonationListing(listingId, {
        pickup_start: form.pickup_start,
        pickup_end: form.pickup_end,
        lat: location?.lat,
        lng: location?.lng,
        address: form.address,
        notes: form.notes,
      });
      if (!result.success) {
        setError(result.message || 'Failed to finalize listing.');
        return;
      }
      await refreshListings();
    } catch (err) {
      setError(err.message || 'Failed to finalize listing.');
    } finally {
      setSaving(false);
    }
  };

  const handleSchedulePickup = async (listingId) => {
    try {
      const result = await schedulePickup(listingId, pickupEta[listingId]);
      if (!result.success) {
        setError(result.message || 'Failed to schedule pickup.');
        return;
      }
      await refreshListings();
    } catch (err) {
      setError(err.message || 'Failed to schedule pickup.');
    }
  };

  const handleComplete = async (listingId) => {
    try {
      const result = await completeDonation(listingId);
      if (!result.success) {
        setError(result.message || 'Failed to complete listing.');
        return;
      }
      await refreshListings();
    } catch (err) {
      setError(err.message || 'Failed to complete listing.');
    }
  };

  const handleLocationSelect = async (latlng) => {
    setLocation(latlng);
    persistCoords(latlng);
    const resolvedAddress = await reverseGeocode(latlng.lat, latlng.lng);
    if (resolvedAddress) {
      setForm((prev) => ({ ...prev, address: resolvedAddress }));
      persistAddress(resolvedAddress);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 tracking-tight">
          <Heart className="text-blue-600 dark:text-blue-400" /> Food Donation
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Manage surplus food and connect with local charities.</p>
      </div>

      {/* Create Listing */}
      <div className="dashboard-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <PlusCircle className="text-blue-600" size={18} />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Create Donation Listing</h2>
        </div>
        <form onSubmit={handleCreateListing} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <input
                list="menu-items"
                name="item_name"
                value={form.item_name}
                onChange={handleItemChange}
                className="dash-input"
                placeholder="Item name"
                required
              />
              <datalist id="menu-items">
                {combinedItemNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <input name="category" value={form.category} onChange={handleFormChange} className="dash-input" placeholder="Category" />
            <div className="grid grid-cols-2 gap-2">
              <input name="quantity" type="number" min="0" value={form.quantity} onChange={handleFormChange} className="dash-input" placeholder="Quantity" required />
              <input name="unit" value={form.unit} onChange={handleFormChange} className="dash-input" placeholder="Unit (kg, plates, etc.)" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Available From</label>
                <input
                  name="pickup_start"
                  type="datetime-local"
                  value={form.pickup_start}
                  onChange={handleFormChange}
                  className="dash-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Available Until</label>
                <input
                  name="pickup_end"
                  type="datetime-local"
                  value={form.pickup_end}
                  onChange={handleFormChange}
                  className="dash-input"
                  required
                />
              </div>
            </div>
            <input name="address" value={form.address} onChange={handleFormChange} className="dash-input" placeholder="Pickup address" required />
            <textarea name="notes" value={form.notes} onChange={handleFormChange} className="dash-input min-h-[90px]" placeholder="Notes for NGO (optional)" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Visibility: NGOs see listings based on their service radius.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : <PlusCircle size={18} />}
              Publish Listing
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <MapPin size={16} />
              <span className="text-sm font-medium">Pickup Location</span>
            </div>
            <MapView
              center={location || undefined}
              selectable
              markers={location ? [{ id: 'pickup', lat: location.lat, lng: location.lng, label: 'Pickup' }] : []}
              onSelect={handleLocationSelect}
              height="300px"
            />
            {geoStatus && <p className="text-xs text-gray-500 dark:text-gray-400">{geoStatus}</p>}
          </div>
        </form>
      </div>

      {/* Listing Status Tracker */}
      <div className="dashboard-card p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Donation Listings</h2>
        {listings.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No listings yet.</p>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => (
              <div key={listing.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">{listing.item_name}</h3>
                    <p className="text-sm text-gray-500">{listing.quantity} {listing.unit} • Status: {listing.status}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {listing.status === 'draft' && (
                      <button className="btn-outline" onClick={() => handleFinalizeDraft(listing.id)} disabled={saving}>
                        Finalize Draft
                      </button>
                    )}
                    {listing.status === 'accepted' && (
                      <div className="flex gap-2">
                        <input
                          type="datetime-local"
                          className="dash-input"
                          value={pickupEta[listing.id] || ''}
                          onChange={(e) => setPickupEta((prev) => ({ ...prev, [listing.id]: e.target.value }))}
                        />
                        <button className="btn-primary" onClick={() => handleSchedulePickup(listing.id)}>Schedule</button>
                      </div>
                    )}
                    {listing.status === 'pickup_scheduled' && (
                      <button className="btn-primary" onClick={() => handleComplete(listing.id)}>Mark Completed</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Legacy Surplus</h2>
        {surplus.map((item) => {
          const isPicked = item.status === 'picked';
          return (
            <div key={item.id} className={`dashboard-card p-5 flex flex-col sm:flex-row items-center justify-between border-l-4 ${isPicked ? 'border-l-gray-300 dark:border-l-gray-600 opacity-60' : 'border-l-blue-600'}`}>
              <div className="flex-1 w-full text-center sm:text-left mb-4 sm:mb-0">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{item.item_name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Quantity: <span className="font-semibold text-gray-700 dark:text-gray-200">{item.quantity}</span> • {formatTime(item.created_at)}</p>
              </div>
              
              <button
                onClick={() => handleMark(item)}
                disabled={isPicked || saving}
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
