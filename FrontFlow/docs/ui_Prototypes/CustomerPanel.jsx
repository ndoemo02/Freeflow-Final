import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Usunięto HashRouter
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  ChevronRight, 
  Search, 
  Plus, 
  MapPin, 
  Star, 
  Clock, 
  CreditCard,
  History,
  ShoppingCart,
  X,
  ArrowLeft
} from 'lucide-react';

// --- MOCKI (Atrapy danych i hooków dla celów podglądu UI) ---

const MOCK_USER = {
  id: 'user-123',
  email: 'jan.kowalski@example.com',
  user_metadata: {
    first_name: 'Jan',
    last_name: 'Kowalski',
    phone: '+48 123 456 789',
    address: 'ul. Marszałkowska 1',
    city: 'Warszawa'
  }
};

const MOCK_ORDERS = [
  {
    id: 'ord-8723',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min temu
    status: 'preparing',
    total_price: 4550,
    restaurant_name: 'Pizzeria Napoli',
    dish_name: 'Pizza Margherita'
  },
  {
    id: 'ord-1209',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // wczoraj
    status: 'delivered',
    total_price: 3200,
    restaurant_name: 'Burger King',
    dish_name: 'Cheeseburger Set'
  },
  {
    id: 'ord-0032',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 dni temu
    status: 'completed',
    total_price: 12500,
    restaurant_name: 'Sushi Master',
    dish_name: 'Zestaw Premium'
  }
];

const MOCK_RESTAURANTS = [
  { id: 1, name: 'Pizzeria Napoli', city: 'Warszawa', address: 'ul. Prosta 2', cuisine_type: 'Włoska', description: 'Najlepsza pizza w mieście na cienkim cieście.' },
  { id: 2, name: 'Burger King', city: 'Warszawa', address: 'Złote Tarasy', cuisine_type: 'Amerykańska', description: 'Soczyste burgery w 100% z wołowiny.' },
  { id: 3, name: 'Sushi Master', city: 'Kraków', address: 'Rynek Główny 5', cuisine_type: 'Japońska', description: 'Świeże ryby i tradycyjne receptury.' },
  { id: 4, name: 'Green Way', city: 'Gdańsk', address: 'Długa 12', cuisine_type: 'Wegetariańska', description: 'Zdrowe i pyszne dania bez mięsa.' },
];

const MOCK_MENU_ITEMS = [
  { id: 101, name: 'Pizza Margherita', price: 32, description: 'Sos pomidorowy, mozzarella, bazylia' },
  { id: 102, name: 'Pizza Pepperoni', price: 36, description: 'Sos pomidorowy, mozzarella, pikantne salami' },
  { id: 103, name: 'Focaccia', price: 18, description: 'Rozmaryn, sól morska, oliwa' },
  { id: 104, name: 'Tiramisu', price: 22, description: 'Klasyczny włoski deser' },
];

// Mock Hooks
function useAuth() {
  const [user, setUser] = useState(MOCK_USER);
  return { user, setUser };
}

function useToast() {
  return { push: (msg, type) => console.log(`Toast [${type}]: ${msg}`) };
}

function useCart() {
  const [cart, setCart] = useState([]);
  const addToCart = (item, restaurant) => {
    console.log('Added to cart:', item.name);
    setCart(prev => [...prev, { ...item, qty: 1 }]);
  };
  return { 
    cart, 
    addToCart,
    itemCount: cart.length,
    total: cart.reduce((acc, item) => acc + item.price, 0)
  };
}

const AmberLogger = {
  error: (e) => console.error(e),
  log: (msg) => console.log(msg)
};

// --- CUSTOM HOOK: LOGIKA BIZNESOWA ---

