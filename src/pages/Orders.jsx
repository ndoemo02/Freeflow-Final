import React, { useState, useEffect } from 'react';
import { getUserOrders, createOrder } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrder, setNewOrder] = useState({
    restaurant_id: '',
    items: [],
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    notes: ''
  });

  // Pobierz zamówienia przy załadowaniu
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Pobierz zamówienia z Supabase
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          restaurant_id,
          total_cents,
          status,
          eta,
          created_at,
          restaurants!restaurant_id (
            name,
            address
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading orders:', error);
        setError('Błąd ładowania zamówień');
        return;
      }

      setOrders(data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Błąd ładowania zamówień');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Utwórz zamówienie przez backend
      const response = await createOrder(newOrder);
      
      console.log('Order created:', response);
      
      // Odśwież listę zamówień
      await loadOrders();
      
      // Resetuj formularz
      setNewOrder({
        restaurant_id: '',
        items: [],
        customer_name: '',
        customer_phone: '',
        delivery_address: '',
        notes: ''
      });
      setShowCreateForm(false);
      
    } catch (err) {
      console.error('Error creating order:', err);
      setError('Błąd tworzenia zamówienia');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents) => {
    return (cents / 100).toFixed(2) + ' zł';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pl-PL');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'text-blue-600 bg-blue-100';
      case 'confirmed': return 'text-yellow-600 bg-yellow-100';
      case 'preparing': return 'text-orange-600 bg-orange-100';
      case 'ready': return 'text-green-600 bg-green-100';
      case 'delivered': return 'text-gray-600 bg-gray-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading && orders.length === 0) {
    return (
      <main className="page">
        <section className="container">
          <h1 className="ff-h1">Historia Zamówień</h1>
          <div className="ff-card mt-6 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Ładowanie zamówień...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="container">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="ff-h1">Historia Zamówień</h1>
            <p className="ff-lead">Twoje zamówienia z restauracji</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {showCreateForm ? 'Anuluj' : '+ Nowe Zamówienie'}
          </button>
        </div>

        {error && (
          <div className="ff-card mt-6 p-4 bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {showCreateForm && (
          <div className="ff-card mt-6 p-6">
            <h2 className="text-xl font-bold mb-4">Utwórz Nowe Zamówienie</h2>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Restauracji
                </label>
                <input
                  type="text"
                  value={newOrder.restaurant_id}
                  onChange={(e) => setNewOrder({...newOrder, restaurant_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="np. 2ff3c81f-486c-405c-aff0-26a6433310c7"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imię i Nazwisko
                </label>
                <input
                  type="text"
                  value={newOrder.customer_name}
                  onChange={(e) => setNewOrder({...newOrder, customer_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Jan Kowalski"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={newOrder.customer_phone}
                  onChange={(e) => setNewOrder({...newOrder, customer_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="123456789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adres Dostawy
                </label>
                <input
                  type="text"
                  value={newOrder.delivery_address}
                  onChange={(e) => setNewOrder({...newOrder, delivery_address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="ul. Przykładowa 123, Piekary Śląskie"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uwagi
                </label>
                <textarea
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows="3"
                  placeholder="Dodatkowe uwagi do zamówienia..."
                />
              </div>
              
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Tworzenie...' : 'Utwórz Zamówienie'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="ff-card mt-6 p-8 text-center">
            <div className="text-6xl mb-4">🍕</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak zamówień</h3>
            <p className="text-gray-600">Nie masz jeszcze żadnych zamówień. Utwórz pierwsze!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="ff-card p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Zamówienie #{order.id.slice(-8)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.restaurants?.name || 'Nieznana restauracja'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.restaurants?.address || 'Brak adresu'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatPrice(order.total_cents)}
                    </div>
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Data:</span> {formatDate(order.created_at)}
                  </div>
                  {order.eta && (
                    <div>
                      <span className="font-medium">ETA:</span> {order.eta}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}


