import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Chart from '../components/Chart';
import { getDashboardData, getAnalyticsData } from '../services/dataService';
import { TrendingDown, TrendingUp, AlertTriangle, Package, Loader2, Sparkles } from 'lucide-react';
import { COLORS, ROUTES } from '../utils/constants';
import NotificationBell from '../components/NotificationBell';
import AlertToast from '../components/AlertToast';
import { useNotifications } from '../hooks/useNotifications';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [chartsLoading, setChartsLoading] = useState(true);
  const notificationState = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const result = await getDashboardData();
      console.log("Dashboard data received:", result);
      setData(result);
      
      if (result && !result.isEmpty) {
        fetchCharts();
      } else {
        setChartsLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchCharts = async () => {
    setChartsLoading(true);
    try {
      const analytics = await getAnalyticsData();
      console.log("Chart data received:", analytics);
      setChartData(analytics);
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
    setChartsLoading(false);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="ml-3 text-gray-500 dark:text-gray-400 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  // --- EMPTY STATE UI ---
  if (data.isEmpty) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-full border border-blue-100 dark:border-blue-800">
          <Sparkles className="text-blue-600 dark:text-blue-400" size={48} />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-tight text-center">Welcome to Annapurna AI</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg text-center max-w-md">
          Start by adding your first food entry to begin predictions. We'll analyze your daily operations and help cut down food waste efficiently.
        </p>
        <button 
          onClick={() => navigate(ROUTES.DATA_ENTRY)}
          className="btn-primary px-6 py-3 text-base"
        >
          Add Your First Log
        </button>
      </div>
    );
  }

  // Build chart datasets from analytics data
  const demandTrendData = (chartData?.trends?.length > 0 || chartData?.demandTrend?.length > 0)
    ? {
        labels: (chartData.demandTrend || chartData.trends || []).map(d => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })),
        datasets: [
          ...(chartData.demandTrend ? [
            { label: 'Sold/Demand', data: chartData.demandTrend.map(d => d.demand), borderColor: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.08)', fill: true },
            { label: 'Prepared', data: chartData.demandTrend.map(d => d.prepared), borderColor: '#F59E0B', backgroundColor: 'transparent', borderDash: [5, 5], fill: false }
          ] : []),
          ...(chartData.trends && !chartData.demandTrend ? [
            { label: 'Waste', data: chartData.trends.map(d => d.waste), borderColor: '#DC2626', backgroundColor: 'rgba(220, 38, 38, 0.08)', fill: true }
          ] : [])
        ],
      } : null;

  const popItemsData = chartData?.topItems?.length > 0
    ? {
        labels: chartData.topItems.map(t => t.item_name),
        datasets: [{ data: chartData.topItems.map(t => t.waste), backgroundColor: ['#2563EB', '#16A34A', '#F59E0B', '#06B6D4', '#8B5CF6'] }]
      } : null;

  return (
    <div className="space-y-6">
      <AlertToast toast={notificationState.latestToast} onClose={() => notificationState.setLatestToast(null)} />

      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Updated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell {...notificationState} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="dashboard-card p-5 border-l-4 border-l-blue-600">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Prepared</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.wasteStats?.total_prepared || 0} <span className="text-sm font-normal text-gray-400 dark:text-gray-500">units</span></h3>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-lg">
              <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
          </div>
        </div>

        <div className="dashboard-card p-5 border-l-4 border-l-green-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Sold</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.wasteStats?.total_sold || 0} <span className="text-sm font-normal text-gray-400 dark:text-gray-500">units</span></h3>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-2.5 rounded-lg">
              <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
            </div>
          </div>
        </div>

        <div className="dashboard-card p-5 border-l-4 border-l-red-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Waste</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.wasteStats?.total_waste || 0} <span className="text-sm font-normal text-gray-400 dark:text-gray-500">units</span></h3>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 p-2.5 rounded-lg">
              <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
            </div>
          </div>
        </div>

        <div className="dashboard-card p-5 border-l-4 border-l-amber-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Waste %</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.wasteStats?.waste_percentage || 0}<span className="text-sm font-normal text-gray-400 dark:text-gray-500">%</span></h3>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 p-2.5 rounded-lg">
              <AlertTriangle className="text-amber-600 dark:text-amber-400" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {chartsLoading ? (
         <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={24} />
         </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2" title="Demand Trend vs Preparations">
              {demandTrendData ? <Chart type="line" data={demandTrendData} /> : <p className="text-gray-400 dark:text-gray-500 text-sm">Not enough data yet. Add more entries.</p>}
            </Card>
            
            <Card title="Top Items by Waste">
              <div className="h-[300px] flex items-center justify-center">
                {popItemsData ? <Chart type="pie" data={popItemsData} /> : <p className="text-gray-400 dark:text-gray-500 text-sm">Add more entries to see breakdown.</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
