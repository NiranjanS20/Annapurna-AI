import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { getPrediction, getFoodItems } from '../services/predictionService';
import { Sparkles, BrainCircuit, ArrowRight, Loader2, ShieldCheck, Info, Calendar } from 'lucide-react';
import { presetMenuItems } from '../constants/presetMenuItems';
import { getItemUnit } from '../utils/getItemUnit';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const Prediction = () => {
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    // Set default day to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayName = DAYS_OF_WEEK[tomorrow.getDay() === 0 ? 6 : tomorrow.getDay() - 1];
    setSelectedDay(dayName);

    fetchItems();
  }, []);

  const fetchItems = async () => {
    const res = await getFoodItems();
    console.log("Food items for prediction dropdown:", res);
    if (res.success && res.data.length > 0) {
      setFoodItems(res.data);
    }
  };

  const presetNames = presetMenuItems.map(i => i.name);
  const mergedItems = Array.from(
    new Set([...(foodItems.map(i => i.item_name)), ...presetNames])
  ).sort();

  const handlePredict = async () => {
    if (!selectedItem) return;
    setLoading(true);
    setPrediction(null);

    const data = await getPrediction(selectedItem, selectedDay);
    console.log("Prediction result:", data);
    
    // Patch unit using frontend helper
    if (data && data.hasData) {
      data.unit = getItemUnit(selectedItem);
    }

    setPrediction(data);
    setLoading(false);
  };

  const getConfidenceColor = (conf) => {
    if (conf >= 80) return { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' };
    if (conf >= 60) return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' };
    return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 tracking-tight">
          <BrainCircuit className="text-blue-600 dark:text-blue-400" /> Smart Prediction
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Leverage AI to predict tomorrow's demand and minimize waste.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="dashboard-card p-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 tracking-tight mb-4">Select Item</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Food Item</label>
              <input 
                type="text"
                list="predict-item-list"
                className="dash-input"
                placeholder="Type or select a food item..."
                value={selectedItem}
                onChange={(e) => { setSelectedItem(e.target.value); setPrediction(null); }}
              />
              <datalist id="predict-item-list">
                {mergedItems.map(item => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                <Calendar size={14} className="text-gray-500 dark:text-gray-400" /> Day of Week
              </label>
              <select
                className="dash-select w-full"
                value={selectedDay}
                onChange={(e) => { setSelectedDay(e.target.value); setPrediction(null); }}
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handlePredict}
              disabled={!selectedItem || loading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Analyzing Data...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Predict Demand
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Panel */}
        <div className="dashboard-card p-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 tracking-tight mb-4">Results</h3>
          {!prediction ? (
            <div className="h-[200px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              Select an item and run prediction
            </div>
          ) : prediction.hasData === false ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-center space-y-3 border-2 border-dashed border-amber-200 dark:border-amber-800 rounded-xl p-4 bg-amber-50 dark:bg-amber-900/20">
              <Info className="text-amber-500 dark:text-amber-400" size={32} />
              <p className="text-amber-700 dark:text-amber-300 font-medium">Not Enough Data</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{prediction.explanation}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Prediction numbers */}
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Predicted Demand</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{prediction.predictedDemand} <span className="text-lg font-normal text-gray-400 dark:text-gray-500">{prediction.unit}</span></h3>
                </div>
                <ArrowRight className="text-blue-300 dark:text-blue-600 mx-2" size={24} />
                <div className="text-right">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Recommended to Prep</p>
                  <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">{prediction.recommendedQty} <span className="text-lg font-normal text-gray-400 dark:text-gray-500">{prediction.unit}</span></h3>
                </div>
              </div>

              {/* Confidence badge */}
              {prediction.confidence !== undefined && (
                <div className={`flex items-center gap-2 p-3 ${getConfidenceColor(prediction.confidence).bg} border ${getConfidenceColor(prediction.confidence).border} rounded-xl`}>
                  <ShieldCheck size={18} className={getConfidenceColor(prediction.confidence).text} />
                  <span className={`text-sm font-medium ${getConfidenceColor(prediction.confidence).text}`}>
                    Confidence: {prediction.confidence}%
                  </span>
                </div>
              )}
              
              {/* AI Insight */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                  <Sparkles size={14} /> AI Insight
                </p>
                <p className="text-gray-600 dark:text-gray-300 mt-1">{prediction.alertMessage}</p>
              </div>

              {/* Explanation */}
              {prediction.explanation && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                    <Info size={14} /> Explanation
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{prediction.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Prediction;
