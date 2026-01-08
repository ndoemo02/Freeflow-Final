import React, { useEffect, useState, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/auth';
import { supabase } from '../../lib/supabase';
import { Dialog, Transition } from '@headlessui/react';
import { getApiUrl } from '../../lib/config';
import PanelHeader from '../../components/PanelHeader';

// Utility components for V2 look
const Card = ({ children, className = "" }) => (
  <div className={`bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    preparing: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    delivered: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  const defaultStyle = "bg-gray-500/20 text-gray-300 border-gray-500/30";

  const label = {
    pending: "Oczekujące",
    preparing: "W kuchni",
    completed: "Gotowe",
    delivered: "Dostarczone",
    cancelled: "Anulowane"
  }[status] || status;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || defaultStyle}`}>
      {label}
    </span>
  );
};

export default function BusinessPanelV2() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Stats state
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]); // Menu items

  // UI state
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    if (!user?.id) {
      // Optional: redirect or show login
      return;
    }

    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        // Fetch restaurants sorted by newest first (as fixed in V1)
        const { data, error } = await supabase
          .from('restaurants')
          .select('id, name, city')
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          setRestaurants(data);
          setRestaurantId(data[0].id); // Default to newest
        }
      } catch (e) {
        console.error("Failed to load restaurants", e);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [user?.id]);

  // Poll data for selected restaurant
  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      try {
        // 1. Fetch Orders
        const ordersRes = await fetch(getApiUrl(`/api/orders?restaurant_id=${restaurantId}`));
        const ordersData = await ordersRes.json();

        // 2. Fetch Menu (for context)
        const { data: menuData } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId);

        if (ordersData.orders) setOrders(ordersData.orders);
        if (menuData) setItems(menuData);

      } catch (e) {
        console.error("Sync error:", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // 5s poll
    return () => clearInterval(interval);
  }, [restaurantId]);

  // Calculated Stats
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysOrders = orders.filter(o => o.created_at.startsWith(today) && o.status !== 'cancelled');

    const revenue = todaysOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const activeCount = orders.filter(o => ['pending', 'preparing'].includes(o.status)).length;

    return {
      revenue,
      count: todaysOrders.length,
      pending: pendingCount,
      active: activeCount
    };
  }, [orders]);

  // Actions
  const updateStatus = async (orderId, status) => {
    try {
      await fetch(getApiUrl(`/api/orders/${orderId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status }));
      }
    } catch (e) {
      alert("Błąd aktualizacji statusu");
    }
  };

  // Columns
  const activeOrders = orders.filter(o => ['pending', 'preparing', 'completed'].includes(o.status));
  const historyOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header & Restaurant Selector */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Business Command v2
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Centrum zarządzania zamówieniami AI
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10">
            <span className="text-xl">🏪</span>
            <select
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-sm font-medium w-48 appearance-none cursor-pointer"
            >
              {restaurants.map(r => (
                <option key={r.id} value={r.id} className="bg-gray-900">{r.name}</option>
              ))}
            </select>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="!p-4 border-l-4 border-l-brand-500 border-white/5">
            <div className="text-gray-400 text-xs uppercase tracking-wider">Dzisiejszy Przychód</div>
            <div className="text-2xl font-bold mt-1 text-white">{metrics.revenue.toFixed(2)} zł</div>
          </Card>
          <Card className="!p-4 border-l-4 border-l-blue-500 border-white/5">
            <div className="text-gray-400 text-xs uppercase tracking-wider">Zamówienia Dziś</div>
            <div className="text-2xl font-bold mt-1 text-white">{metrics.count}</div>
          </Card>
          <Card className="!p-4 border-l-4 border-l-yellow-500 border-white/5">
            <div className="text-gray-400 text-xs uppercase tracking-wider">Oczekujące</div>
            <div className="text-2xl font-bold mt-1 text-yellow-400 animate-pulse">{metrics.pending}</div>
          </Card>
          <Card className="!p-4 border-l-4 border-l-emerald-500 border-white/5">
            <div className="text-gray-400 text-xs uppercase tracking-wider">W Trakcie</div>
            <div className="text-2xl font-bold mt-1 text-emerald-400">{metrics.active}</div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Active Stream */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                🔥 Aktywne Zamówienia
              </h2>
              <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{activeOrders.length}</span>
            </div>

            <div className="space-y-3">
              {activeOrders.length === 0 && (
                <div className="text-center py-12 text-gray-500 italic border border-dashed border-white/10 rounded-xl">
                  Brak aktywnych zamówień. Kuchnia odpoczywa. 😴
                </div>
              )}
              {activeOrders.map(order => (
                <Card
                  key={order.id}
                  className="!p-0 overflow-hidden hover:border-brand-500/50 transition-colors cursor-pointer group"
                >
                  <div
                    className="p-5 flex flex-col md:flex-row gap-4"
                    onClick={() => { setSelectedOrder(order); setIsDetailsOpen(true); }}
                  >
                    {/* Status Strip */}
                    <div className={`w-1.5 self-stretch rounded-full ${order.status === 'pending' ? 'bg-yellow-500 shadow-[0_0_10px_orange]' :
                        order.status === 'preparing' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`} />

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{order.customer_name || 'Gość'}</h3>
                          <div className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 8)} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-xl tracking-tight">{(order.total_price || 0).toFixed(2)} zł</div>
                          <Badge status={order.status} />
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="text-sm text-gray-300 space-y-1 mt-3">
                        {Array.isArray(order.items) && order.items.map((item, i) => (
                          <div key={i} className="flex justify-between border-b border-white/5 pb-1 last:border-0">
                            <span><span className="text-brand-400 font-bold">{item.quantity}x</span> {item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions Footer */}
                  <div className="bg-white/5 border-t border-white/10 px-5 py-3 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'cancelled'); }}
                          className="text-xs font-semibold text-red-400 hover:text-red-300 px-3 py-1 bg-red-500/10 rounded-lg border border-red-500/20"
                        >
                          ODRZUĆ
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'preparing'); }}
                          className="text-xs font-semibold text-green-400 hover:text-green-300 px-3 py-1 bg-green-500/10 rounded-lg border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                        >
                          PRZYJMIJ DO REALIZACJI
                        </button>
                      </>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'completed'); }}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 px-3 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20"
                      >
                        OZNACZ JAKO GOTOWE
                      </button>
                    )}
                    {order.status === 'completed' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'delivered'); }}
                        className="text-xs font-semibold text-purple-400 hover:text-purple-300 px-3 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20"
                      >
                        WYDAJ KLIENTOWI
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Right: History & Menu */}
          <div className="space-y-8">
            {/* Recent History */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-400">📜 Ostatnio Zakończone</h2>
              <div className="space-y-2">
                {historyOrders.slice(0, 5).map(order => (
                  <div key={order.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                    <div>
                      <div className="font-medium text-sm text-gray-300">{order.customer_name}</div>
                      <div className="text-xs text-gray-500">#{order.id.slice(0, 4)}</div>
                    </div>
                    <div className="text-right">
                      <Badge status={order.status} />
                      <div className="text-xs text-gray-400 mt-1">{(order.total_price || 0).toFixed(2)} zł</div>
                    </div>
                  </div>
                ))}
                {historyOrders.length === 0 && <div className="text-gray-600 text-sm">Pusta historia.</div>}
              </div>
            </div>

            {/* Mini Menu Preview */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-400">🍽️ Menu (Podgląd)</h2>
              <div className="bg-white/5 rounded-xl border border-white/5 p-4 max-h-64 overflow-y-auto">
                <ul className="space-y-2">
                  {items.map(item => (
                    <li key={item.id} className="flex justify-between text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <span className="text-gray-300">{item.name}</span>
                      <span className="font-mono text-brand-400">{item.price} zł</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      <Transition appear show={isDetailsOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsDetailsOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-[#111] border border-white/10 p-8 shadow-2xl transition-all">
                  {selectedOrder && (
                    <div className="space-y-6">
                      <Dialog.Title className="text-2xl font-bold flex justify-between items-center">
                        <span>Zamówienie #{selectedOrder.id.slice(0, 6)}</span>
                        <Badge status={selectedOrder.status} />
                      </Dialog.Title>

                      <div className="bg-white/5 rounded-xl p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Klient</div>
                            <div className="font-medium text-lg">{selectedOrder.customer_name}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Telefon</div>
                            <div className="font-medium text-lg">{selectedOrder.customer_phone || '-'}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase">Adres</div>
                          <div className="font-medium">{selectedOrder.delivery_address || 'Odbiór osobisty / Na miejscu'}</div>
                        </div>
                        {selectedOrder.notes && (
                          <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                            <div className="text-xs text-yellow-500 uppercase font-bold">Uwagi</div>
                            <div className="text-yellow-100 italic">"{selectedOrder.notes}"</div>
                          </div>
                        )}
                      </div>

                      <div className="border border-white/10 rounded-xl overflow-hidden">
                        <div className="bg-white/5 p-3 text-sm font-semibold text-gray-400">POZYCJE</div>
                        <div className="divide-y divide-white/10">
                          {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="p-3 flex justify-between bg-black/20">
                              <div>
                                <span className="font-bold text-white mr-2">{item.quantity}x</span>
                                <span className="text-gray-300">{item.name}</span>
                              </div>
                              <div className="font-mono text-gray-400">
                                {(item.price * item.quantity).toFixed(2)} zł
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="bg-white/10 p-4 flex justify-between items-center">
                          <span className="font-bold text-lg">RAZEM</span>
                          <span className="font-bold text-2xl text-brand-400">{(selectedOrder.total_price || 0).toFixed(2)} zł</span>
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                        <button
                          onClick={() => setIsDetailsOpen(false)}
                          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          Zamknij
                        </button>
                        {selectedOrder.status === 'pending' && (
                          <button
                            onClick={() => { updateStatus(selectedOrder.id, 'preparing'); setIsDetailsOpen(false); }}
                            className="px-6 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-lg shadow-brand-500/20"
                          >
                            Zatwierdź
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
