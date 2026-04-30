import React, { useState, useEffect } from 'react';
import { Heart, PackageCheck, MapPin, PlusCircle, Loader2 } from 'lucide-react';
import { getDonations, markDonation } from '../services/dataService';
import { createDonationListing, getDonationListings, finalizeDonationListing, schedulePickup, completeDonation } from '../services/donationService';
import MapView from '../components/MapView';

const Donation = () => {
  const [surplus, setSurplus] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pickupEta, setPickupEta] = useState({});
  const [form, setForm] = useState({
    item_name: '',
    category: '',
    quantity: '',
    unit: 'units',
    pickup_start: '',
    pickup_end: '',
    address: '',
  });
  const [location, setLocation] = useState({ lat: 28.6139, lng: 77.2090 });

  useEffect(() => {
    const fetchDonations = async () => {
      const data = await getDonations();
      const listingData = await getDonationListings().catch(() => []);
      console.log("Donations data received:", data);
      setSurplus(data);
      setListings(listingData);
      setLoading(false);
    };
    fetchDonations();
  }, []);

  const refreshListings = async () => {
    const listingData = await getDonationListings().catch(() => []);
    setListings(listingData);
  };

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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await createDonationListing({
        ...form,
        quantity: Number(form.quantity),
        lat: location.lat,
        lng: location.lng,
      });
      setForm({
        item_name: '',
        category: '',
        quantity: '',
        unit: 'units',
        pickup_start: '',
        pickup_end: '',
        address: '',
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
    try {
      await finalizeDonationListing(listingId, {
        pickup_start: form.pickup_start,
        pickup_end: form.pickup_end,
        lat: location.lat,
        lng: location.lng,
        address: form.address,
      });
      await refreshListings();
    } catch (err) {
      setError(err.message || 'Failed to finalize listing.');
    } finally {
      setSaving(false);
    }
  };

  const handleSchedulePickup = async (listingId) => {
    try {
      await schedulePickup(listingId, pickupEta[listingId]);
      await refreshListings();
    } catch (err) {
      setError(err.message || 'Failed to schedule pickup.');
    }
  };

  const handleComplete = async (listingId) => {
    try {
      await completeDonation(listingId);
      await refreshListings();
    } catch (err) {
      setError(err.message || 'Failed to complete listing.');
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
            <input name="item_name" value={form.item_name} onChange={handleFormChange} className="dash-input" placeholder="Item name" required />
            <input name="category" value={form.category} onChange={handleFormChange} className="dash-input" placeholder="Category (optional)" />
            <div className="grid grid-cols-2 gap-2">
              <input name="quantity" type="number" min="0" value={form.quantity} onChange={handleFormChange} className="dash-input" placeholder="Quantity" required />
              <input name="unit" value={form.unit} onChange={handleFormChange} className="dash-input" placeholder="Unit (kg, plates, etc.)" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input name="pickup_start" type="datetime-local" value={form.pickup_start} onChange={handleFormChange} className="dash-input" required />
              <input name="pickup_end" type="datetime-local" value={form.pickup_end} onChange={handleFormChange} className="dash-input" required />
            </div>
            <input name="address" value={form.address} onChange={handleFormChange} className="dash-input" placeholder="Pickup address" required />
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
              center={location}
              selectable
              markers={[{ id: 'pickup', lat: location.lat, lng: location.lng, label: 'Pickup' }]}
              onSelect={(latlng) => setLocation(latlng)}
              height="300px"
            />
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
