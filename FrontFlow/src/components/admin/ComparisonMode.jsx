import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';

/**
 * Comparison Mode Component
 * Porównywanie okresów - side by side analysis
 */
export default function ComparisonMode({
  currentData,
  onPeriodSelect,
  metrics = ['revenue', 'orders', 'avgOrder', 'satisfaction']
}) {
  const [comparisonType, setComparisonType] = useState('previous'); // 'previous' | 'custom' | 'yoy'
  const [customPeriod, setCustomPeriod] = useState({
    from: '',
    to: ''
  });
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);

  const comparisonTypes = [
    { value: 'previous', label: 'vs Poprzedni okres', icon: '↔️' },
    { value: 'yoy', label: 'vs Rok temu', icon: '📅' },
    { value: 'custom', label: 'Niestandardowy', icon: '🎯' },
  ];

  useEffect(() => {
    if (comparisonType === 'previous' && currentData) {
      // Automatycznie załaduj poprzedni okres
      loadPreviousPeriod();
    } else if (comparisonType === 'yoy') {
      loadYearOverYear();
    }
  }, [comparisonType, currentData]);

  const loadPreviousPeriod = async () => {
    if (!currentData?.period) return;
    
    setLoading(true);
    try {
      // Oblicz poprzedni okres (ta sama długość)
      const periodDays = getPeriodDays(currentData.period);
      const prevFrom = new Date(currentData.from);
      prevFrom.setDate(prevFrom.getDate() - periodDays);
      const prevTo = new Date(currentData.from);

      const data = await onPeriodSelect({
        from: prevFrom.toISOString().slice(0, 10),
        to: prevTo.toISOString().slice(0, 10)
      });

      setComparisonData(data);
    } catch (error) {
      console.error('Error loading previous period:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadYearOverYear = async () => {
    if (!currentData?.from) return;
    
    setLoading(true);
    try {
      const currentFrom = new Date(currentData.from);
      const currentTo = new Date(currentData.to);
      const periodDays = Math.ceil((currentTo - currentFrom) / (1000 * 60 * 60 * 24));

      const yoyFrom = new Date(currentFrom);
      yoyFrom.setFullYear(yoyFrom.getFullYear() - 1);
      const yoyTo = new Date(yoyFrom);
      yoyTo.setDate(yoyTo.getDate() + periodDays);

      const data = await onPeriodSelect({
        from: yoyFrom.toISOString().slice(0, 10),
        to: yoyTo.toISOString().slice(0, 10)
      });

      setComparisonData(data);
    } catch (error) {
      console.error('Error loading YoY:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomPeriod = async () => {
    if (!customPeriod.from || !customPeriod.to) {
      alert('Wybierz zakres dat');
      return;
    }

    setLoading(true);
    try {
      const data = await onPeriodSelect(customPeriod);
      setComparisonData(data);
    } catch (error) {
      console.error('Error loading custom period:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodDays = (period) => {
    if (typeof period === 'number') return period;
    if (typeof period === 'string') {
      const match = period.match(/(\d+)/);
      return match ? parseInt(match[1]) : 7;
    }
    return 7;
  };

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return { value: 0, percent: 0, positive: true };
    const change = current - previous;
    const percent = (change / previous) * 100;
    return {
      value: change,
      percent: Math.abs(percent),
      positive: change >= 0
    };
  };

  if (!currentData) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-8 text-center text-gray-400">
        Brak danych do porównania
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comparison Type Selector */}
      <div className="flex gap-3">
        {comparisonTypes.map(type => (
          <button
            key={type.value}
            onClick={() => setComparisonType(type.value)}
            className={`px-4 py-2 rounded-lg border transition-all ${
              comparisonType === type.value
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
            }`}
          >
            <span className="mr-2">{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      {/* Custom Period Input */}
      {comparisonType === 'custom' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-xl p-4 flex gap-3 items-end"
        >
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Od</label>
            <input
              type="date"
              value={customPeriod.from}
              onChange={(e) => setCustomPeriod({ ...customPeriod, from: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Do</label>
            <input
              type="date"
              value={customPeriod.to}
              onChange={(e) => setCustomPeriod({ ...customPeriod, to: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg"
            />
          </div>
          <button
            onClick={loadCustomPeriod}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg"
          >
            {loading ? 'Ładowanie...' : 'Załaduj'}
          </button>
        </motion.div>
      )}

      {/* Comparison Results */}
      {comparisonData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Period */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-cyan-500/30">
            <div className="text-sm text-cyan-400 mb-4 font-semibold">OBECNY OKRES</div>
            <div className="space-y-4">
              {metrics.map(metric => {
                const currentValue = currentData[metric] || 0;
                const previousValue = comparisonData[metric] || 0;
                const change = calculateChange(currentValue, previousValue);

                return (
                  <div key={metric} className="flex justify-between items-center">
                    <div className="text-gray-300 capitalize">{metric}</div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">
                        {formatValue(currentValue, metric)}
                      </div>
                      <div className={`text-sm ${change.positive ? 'text-green-400' : 'text-red-400'}`}>
                        {change.positive ? '↑' : '↓'} {change.percent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparison Period */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/30">
            <div className="text-sm text-purple-400 mb-4 font-semibold">
              {comparisonType === 'yoy' ? 'ROK TEMU' : 'POPRZEDNI OKRES'}
            </div>
            <div className="space-y-4">
              {metrics.map(metric => {
                const value = comparisonData[metric] || 0;
                return (
                  <div key={metric} className="flex justify-between items-center">
                    <div className="text-gray-300 capitalize">{metric}</div>
                    <div className="text-xl font-bold text-white">
                      {formatValue(value, metric)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Comparison Chart */}
      {comparisonData && currentData.chartData && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
          <div className="text-lg font-bold text-white mb-4">Porównanie trendów</div>
          <div className="h-64">
            <Line
              data={{
                labels: currentData.chartData.labels || [],
                datasets: [
                  {
                    label: 'Obecny okres',
                    data: currentData.chartData.values || [],
                    borderColor: '#00f5ff',
                    backgroundColor: 'rgba(0, 245, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                  },
                  {
                    label: comparisonType === 'yoy' ? 'Rok temu' : 'Poprzedni okres',
                    data: comparisonData.chartData?.values || [],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    borderDash: [5, 5],
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: { color: '#e5e7eb' }
                  }
                },
                scales: {
                  x: { ticks: { color: '#9ca3af' } },
                  y: { ticks: { color: '#9ca3af' } }
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function formatValue(value, metric) {
  if (metric === 'revenue' || metric === 'avgOrder') {
    return `${value.toLocaleString('pl-PL')} zł`;
  }
  if (metric === 'satisfaction') {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString('pl-PL');
}


