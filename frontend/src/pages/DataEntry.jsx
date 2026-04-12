import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { CheckCircle2, AlertCircle, Loader2, Plus, Upload } from 'lucide-react';
import { postDataEntry, getMenuItems, addMenuItem, uploadBillingCsv } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { presetMenuItems } from '../constants/presetMenuItems';
import { getItemUnit } from '../utils/getItemUnit';

const UNITS = ['units', 'plates', 'pieces', 'kg', 'liters', 'grams', 'ml'];

const DataEntry = () => {
  const { backendUser } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  
  const [formData, setFormData] = useState({
    itemType: '',
    preparedQty: '',
    preparedUnit: 'units',
    soldQty: '',
    soldUnit: 'units' // usually matches but we let user decide
  });
  
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Custom item modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // CSV Upload State
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    const res = await getMenuItems();
    if (res.success) {
      setMenuItems(res.data);
    }
  };

  const handleMenuChange = (e) => {
    const val = e.target.value;
    if (val === 'ADD_NEW') {
      setShowCustomModal(true);
      setFormData({...formData, itemType: ''});
    } else {
      const unit = getItemUnit(val);
      setFormData({
        ...formData, 
        itemType: val,
        preparedUnit: unit,
        soldUnit: unit
      });
    }
  };

  const presetNames = presetMenuItems.map(i => i.name);
  const mergedItems = Array.from(
    new Set([...(menuItems.map(i => i.item_name)), ...presetNames])
  ).sort();

  const handleCustomItemSubmit = async (e) => {
    e.preventDefault();
    if (!customItemName) return;
    setIsAddingItem(true);
    
    const res = await addMenuItem(customItemName);
    setIsAddingItem(false);
    
    if (res.success) {
      await fetchMenu();
      setFormData({...formData, itemType: res.data.item_name}); // Automatically select the new item
      setShowCustomModal(false);
      setCustomItemName('');
    } else {
      setError(res.message || "Failed to create custom item.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemType || !formData.preparedQty || !formData.soldQty) return;
    
    setLoading(true);
    setError(null);
    setStatus(null);

    // BLOCK if not fully synced
    if (!backendUser || !backendUser.id) {
      setError('System Error: User sync incomplete. Please refresh or re-login.');
      setLoading(false);
      return;
    }

    const now = new Date();
    const log_date = now.toISOString().split('T')[0];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day_of_week = days[now.getDay()];

    const preparedQty = Number(formData.preparedQty);
    const soldQty = Number(formData.soldQty);
    const wasteQty = Math.max(0, preparedQty - soldQty);

    const normalizedItem = formData.itemType.trim();

    const payload = {
      date: log_date,
      day_of_week: day_of_week,
      item_name: normalizedItem,
      meal_type: 'Lunch',
      prepared_qty: preparedQty,
      sold_qty: soldQty,
      waste_qty: wasteQty
    };

    console.log("Incoming data (frontend payload):", payload);

    const res = await postDataEntry(payload);
    setLoading(false);

    if (res.success) {
      setStatus(res.message || 'Success! Data recorded.');
      setFormData({ 
        itemType: formData.itemType, // Keep the item selected for rapid entries
        preparedQty: '', 
        preparedUnit: formData.preparedUnit,
        soldQty: '',
        soldUnit: formData.soldUnit
      });
      setTimeout(() => setStatus(null), 4000);
    } else {
      setError(res.message || 'Failed to log data. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadLoading(true);
    setUploadError(null);
    setUploadStatus(null);

    const res = await uploadBillingCsv(selectedFile);
    setUploadLoading(false);

    if (res.success) {
      setUploadStatus(res.message);
      setSelectedFile(null);
      document.getElementById('csv-file-input').value = '';
      await fetchMenu(); // Refresh menu items in case new items were added
      setTimeout(() => setUploadStatus(null), 5000);
    } else {
      setUploadError(res.message);
      setTimeout(() => setUploadError(null), 7000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Quick Data Entry</h1>
        <p className="text-gray-500 dark:text-gray-400">Record prepared and sold quantities to track waste.</p>
      </div>

      {/* CSV Upload Card */}
      <div className="dashboard-card p-6 border-l-4 border-l-indigo-500">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
          <Upload size={20} className="text-indigo-500" />
          Import from Billing System
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Upload a CSV file. <br />
          <span className="font-semibold">Required columns:</span> <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">date, item_name, quantity_sold</code><br />
          <span className="font-semibold text-xs">Optional columns:</span> <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">prepared_qty</code>
        </p>
        <form onSubmit={handleFileUpload} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <input 
            type="file" 
            id="csv-file-input"
            accept=".csv"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100
              dark:file:bg-indigo-900/30 dark:file:text-indigo-400 dark:hover:file:bg-indigo-800/50
              cursor-pointer"
          />
          <button 
            type="submit" 
            disabled={!selectedFile || uploadLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploadLoading ? <Loader2 className="animate-spin" size={18} /> : null}
            Upload CSV
          </button>
        </form>
        
        {/* Upload Status */}
        {uploadStatus && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2 text-sm">
            <CheckCircle2 size={16} />
            <span className="font-medium">{uploadStatus}</span>
          </div>
        )}
        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} />
            <span className="font-medium">{uploadError}</span>
          </div>
        )}
      </div>

      {/* Custom Item Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-xl w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Add Custom Menu Item</h3>
            <form onSubmit={handleCustomItemSubmit}>
              <input 
                type="text" 
                required
                autoFocus
                placeholder="e.g. Special Vegan Burger"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                className="dash-input mb-4"
              />
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isAddingItem}
                  className="btn-primary px-6 py-2 flex items-center gap-2"
                >
                  {isAddingItem ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Data Entry Form Card */}
      <div className="dashboard-card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Item Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Item Type</label>
            <input 
              type="text"
              list="menu-item-list"
              className="dash-input"
              placeholder="Type or select a food item..."
              value={formData.itemType}
              onChange={handleMenuChange}
              required
            />
            <datalist id="menu-item-list">
              {mergedItems.map(item => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          {/* Quantity Inputs — 2 Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prepared Quantity</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  className="dash-input w-2/3"
                  placeholder="e.g. 100"
                  value={formData.preparedQty}
                  onChange={(e) => setFormData({...formData, preparedQty: e.target.value})}
                  required
                />
                <select 
                  className="dash-select w-1/3"
                  value={formData.preparedUnit}
                  onChange={(e) => setFormData({...formData, preparedUnit: e.target.value})}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sold Quantity</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  className="dash-input w-2/3"
                  placeholder="e.g. 85"
                  value={formData.soldQty}
                  onChange={(e) => setFormData({...formData, soldQty: e.target.value})}
                  required
                />
                 <select 
                  className="dash-select w-1/3"
                  value={formData.soldUnit}
                  onChange={(e) => setFormData({...formData, soldUnit: e.target.value})}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary text-lg py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Submitting...
              </>
            ) : (
              'Submit Entry'
            )}
          </button>
        </form>

        {/* Status Messages */}
        {status && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={20} />
            <span className="font-medium">{status}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} />
            <span className="font-medium">{error}</span>
          </div>
        )}
      </div>
      
      {/* Estimated Waste Preview */}
      {(formData.preparedQty && formData.soldQty && formData.preparedUnit === formData.soldUnit) ? (
        <div className="dashboard-card p-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Estimated Waste: <span className="font-bold text-red-600 dark:text-red-400">{Math.max(0, formData.preparedQty - formData.soldQty).toFixed(2)} {formData.preparedUnit}</span>
        </div>
      ) : null}
      
    </div>
  );
};

export default DataEntry;
