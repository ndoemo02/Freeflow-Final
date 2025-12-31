import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Advanced Filters Component
 * Zaawansowane filtry z multi-select, date range picker, presets
 */
export default function AdvancedFilters({
  fromDate,
  toDate,
  intentFilter,
  restaurantFilter,
  onFilterChange,
  restaurants = [],
  intents = []
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [localFromDate, setLocalFromDate] = useState(fromDate);
  const [localToDate, setLocalToDate] = useState(toDate);
  const [selectedIntents, setSelectedIntents] = useState(
    intentFilter ? [intentFilter] : []
  );
  const [selectedRestaurants, setSelectedRestaurants] = useState(
    restaurantFilter ? [restaurantFilter] : []
  );
  const [datePreset, setDatePreset] = useState('');

  // Date presets
  const datePresets = [
    { label: 'Dziś', value: 'today', days: 0 },
    { label: 'Ostatnie 7 dni', value: '7d', days: 7 },
    { label: 'Ostatnie 30 dni', value: '30d', days: 30 },
    { label: 'Ostatnie 90 dni', value: '90d', days: 90 },
    { label: 'Ten miesiąc', value: 'thisMonth', custom: true },
    { label: 'Zeszły miesiąc', value: 'lastMonth', custom: true },
    { label: 'Ten kwartał', value: 'thisQuarter', custom: true },
    { label: 'Zeszły kwartał', value: 'lastQuarter', custom: true },
    { label: 'Ten rok', value: 'thisYear', custom: true },
  ];

  const applyDatePreset = (preset) => {
    const today = new Date();
    let from, to;

    switch (preset) {
      case 'today':
        from = to = today.toISOString().slice(0, 10);
        break;
      case '7d':
        from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        to = today.toISOString().slice(0, 10);
        break;
      case '30d':
        from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        to = today.toISOString().slice(0, 10);
        break;
      case '90d':
        from = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        to = today.toISOString().slice(0, 10);
        break;
      case 'thisMonth':
        from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
        to = today.toISOString().slice(0, 10);
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        from = lastMonth.toISOString().slice(0, 10);
        to = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(today.getMonth() / 3);
        from = new Date(today.getFullYear(), quarter * 3, 1).toISOString().slice(0, 10);
        to = today.toISOString().slice(0, 10);
        break;
      case 'lastQuarter':
        const lastQuarter = Math.floor((today.getMonth() - 3) / 3);
        const lastQuarterYear = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
        from = new Date(lastQuarterYear, lastQuarterMonth, 1).toISOString().slice(0, 10);
        to = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10);
        break;
      case 'thisYear':
        from = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
        to = today.toISOString().slice(0, 10);
        break;
      default:
        return;
    }

    setLocalFromDate(from);
    setLocalToDate(to);
    setDatePreset(preset);
  };

  const applyFilters = () => {
    onFilterChange({
      fromDate: localFromDate,
      toDate: localToDate,
      intentFilter: selectedIntents.length > 0 ? selectedIntents.join(',') : '',
      restaurantFilter: selectedRestaurants.length > 0 ? selectedRestaurants.join(',') : '',
    });
    setShowFilters(false);
  };

  const clearFilters = () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    setLocalFromDate(weekAgo.toISOString().slice(0, 10));
    setLocalToDate(today.toISOString().slice(0, 10));
    setSelectedIntents([]);
    setSelectedRestaurants([]);
    setDatePreset('');
    
    onFilterChange({
      fromDate: weekAgo.toISOString().slice(0, 10),
      toDate: today.toISOString().slice(0, 10),
      intentFilter: '',
      restaurantFilter: '',
    });
  };

  const toggleIntent = (intent) => {
    setSelectedIntents(prev =>
      prev.includes(intent)
        ? prev.filter(i => i !== intent)
        : [...prev, intent]
    );
  };

  const toggleRestaurant = (restaurant) => {
    setSelectedRestaurants(prev =>
      prev.includes(restaurant)
        ? prev.filter(r => r !== restaurant)
        : [...prev, restaurant]
    );
  };

  const activeFiltersCount = 
    (selectedIntents.length > 0 ? 1 : 0) +
    (selectedRestaurants.length > 0 ? 1 : 0) +
    (datePreset ? 1 : 0);

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-lg flex items-center gap-2 transition-all"
      >
        <span>🔍 Filtry</span>
        {activeFiltersCount > 0 && (
          <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
            {activeFiltersCount}
          </span>
        )}
        <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 z-50 w-96 bg-gray-900/95 backdrop-blur-xl border border-purple-500/30 rounded-xl p-6 shadow-2xl"
          >
            {/* Date Presets */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-300 mb-3">Szybkie okresy</div>
              <div className="grid grid-cols-3 gap-2">
                {datePresets.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => applyDatePreset(preset.value)}
                    className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                      datePreset === preset.value
                        ? 'bg-purple-500/30 border-purple-500 text-white'
                        : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-300 mb-3">Zakres dat</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Od</label>
                  <input
                    type="date"
                    value={localFromDate}
                    onChange={(e) => {
                      setLocalFromDate(e.target.value);
                      setDatePreset('');
                    }}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Do</label>
                  <input
                    type="date"
                    value={localToDate}
                    onChange={(e) => {
                      setLocalToDate(e.target.value);
                      setDatePreset('');
                    }}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Intent Multi-Select */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-300 mb-3">Intencje</div>
              <div className="flex flex-wrap gap-2">
                {intents.map(intent => (
                  <button
                    key={intent}
                    onClick={() => toggleIntent(intent)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      selectedIntents.includes(intent)
                        ? 'bg-cyan-500/30 border-cyan-500 text-cyan-300'
                        : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {intent}
                  </button>
                ))}
              </div>
            </div>

            {/* Restaurant Multi-Select */}
            {restaurants.length > 0 && (
              <div className="mb-6">
                <div className="text-sm font-semibold text-gray-300 mb-3">Restauracje</div>
                <div className="max-h-40 overflow-y-auto flex flex-wrap gap-2">
                  {restaurants.map(restaurant => (
                    <button
                      key={restaurant.id || restaurant}
                      onClick={() => toggleRestaurant(restaurant.id || restaurant)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        selectedRestaurants.includes(restaurant.id || restaurant)
                          ? 'bg-pink-500/30 border-pink-500 text-pink-300'
                          : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {restaurant.name || restaurant}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-white/10">
              <button
                onClick={clearFilters}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 text-gray-300 rounded-lg transition-all"
              >
                Wyczyść
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
              >
                Zastosuj
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