function useCustomerDashboard() {
  const { user, setUser } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  
  // Computed State
  const loyaltyPoints = useMemo(() => {
    const completedOrders = orders.filter(o => ['completed', 'delivered'].includes(o.status));
    const totalSpent = completedOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0) / 100, 0);
    return Math.floor(totalSpent / 10);
  }, [orders]);

  const activeOrders = useMemo(() => 
    orders.filter(o => ['pending', 'confirmed', 'preparing', 'delivering'].includes(o.status)),
  [orders]);

  // Initial Data Fetch (Simulated)
  useEffect(() => {
    const simulateFetch = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800)); // Fake delay

      // 1. Profile
      const profileData = {
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        address: user.user_metadata?.address || '',
        city: user.user_metadata?.city || '',
        role: 'customer'
      };
      setProfile(profileData);

      // 2. Orders
      setOrders(MOCK_ORDERS);

      // 3. Restaurants
      setRestaurants(MOCK_RESTAURANTS);

      setLoading(false);
    };

    simulateFetch();
  }, [user]);

  const fetchMenu = async (restaurantId) => {
    setLoadingMenu(true);
    // Simulate API call
    setTimeout(() => {
      setMenuItems(MOCK_MENU_ITEMS);
      setLoadingMenu(false);
    }, 600);
  };

  const handleSelectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
    fetchMenu(restaurant.id);
  };

  const handleBackToRestaurants = () => {
    setSelectedRestaurant(null);
    setMenuItems([]);
  };

  const handleUpdateProfile = async (newData) => {
    // Simulate API update
    setProfile(prev => ({ ...prev, ...newData }));
    push('Profil zaktualizowany', 'success');
    return true;
  };

  const handleLogout = () => {
    sessionStorage.setItem('skipIntro', 'true');
    navigate('/');
  };

  return {
    user,
    profile,
    orders,
    activeOrders,
    restaurants,
    selectedRestaurant,
    menuItems,
    loading,
    loadingMenu,
    loyaltyPoints,
    activeTab,
    setActiveTab,
    handleSelectRestaurant,
    handleBackToRestaurants,
    handleUpdateProfile,
    handleLogout,
    addToCart
  };
}

// --- GŁÓWNY KOMPONENT ---

