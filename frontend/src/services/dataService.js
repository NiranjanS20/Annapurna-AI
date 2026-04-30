import api from './api';

const unwrap = (response) => {
  const body = response.data;
  if (body && body.success !== undefined && body.data !== undefined) {
    return body.data;
  }
  return body;
};

// ── Dashboard ────────────────────────────────────────────────────────

export const getDashboardData = async () => {
  try {
    const response = await api.get('/api/analytics');
    return unwrap(response);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return { isEmpty: true };
  }
};

// ── Data Entry ───────────────────────────────────────────────────────

export const postDataEntry = async (data) => {
  try {
    const response = await api.post('/api/data', data);
    const body = response.data;
    return {
      success: body.success ?? true,
      message: body.message || body.error || 'Data logged successfully.',
      data: body.data || null,
      correlation_id: body.correlation_id || null,
    };
  } catch (error) {
    console.error('Error posting data entry:', error);
    const errMsg = error.message || 'Failed to log data. Please try again.';
    return {
      success: false,
      message: errMsg,
      data: null,
      error_code: error.errorCode || null,
      correlation_id: error.correlationId || null,
    };
  }
};

export const uploadBillingCsv = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // CRITICAL: Let axios auto-detect FormData and set multipart boundary
    // The api.js interceptor handles Content-Type deletion for FormData
    const response = await api.post('/api/data/upload-csv', formData, {
      _customTimeout: true,
      timeout: 120000, // 120s for CSV uploads
    });
    const body = response.data;
    
    return {
      success: body.success ?? true,
      message: body.message || 'CSV uploaded successfully.',
      data: body.data || null,
      rows_inserted: body.rows_inserted || 0,
      skipped_duplicates: body.skipped_duplicates || 0,
      skipped_invalid: body.skipped_invalid || 0,
      duration_ms: body.duration_ms || null,
      correlation_id: body.correlation_id || null,
    };
  } catch (error) {
    console.error('Error uploading CSV:', error);
    // api.js interceptor already normalizes into error.message
    const errMsg = error.message || 'Failed to upload CSV.';
    return {
      success: false,
      message: errMsg,
      data: null,
      error_code: error.errorCode || null,
      correlation_id: error.correlationId || null,
    };
  }
};

// ── Menu Items ───────────────────────────────────────────────────────

export const getMenuItems = async () => {
  try {
    const response = await api.get('/api/data/menu-items');
    // If it's a success response struct
    const unwrapped = unwrap(response);
    return { success: true, data: Array.isArray(unwrapped) ? unwrapped : [] };
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return { success: false, data: [] };
  }
};

export const addMenuItem = async (name, category = 'Custom') => {
  try {
    const response = await api.post('/api/data/menu-items/add', { name, category });
    const body = response.data;
    return {
      success: body.success ?? true,
      message: body.message || body.error || 'Menu item created.',
      data: body.data || null,
    };
  } catch (error) {
    console.error('Error creating menu item:', error);
    const errMsg = error.message || 'Failed to create menu item.';
    return { success: false, message: errMsg, data: null };
  }
};

// ── Alerts ───────────────────────────────────────────────────────────

export const getAlerts = async () => {
  try {
    const response = await api.get('/api/alerts');
    return unwrap(response) || [];
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
};

// ── Donations ────────────────────────────────────────────────────────

export const getDonations = async () => {
  try {
    const response = await api.get('/api/donations');
    return unwrap(response) || [];
  } catch (error) {
    console.error('Error fetching donations:', error);
    return [];
  }
};

export const createDonation = async (data) => {
  try {
    const response = await api.post('/api/donations', data);
    const body = response.data;
    return {
      success: body.success ?? true,
      message: body.message || 'Donation created.',
      data: body.data || null,
    };
  } catch (error) {
    console.error('Error creating donation:', error);
    return { success: false, message: error.message || 'Failed to create donation.' };
  }
};

export const markDonation = async (id) => {
  try {
    const response = await api.put(`/api/donations/${id}/mark`);
    const body = response.data;
    return {
      success: body.success ?? true,
      message: body.message || 'Donation marked.',
      data: body.data || null,
    };
  } catch (error) {
    console.error('Error marking donation:', error);
    return { success: false, message: error.message || 'Failed to mark donation.' };
  }
};

export const convertDonationToListing = async (id, payload) => {
  try {
    const response = await api.post(`/api/donations/${id}/convert`, payload);
    const body = response.data;
    return {
      success: body.success ?? true,
      message: body.message || 'Donation converted to listing.',
      data: body.data || null,
    };
  } catch (error) {
    console.error('Error converting donation to listing:', error);
    const errMsg = error.message || 'Failed to convert donation.';
    return { success: false, message: errMsg, data: null };
  }
};

// ── Analytics ────────────────────────────────────────────────────────

export const getAnalyticsData = async () => {
  try {
    const response = await api.get('/api/analytics');
    return unwrap(response);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return { isEmpty: true };
  }
};
