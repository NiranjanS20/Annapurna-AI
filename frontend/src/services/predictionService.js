import api from './api';

/**
 * Fetch distinct food items from food_data for dropdown.
 */
export const getFoodItems = async () => {
  try {
    const response = await api.get('/api/predictions/items');
    const body = response.data;
    console.log("Prediction items response:", body);

    if (body.success && Array.isArray(body.data)) {
      return { success: true, data: body.data };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error fetching food items:', error);
    return { success: false, data: [] };
  }
};

/**
 * Get prediction for an item + day_of_week.
 */
export const getPrediction = async (item_name, day_of_week) => {
  try {
    const params = { item_name };
    if (day_of_week) {
      params.day_of_week = day_of_week;
    }

    console.log("Prediction request params:", params);
    const response = await api.get('/api/predict', { params });

    // Backend returns: { success, data: { prediction, alerts, message, alert_message } }
    const result = response.data;
    console.log("Prediction response:", result);

    if (result.success && result.data && result.data.prediction) {
      const pred = result.data.prediction;
      const alerts = result.data.alerts || [];
      const unit = pred.unit || 'units';

      return {
        predictedDemand: pred.predicted_demand,
        recommendedQty: pred.recommended_qty,
        confidence: pred.confidence_score || 0,
        unit: unit,
        dayOfWeek: pred.day_of_week,
        alertMessage: result.data.alert_message || (alerts.length > 0 ? alerts[0].message : "Normal demand expected."),
        explanation: result.data.message || 'Based on historical averages and demand ML modeling.',
        hasData: pred.predicted_demand > 0,
      };
    }

    return result.data || result;
  } catch (error) {
    console.error('Error fetching prediction:', error);
    return {
      predictedDemand: 0,
      recommendedQty: 0,
      confidence: 0,
      unit: 'units',
      alertMessage: 'Could not fetch prediction. Please check your connection.',
      explanation: 'The prediction service is currently unavailable.',
      hasData: false,
    };
  }
};
