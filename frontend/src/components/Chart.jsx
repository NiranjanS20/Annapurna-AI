import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { COLORS } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Chart = ({ type = 'line', data, options = {}, title }) => {
  const { isDark } = useTheme();

  const textColor = isDark ? '#E5E7EB' : '#374151';
  const textColorMuted = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6';
  const titleColor = isDark ? '#F9FAFB' : '#111827';


  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: "'Inter', sans-serif",
            size: 12
          },
          color: textColor,
          usePointStyle: true,
          padding: 16,
        }
      },
      title: {
        display: !!title,
        text: title,
        color: titleColor,
        font: {
          family: "'Inter', sans-serif",
          size: 15,
          weight: '600'
        },
        padding: { bottom: 16 }
      },
      tooltip: {
        backgroundColor: isDark ? '#1F2937' : '#1F2937',
        titleColor: '#F9FAFB',
        bodyColor: '#E5E7EB',
        borderColor: isDark ? '#4B5563' : '#374151',
        borderWidth: 1,
        padding: 12,
        boxPadding: 4,
        usePointStyle: true,
        cornerRadius: 8,
      }
    },
    ...options
  };

  const lineOptions = {
    ...commonOptions,
    elements: {
      line: {
        tension: 0.4
      },
      point: {
        radius: 3,
        hoverRadius: 6,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: gridColor,
          drawBorder: false,
        },
        ticks: { 
          color: textColorMuted,
          font: { size: 11 },
          padding: 8,
        },
        border: { display: false }
      },
      x: {
        grid: {
          display: false
        },
        ticks: { 
          color: textColorMuted,
          font: { size: 11 },
          padding: 8,
        },
        border: { display: false }
      }
    }
  };

  const barOptions = {
    ...lineOptions,
    elements: {
      bar: {
        borderRadius: 6,
      }
    }
  };

  const chartContainer = (children) => (
    <div className="w-full h-[300px] relative">
      {children}
    </div>
  );

  switch (type.toLowerCase()) {
    case 'bar':
      return chartContainer(<Bar data={data} options={barOptions} />);
    case 'pie':
      return chartContainer(<Pie data={data} options={{...commonOptions, maintainAspectRatio: false}} />);
    case 'line':
    default:
      return chartContainer(<Line data={data} options={lineOptions} />);
  }
};

export default Chart;
