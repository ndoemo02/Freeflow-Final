import { motion } from 'framer-motion';
import { useState } from 'react';

export function BusinessPanel({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Przegląd', icon: '📊' },
    { id: 'restaurants', label: 'Restauracje', icon: '🍽️' },
    { id: 'orders', label: 'Zamówienia', icon: '📋' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'settings', label: 'Ustawienia', icon: '⚙️' }
  ];

  const mockData = {
    overview: {
      totalOrders: 1247,
      revenue: 45680,
      activeRestaurants: 8,
      avgRating: 4.6
    },
    restaurants: [
      { id: 1, name: 'Pizzeria Monte Carlo', orders: 234, revenue: 12340, rating: 4.8 },
      { id: 2, name: 'Klaps Burgers', orders: 189, revenue: 9870, rating: 4.5 },
      { id: 3, name: 'Vien-Thien', orders: 156, revenue: 8760, rating: 4.7 }
    ],
    orders: [
      { id: 1, restaurant: 'Pizzeria Monte Carlo', customer: 'Jan Kowalski', amount: 45.50, status: 'completed' },
      { id: 2, restaurant: 'Klaps Burgers', customer: 'Anna Nowak', amount: 32.00, status: 'pending' },
      { id: 3, restaurant: 'Vien-Thien', customer: 'Piotr Wiśniewski', amount: 67.80, status: 'completed' }
    ]
  };

  const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-6 rounded-xl bg-gradient-to-br from-${color}-500/20 to-${color}-600/20 border border-${color}-400/30`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </motion.div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard title="Zamówienia" value={mockData.overview.totalOrders} icon="📋" color="blue" />
              <StatCard title="Przychód" value={`${mockData.overview.revenue.toLocaleString()} zł`} icon="💰" color="green" />
              <StatCard title="Restauracje" value={mockData.overview.activeRestaurants} icon="🍽️" color="purple" />
              <StatCard title="Ocena" value={mockData.overview.avgRating} icon="⭐" color="yellow" />
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Ostatnie zamówienia</h3>
              <div className="space-y-3">
                {mockData.orders.slice(0, 3).map(order => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{order.restaurant}</p>
                      <p className="text-gray-400 text-sm">{order.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">{order.amount} zł</p>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {order.status === 'completed' ? 'Zakończone' : 'Oczekujące'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'restaurants':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Twoje restauracje</h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
              >
                + Dodaj restaurację
              </motion.button>
            </div>
            
            <div className="space-y-3">
              {mockData.restaurants.map(restaurant => (
                <motion.div
                  key={restaurant.id}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold text-lg">{restaurant.name}</h4>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-gray-400">Zamówienia: {restaurant.orders}</span>
                        <span className="text-gray-400">Przychód: {restaurant.revenue} zł</span>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400">⭐</span>
                          <span className="text-white">{restaurant.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm">
                        Edytuj
                      </button>
                      <button className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">
                        Menu
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'orders':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Zamówienia</h3>
            <div className="space-y-3">
              {mockData.orders.map(order => (
                <motion.div
                  key={order.id}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium">{order.restaurant}</p>
                      <p className="text-gray-400 text-sm">{order.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">{order.amount} zł</p>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {order.status === 'completed' ? 'Zakończone' : 'Oczekujące'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h4 className="text-white font-bold mb-4">Sprzedaż w czasie</h4>
                <div className="h-32 bg-gray-700/50 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">📊 Wykres sprzedaży</span>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h4 className="text-white font-bold mb-4">Popularne dania</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pizza Margherita</span>
                    <span className="text-white">45 zamówień</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Burger Klaps</span>
                    <span className="text-white">32 zamówienia</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pho Bo</span>
                    <span className="text-white">28 zamówień</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Ustawienia biznesowe</h3>
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h4 className="text-white font-bold mb-4">Powiadomienia</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-gray-300">Nowe zamówienia</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-gray-300">Anulowane zamówienia</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span className="text-gray-300">Raport dzienny</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-2xl w-full max-w-6xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Panel Biznesowy</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </div>
      </motion.div>
    </motion.div>
  );
}



