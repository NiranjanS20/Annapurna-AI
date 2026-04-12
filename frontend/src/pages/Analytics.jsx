import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Chart from '../components/Chart';
import { COLORS } from '../utils/constants';
import { getAnalyticsData } from '../services/dataService';
import { Loader2, TrendingUp, BarChart3, Database } from 'lucide-react';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      const result = await getAnalyticsData();
      console.log("Analytics data received:", result);
      setData(result);
      setLoading(false);
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="ml-3 text-gray-500 dark:text-gray-400 text-lg">Loading analytics...</span>
      </div>
    );
  }

  // Check if we have enough data: need at least 1 unique date
  const hasData = data && !data.isEmpty && (data.unique_dates >= 1 || data.record_count > 0);

  if (!hasData) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
         <div className="bg-blue-50 dark:bg-blue-900/30 p-5 rounded-full border border-blue-100 dark:border-blue-800">
           <Database className="text-blue-500 dark:text-blue-400" size={48} />
         </div>
         <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Insufficient Data</h2>
         <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">We need at least one day of operations input into the Data Entry tool to build your analytical trend models.</p>
      </div>
    )
  }

  // Build chart data from the unified backend response
  const demandTrendData = data?.demandTrend?.length > 0
    ? {
        labels: data.demandTrend.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [
          { label: 'Demand (Sold)', data: data.demandTrend.map(d => d.demand), borderColor: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.08)', tension: 0.4, fill: true },
          { label: 'Prepared', data: data.demandTrend.map(d => d.prepared), borderColor: '#F59E0B', backgroundColor: 'transparent', borderDash: [5, 5], fill: false }
        ]
      } : null;

  const wasteByItemData = data?.wasteByItem?.length > 0
    ? {
        labels: data.wasteByItem.map(w => w.item),
        datasets: [{
          label: 'Waste',
          data: data.wasteByItem.map(w => w.waste),
          backgroundColor: ['#DC2626', '#F97316', '#F59E0B', '#2563EB', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'],
          borderRadius: 6,
        }]
      } : null;

  // Waste trend by date
  const wasteTrendData = data?.trends?.length > 0
    ? {
        labels: data.trends.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Daily Waste',
          data: data.trends.map(t => t.waste),
          borderColor: '#DC2626',
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          tension: 0.4,
          fill: true
        }]
      } : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 tracking-tight">
          <BarChart3 className="text-blue-600 dark:text-blue-400" /> Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Historical performance and trends analysis.</p>
      </div>

      {/* Summary KPI Cards */}
      {data.wasteStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="dashboard-card p-5 border-l-4 border-l-blue-500">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Prepared</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.wasteStats.total_prepared}</h3>
          </div>
          <div className="dashboard-card p-5 border-l-4 border-l-red-500">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Waste</p>
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">{data.wasteStats.total_waste}</h3>
          </div>
          <div className="dashboard-card p-5 border-l-4 border-l-amber-500">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Waste Percentage</p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.wasteStats.waste_percentage}%</h3>
          </div>
        </div>
      )}

      {/* Demand vs Prepared — Full Width */}
      <Card title="Demand vs Prepared (Recent)">
        {demandTrendData ? <Chart type="line" data={demandTrendData} /> : <span className="text-gray-400 dark:text-gray-500 text-sm">No trend data available yet.</span>}
      </Card>

      {/* Waste Charts — 2 Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Waste by Item">
          {wasteByItemData ? <Chart type="bar" data={wasteByItemData} /> : <span className="text-gray-400 dark:text-gray-500 text-sm">No item data available yet.</span>}
        </Card>
        <Card title="Daily Waste Trend">
          {wasteTrendData ? <Chart type="line" data={wasteTrendData} /> : <span className="text-gray-400 dark:text-gray-500 text-sm">No waste trend data available yet.</span>}
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