// Bezpośredni eksport komponentu (używa Routera z nadrzędnej aplikacji)
export default function CustomerPanel() {
  const dashboard = useCustomerDashboard();

  // Loading Screen
  if (dashboard.loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm font-medium">Ładowanie panelu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800">
      <div className="flex h-screen overflow-hidden">
        
        {/* Sidebar Navigation (Desktop) */}
        <Sidebar 
          activeTab={dashboard.activeTab} 
          setActiveTab={dashboard.setActiveTab} 
          onLogout={dashboard.handleLogout}
          user={dashboard.profile}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative">
          {/* Header Mobile Only */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-30">
            <h1 className="font-bold text-lg">Panel Klienta</h1>
            <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold">{dashboard.profile?.first_name?.[0]}</span>
            </div>
          </div>

          <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 md:pb-8">
            <AnimatePresence mode="wait">
              {dashboard.activeTab === 'dashboard' && (
                <DashboardView key="dashboard" dashboard={dashboard} />
              )}
              {dashboard.activeTab === 'restaurants' && (
                <RestaurantsView key="restaurants" dashboard={dashboard} />
              )}
              {dashboard.activeTab === 'orders' && (
                <OrdersView key="orders" orders={dashboard.orders} />
              )}
              {dashboard.activeTab === 'profile' && (
                <ProfileView key="profile" profile={dashboard.profile} onUpdate={dashboard.handleUpdateProfile} />
              )}
              {dashboard.activeTab === 'settings' && (
                <SettingsView key="settings" />
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav activeTab={dashboard.activeTab} setActiveTab={dashboard.setActiveTab} />
      
      {/* Global Cart Mock */}
      <CartMock />
    </div>
  );
}

// --- PODKOMPONENTY WIDOKÓW ---

function DashboardView({ dashboard }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Witaj, {dashboard.profile?.first_name || 'Kliencie'} 👋
        </h2>
        <p className="text-zinc-400 mt-1">Oto podsumowanie Twojej aktywności.</p>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Loyalty Card - Large */}
        <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col justify-between group">
          <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-indigo-500/20" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-indigo-400 mb-2">
              <Star size={18} fill="currentColor" />
              <span className="text-sm font-semibold uppercase tracking-wider">Program Lojalnościowy</span>
            </div>
            <h3 className="text-4xl font-bold text-white mt-2">{dashboard.loyaltyPoints} pkt</h3>
            <p className="text-zinc-400 text-sm mt-1">Brakuje {100 - (dashboard.loyaltyPoints % 100)} pkt do darmowego lunchu.</p>
          </div>
          
          <div className="relative z-10 mt-6 w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${dashboard.loyaltyPoints % 100}%` }}
              className="bg-indigo-500 h-full rounded-full"
            />
          </div>
        </div>

        {/* Quick Action - Order Again */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors cursor-pointer group">
          <div>
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
              <History size={20} />
            </div>
            <h4 className="font-semibold text-white">Ostatnie zamówienie</h4>
            <p className="text-zinc-400 text-xs mt-1">Pad Thai z krewetkami</p>
          </div>
          <button className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium rounded-lg transition-colors">
            Zamów ponownie
          </button>
        </div>

        {/* Active Order Status */}
        {dashboard.activeOrders.length > 0 ? (
          <div className="md:col-span-3 bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-emerald-500/30 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                <Clock size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-emerald-400">Zamówienie w toku</h4>
                <p className="text-zinc-400 text-sm">Twoje jedzenie jest w drodze. Szacowany czas: 15 min.</p>
              </div>
            </div>
            <button 
              onClick={() => dashboard.setActiveTab('orders')}
              className="px-4 py-2 bg-emerald-500 text-black font-semibold text-sm rounded-lg hover:bg-emerald-400 transition-colors"
            >
              Śledź
            </button>
          </div>
        ) : (
          <div className="md:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center border-dashed">
            <p className="text-zinc-500">Brak aktywnych zamówień w tej chwili.</p>
            <button 
              onClick={() => dashboard.setActiveTab('restaurants')}
              className="mt-2 text-indigo-400 text-sm hover:underline"
            >
              Znajdź coś pysznego →
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function RestaurantsView({ dashboard }) {
  // Jeśli wybrano restaurację -> pokaż widok szczegółów (Menu)
  if (dashboard.selectedRestaurant) {
    return <RestaurantDetailView dashboard={dashboard} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Restauracje</h2>
          <p className="text-zinc-400 text-sm">Odkryj najlepsze smaki w Twojej okolicy.</p>
        </div>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input 
            type="text" 
            placeholder="Szukaj restauracji..." 
            className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 w-64"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboard.restaurants.map((rest, i) => (
          <RestaurantCard 
            key={rest.id} 
            data={rest} 
            index={i}
            onClick={() => dashboard.handleSelectRestaurant(rest)} 
          />
        ))}
      </div>
    </motion.div>
  );
}

function RestaurantDetailView({ dashboard }) {
  const { selectedRestaurant, menuItems, loadingMenu, addToCart, handleBackToRestaurants } = dashboard;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Back Header */}
      <button 
        onClick={handleBackToRestaurants}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} /> Wróć do listy
      </button>

      {/* Restaurant Hero */}
      <div className="relative rounded-2xl overflow-hidden h-48 bg-zinc-900 border border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
        {/* Placeholder image pattern */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-zinc-900 to-black"></div>
        
        <div className="absolute bottom-0 left-0 p-6 z-20">
          <h1 className="text-3xl font-bold text-white">{selectedRestaurant.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-zinc-300">
            <span className="flex items-center gap-1"><MapPin size={14}/> {selectedRestaurant.city}</span>
            <span className="flex items-center gap-1"><UtensilsCrossed size={14}/> {selectedRestaurant.cuisine_type || 'Ogólna'}</span>
            <span className="flex items-center gap-1 text-yellow-500"><Star size={14} fill="currentColor"/> 4.8</span>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Menu</h3>
        
        {loadingMenu ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(n => <div key={n} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map(item => (
              <div key={item.id} className="group bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900 rounded-xl p-4 transition-all flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium text-zinc-200 group-hover:text-white transition-colors">{item.name}</h4>
                    <span className="font-semibold text-white ml-2 whitespace-nowrap">
                      {(item.price / 1).toFixed(2)} zł
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{item.description || 'Pyszne danie przygotowane ze świeżych składników.'}</p>
                  <button 
                    onClick={() => addToCart(item, selectedRestaurant)}
                    className="text-xs font-medium bg-zinc-800 hover:bg-white hover:text-black text-zinc-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                  >
                    <Plus size={12} /> Dodaj
                  </button>
                </div>
                <div className="w-16 h-16 bg-zinc-800 rounded-lg flex-shrink-0" /> {/* Placeholder na zdjęcie dania */}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function OrdersView({ orders }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-zinc-800 text-zinc-400';
      case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white">Twoje Zamówienia</h2>
        <p className="text-zinc-400 text-sm">Historia wszystkich Twoich transakcji.</p>
      </header>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="p-4 font-medium">Nr Zamówienia</th>
              <th className="p-4 font-medium">Restauracja</th>
              <th className="p-4 font-medium">Data</th>
              <th className="p-4 font-medium">Kwota</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sortedOrders.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-zinc-500">Brak zamówień w historii.</td>
              </tr>
            ) : (
              sortedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-900 transition-colors">
                  <td className="p-4 font-mono text-zinc-500">#{order.id.slice(0, 8)}</td>
                  <td className="p-4 font-medium text-zinc-200">{order.restaurant_name || 'Nieznana'}</td>
                  <td className="p-4 text-zinc-400">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="p-4 font-semibold text-zinc-200">{(order.total_price / 100).toFixed(2)} zł</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border border-transparent ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-zinc-400 hover:text-white transition-colors">
                      Szczegóły
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfileView({ profile, onUpdate }) {
  const [formData, setFormData] = useState({ ...profile });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onUpdate(formData);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-white">Ustawienia Profilu</h2>
        <p className="text-zinc-400 text-sm">Zarządzaj swoimi danymi osobowymi i adresem dostawy.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <InputGroup 
            label="Imię" 
            value={formData.first_name} 
            onChange={v => setFormData({...formData, first_name: v})} 
          />
          <InputGroup 
            label="Nazwisko" 
            value={formData.last_name} 
            onChange={v => setFormData({...formData, last_name: v})} 
          />
        </div>

        <InputGroup 
          label="Email" 
          value={formData.email} 
          disabled 
          icon={<Settings size={14}/>} // Placeholder icon for read-only
        />
        
        <InputGroup 
          label="Numer telefonu" 
          value={formData.phone} 
          onChange={v => setFormData({...formData, phone: v})} 
        />

        <div className="pt-4 border-t border-zinc-800">
          <h3 className="text-lg font-medium text-white mb-4">Adres dostawy</h3>
          <div className="space-y-4">
            <InputGroup 
              label="Ulica i numer" 
              value={formData.address} 
              onChange={v => setFormData({...formData, address: v})} 
            />
            <InputGroup 
              label="Miasto" 
              value={formData.city} 
              onChange={v => setFormData({...formData, city: v})} 
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-white text-black hover:bg-zinc-200 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white">Ustawienia Aplikacji</h2>
      </header>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {[
          { icon: Bell, title: "Powiadomienia Push", desc: "Otrzymuj powiadomienia o statusie zamówienia" },
          { icon: UtensilsCrossed, title: "Preferencje dietetyczne", desc: "Filtruj menu na podstawie diety" },
          { icon: CreditCard, title: "Metody płatności", desc: "Zarządzaj kartami i płatnościami" },
          { icon: History, title: "Wyczyść historię", desc: "Usuń lokalną historię wyszukiwania" },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between p-4 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400">
                <item.icon size={20} />
              </div>
              <div>
                <h4 className="font-medium text-zinc-200">{item.title}</h4>
                <p className="text-xs text-zinc-500">{item.desc}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-600" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- MNIEJSZE KOMPONENTY UI ---

function Sidebar({ activeTab, setActiveTab, onLogout, user }) {
  const menu = [
    { id: 'dashboard', label: 'Przegląd', icon: LayoutDashboard },
    { id: 'restaurants', label: 'Restauracje', icon: UtensilsCrossed },
    { id: 'orders', label: 'Zamówienia', icon: ShoppingBag },
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'settings', label: 'Ustawienia', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-zinc-900 bg-zinc-950 p-4">
      <div className="mb-8 px-2 flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white">G</div>
        <span className="font-bold text-lg tracking-tight">GastroPanel</span>
      </div>

      <nav className="flex-1 space-y-1">
        {menu.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === item.id 
                ? 'bg-zinc-900 text-white shadow-sm ring-1 ring-zinc-800' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
            }`}
          >
            <item.icon size={18} className={activeTab === item.id ? 'text-indigo-400' : 'text-zinc-500'} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-zinc-900 pt-4 mt-4">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400">
            {user?.first_name?.[0] || <User size={16}/>}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.first_name || 'Użytkownik'}</p>
            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut size={18} /> Wyloguj się
        </button>
      </div>
    </aside>
  );
}

function MobileNav({ activeTab, setActiveTab }) {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard },
    { id: 'restaurants', icon: UtensilsCrossed },
    { id: 'orders', icon: ShoppingBag },
    { id: 'profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-900 p-4 pb-8 z-50">
      <div className="flex justify-around items-center">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`p-2 rounded-xl transition-colors ${activeTab === item.id ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
          >
            <item.icon size={24} />
          </button>
        ))}
      </div>
    </div>
  );
}

function RestaurantCard({ data, onClick, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:shadow-indigo-500/10"
    >
      <div className="h-40 bg-zinc-800 relative">
        {/* Placeholder Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center text-zinc-700 group-hover:text-zinc-600 transition-colors">
          <UtensilsCrossed size={48} />
        </div>
        
        {/* Badges */}
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-medium text-white flex items-center gap-1">
          <Clock size={12} /> 30-45 min
        </div>
      </div>
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">{data.name}</h3>
          <span className="flex items-center gap-1 text-xs font-bold bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-md">
            <Star size={10} fill="currentColor" /> 4.8
          </span>
        </div>
        <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{data.description || 'Kuchnia międzynarodowa, świeże składniki i szybka dostawa.'}</p>
        
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="bg-zinc-800 px-2 py-1 rounded-md">{data.cuisine_type || 'Restauracja'}</span>
          <span className="flex items-center gap-1"><MapPin size={12}/> {data.city}</span>
        </div>
      </div>
    </motion.div>
  );
}

function InputGroup({ label, value, onChange, disabled, icon }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input 
          type="text" 
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={disabled}
          className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {icon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">{icon}</div>}
      </div>
    </div>
  );
}

// Mock Cart Component
function CartMock() {
  const { itemCount, total } = useCart();
  
  if (itemCount === 0) return null;
  
  return (
    <div className="fixed bottom-24 md:bottom-8 right-8 z-50">
      <div className="bg-indigo-600 text-white rounded-full p-4 shadow-xl shadow-indigo-500/30 flex items-center gap-3 cursor-pointer hover:bg-indigo-500 transition-colors">
        <ShoppingCart size={24} />
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-sm">{itemCount} pozycji</span>
          <span className="text-xs opacity-90">{total} zł</span>
        </div>
      </div>
    </div>
  );
}