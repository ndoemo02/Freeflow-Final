import { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function GalaxyChart({ type, data, title, height = 250 }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');

    // Galaxy Gradients
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

    const cyanGradient = ctx.createLinearGradient(0, 0, 0, 400);
    cyanGradient.addColorStop(0, 'rgba(6, 182, 212, 0.5)');
    cyanGradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    // Apply galaxy styling to dataset
    const styledData = {
      ...data,
      datasets: data.datasets.map((ds, i) => ({
        ...ds,
        borderColor: i === 0 ? '#8b5cf6' : '#06b6d4',
        backgroundColor: i === 0 ? gradient : cyanGradient,
        borderWidth: 2,
        pointBackgroundColor: '#fff',
        pointBorderColor: i === 0 ? '#8b5cf6' : '#06b6d4',
        pointHoverBackgroundColor: i === 0 ? '#8b5cf6' : '#06b6d4',
        pointHoverBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: type === 'line' ? true : false,
        tension: type === 'line' ? 0.4 : undefined,
      }))
    };

    const config = {
      type: type,
      data: styledData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter' }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#fff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(139, 92, 246, 0.3)',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
          }
        },
        scales: {
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#64748b'
            },
            display: type !== 'doughnut'
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#64748b'
            },
            display: type !== 'doughnut'
          }
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
      }
    };

    chartInstance.current = new ChartJS(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, type]);

  return (
    <div className="w-full h-full flex flex-col">
      {title && (
        <h3 className="text-gray-300 font-medium mb-4 flex items-center gap-2">
          <i className="ph ph-chart-bar text-purple-400"></i>
          {title}
        </h3>
      )}
      <div className="flex-1 min-h-[250px] relative" style={{ height: `${height}px` }}>
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
}


