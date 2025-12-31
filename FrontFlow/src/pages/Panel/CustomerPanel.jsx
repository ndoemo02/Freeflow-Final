import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../state/auth'
import { supabase } from '../../lib/supabase'
import { AmberLogger } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast'
import PanelHeader from '../../components/PanelHeader'
import { useCart } from '../../state/CartContext'
import { getApiUrl } from '../../lib/config'
import Cart from '../../components/Cart'

export default function CustomerPanel() {
  const { user, setUser } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const { addToCart, itemCount, setIsOpen } = useCart()

  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [orders, setOrders] = useState([])
  const [orderFilter, setOrderFilter] = useState('all') // 'all', 'active', 'completed'
  const [restaurants, setRestaurants] = useState([])
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [loadingMenu, setLoadingMenu] = useState(false)
  const [loading, setLoading] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)

  // Redirect if not logged in
  useEffect(() => {
    // Poczekaj aż stan auth będzie znany; jeśli brak usera → wróć do Home bez intro
    if (user === undefined) return;
    if (!user?.id) {
      try { sessionStorage.setItem('skipIntro', 'true'); } catch {}
      navigate('/');
    }
  }, [user, navigate]);

  // Load profile and orders
  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      setLoading(true);

      // Load profile from auth metadata
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
      AmberLogger.log("Profile loaded:", profileData);

      // Load orders via backend API (bypasses RLS)
      let ordersData = [];
      try {
        console.log('🔍 CustomerPanel: Loading orders for user_id:', user.id);
        const response = await fetch(getApiUrl(`/api/orders?user_id=${user.id}`));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        ordersData = data.orders || [];
        console.log('📦 CustomerPanel: Orders loaded via API:', ordersData.length, 'orders');
        AmberLogger.log("Orders loaded via API:", ordersData);
        setOrders(ordersData);
      } catch (error) {
        AmberLogger.error('Failed to load orders:', error);
        setOrders([]);
      }

      // Load restaurants
      const { data: restaurantsData, error: restaurantsError } = await supabase
          .from('restaurants')
          .select('id,name,city,address,cuisine_type')
        .order('name');

      if (restaurantsError) AmberLogger.error(restaurantsError);
      else AmberLogger.log("Restaurants loaded:", restaurantsData);
      setRestaurants(restaurantsData || []);

      // Calculate loyalty points (example: 1 point per 10 zł spent)
      const completedOrders = ordersData?.filter(o => o.status === 'completed' || o.status === 'delivered') || [];
      const totalSpent = completedOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0) / 100, 0);
      setLoyaltyPoints(Math.floor(totalSpent / 10));

      // Set recent orders (last 3)
      setRecentOrders(ordersData?.slice(0, 3) || []);

      setLoading(false);
    };

    loadData();

    // Realtime order updates
    const channel = supabase
      .channel(`orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        (payload) => {
          AmberLogger.log("Realtime order update:", payload);
          loadData();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  // Handle Escape key to close panel
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        navigate('/')
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [navigate])

  const loadMenu = async (restaurantId) => {
    try {
      setLoadingMenu(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('id,name,price,description')
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (error) throw error;
      
      setMenuItems(data || []);
      AmberLogger.log("Menu loaded:", data);
    } catch (e) {
      push('Błąd podczas ładowania menu', 'error');
      AmberLogger.error(e);
      setMenuItems([]);
    } finally {
      setLoadingMenu(false);
    }
  }

  const selectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
    loadMenu(restaurant.id);
  }

  const saveProfile = async () => {
    if (!profile) return;
    
    try {
      setSavingProfile(true);
      
      // Update user metadata in Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          address: profile.address,
          city: profile.city
        }
      });

      if (error) throw error;
      
      // Update local user state with new metadata
      if (data?.user) {
        setUser(data.user);
      }
      
      push('Profil został zaktualizowany', 'success');
      setEditingProfile(false);
      AmberLogger.log("Profile saved:", profile);
    } catch (e) {
      push('Błąd podczas zapisywania profilu', 'error');
      AmberLogger.error(e);
    } finally {
      setSavingProfile(false);
    }
  }

  const cancelOrder = async (orderId) => {
    try {
      // Use backend API to cancel order
      const response = await fetch(getApiUrl(`/api/orders/${orderId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      push('Zamówienie zostało anulowane', 'success')
      AmberLogger.log("Order cancelled:", { id: orderId });
      
      // Refresh orders via backend API
      const ordersResponse = await fetch(getApiUrl(`/api/orders?user_id=${user.id}`));
      if (ordersResponse.ok) {
        const data = await ordersResponse.json();
        setOrders(data.orders || []);
      }
    } catch (e) {
      push('Błąd podczas anulowania zamówienia', 'error')
      AmberLogger.error(e);
    }
  }

  return (
    <motion.div 
      className="min-h-screen bg-black px-4 py-8 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0">
          <div className="grid grid-cols-12 gap-4 h-full">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="relative"
                animate={{
                  opacity: [0.1, 0.8, 0.1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut"
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 via-transparent to-purple-500/20"
                  animate={{
                    opacity: [0, 1, 0],
                    scaleY: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute right-0 top-0 w-px h-full bg-gradient-to-b from-cyan-500 via-purple-500 to-pink-500"
                  animate={{
                    opacity: [0.2, 1, 0.2],
                    boxShadow: [
                      "0 0 5px rgba(0, 255, 255, 0.3)",
                      "0 0 20px rgba(0, 255, 255, 0.8)",
                      "0 0 5px rgba(0, 255, 255, 0.3)"
                    ]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl relative z-10">
        {/* Navigation Buttons */}
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-between">
          <motion.button
            onClick={() => {
              console.log('👤 CustomerPanel - ustawiam skipIntro flag');
              sessionStorage.setItem('skipIntro', 'true');
              navigate('/');
            }}
            className="rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-slate-300 hover:bg-white/10 transition-all backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 0 20px rgba(0, 255, 255, 0.3)"
            }}
            whileTap={{ scale: 0.95 }}
          >
            ← Strona główna
          </motion.button>
          
          
          <motion.button
            onClick={() => {
              console.log('👤 CustomerPanel - ustawiam skipIntro flag');
              sessionStorage.setItem('skipIntro', 'true');
              navigate('/');
            }}
            className="rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-slate-300 hover:bg-white/10 transition-all backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 0 20px rgba(0, 255, 255, 0.3)"
            }}
            whileTap={{ scale: 0.95 }}
          >
            ✕ Zamknij panel
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <motion.h1
            className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Panel Klienta
          </motion.h1>
          
          <motion.p
            className="text-lg text-gray-300 mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Zarządzaj swoim kontem, zamówieniami i ustawieniami
          </motion.p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <StatsCards orders={orders} />
        </motion.div>

        <motion.div
          className="mb-6 flex gap-2 overflow-x-auto pb-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <TabButton current={tab} setTab={setTab} id="profile" icon="🙋">Profil</TabButton>
          <TabButton current={tab} setTab={setTab} id="orders" icon="📋">Zamówienia</TabButton>
          <TabButton current={tab} setTab={setTab} id="restaurants" icon="🍕">Restauracje</TabButton>
          <TabButton current={tab} setTab={setTab} id="reservations" icon="🪑">Rezerwacje</TabButton>
          <TabButton current={tab} setTab={setTab} id="cart" icon="🛒">Koszyk {itemCount > 0 && `(${itemCount})`}</TabButton>
          <TabButton current={tab} setTab={setTab} id="settings" icon="⚙️">Ustawienia</TabButton>
        </motion.div>

        <motion.div 
          className="rounded-2xl border border-cyan-500/20 bg-black/40 backdrop-blur-xl p-6 shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 255, 255, 0.05))',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          <AnimatePresence mode="wait">
            {tab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <ProfileTab
                  profile={profile}
                  user={user}
                  editing={editingProfile}
                  setEditing={setEditingProfile}
                  saving={savingProfile}
                  saveProfile={saveProfile}
                  setProfile={setProfile}
                />
              </motion.div>
            )}
            {tab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <OrdersTab
                  orders={orders}
                  loading={loading}
                  cancelOrder={cancelOrder}
                  filter={orderFilter}
                  setFilter={setOrderFilter}
                />
              </motion.div>
            )}
            {tab === 'restaurants' && (
              <motion.div
                key="restaurants"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <RestaurantsTab
                  restaurants={restaurants}
                  selectedRestaurant={selectedRestaurant}
                  menuItems={menuItems}
                  loadingMenu={loadingMenu}
                  onSelectRestaurant={selectRestaurant}
                  onBack={() => setSelectedRestaurant(null)}
                  addToCart={addToCart}
                />
              </motion.div>
            )}
            {tab === 'reservations' && (
              <motion.div
                key="reservations"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <ReservationsTab userId={user?.id} />
              </motion.div>
            )}
            {tab === 'cart' && (
              <motion.div
                key="cart"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <CartTab />
              </motion.div>
            )}
            {tab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <SettingsTab
                  profile={profile}
                  loyaltyPoints={loyaltyPoints}
                  notifications={notifications}
                  setNotifications={setNotifications}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      
      {/* Cart Popup */}
      <Cart />
    </motion.div>
  )
}

function TabButton({ current, setTab, id, icon, children }) {
  const active = current === id
  return (
    <motion.button 
      onClick={() => setTab(id)} 
      className={[
        'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all whitespace-nowrap backdrop-blur-xl',
        active ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white shadow-lg border border-cyan-500/30' : 'bg-black/40 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-cyan-500/20'
      ].join(' ')}
      whileHover={{ 
        scale: 1.05,
        y: -2,
        boxShadow: active ? "0 0 25px rgba(0, 255, 255, 0.4)" : "0 0 15px rgba(0, 255, 255, 0.2)",
        transition: { type: "spring", stiffness: 300 }
      }}
      whileTap={{ scale: 0.95 }}
    >
      <span>{icon}</span>
        {children}
    </motion.button>
  )
}

function ProfileTab({ profile, user, editing, setEditing, saving, saveProfile, setProfile }) {
  if (!profile) return <div className="text-slate-300">Ładowanie profilu…</div>;

  return (
    <div className="space-y-6">
      {/* Header with Avatar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <motion.div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {profile.first_name?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || '?'}
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {profile.first_name && profile.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : 'Profil użytkownika'}
            </h2>
            <p className="text-sm text-slate-400">{profile.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <motion.button
                onClick={() => setEditing(false)}
                className="rounded-xl border border-white/20 bg-glass px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-white/10"
                disabled={saving}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Anuluj
              </motion.button>
              <motion.button
                onClick={saveProfile}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50"
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(6, 182, 212, 0.5)" }}
                whileTap={{ scale: 0.95 }}
              >
                {saving ? 'Zapisywanie...' : '💾 Zapisz'}
              </motion.button>
            </>
          ) : (
            <motion.button
              onClick={() => setEditing(true)}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
              whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(6, 182, 212, 0.5)" }}
              whileTap={{ scale: 0.95 }}
            >
              ✏️ Edytuj profil
            </motion.button>
          )}
        </div>
      </div>

      {/* Profile Fields */}
      <div className="grid gap-4 md:grid-cols-2">
        <EditableField
          label="Imię"
          value={profile.first_name || ""}
          editing={editing}
          onChange={(value) => setProfile(prev => ({ ...prev, first_name: value }))}
          icon="👤"
        />
        <EditableField
          label="Nazwisko"
          value={profile.last_name || ""}
          editing={editing}
          onChange={(value) => setProfile(prev => ({ ...prev, last_name: value }))}
          icon="👤"
        />
        <Field label="Email" value={profile.email || "Nie podano"} icon="📧" full readOnly />
        <EditableField
          label="Telefon"
          value={profile.phone || ""}
          editing={editing}
          onChange={(value) => setProfile(prev => ({ ...prev, phone: value }))}
          placeholder="+48 123 456 789"
          icon="📱"
        />
        <EditableField
          label="Adres"
          value={profile.address || ""}
          editing={editing}
          onChange={(value) => setProfile(prev => ({ ...prev, address: value }))}
          placeholder="ul. Przykładowa 123/45"
          icon="🏠"
          full
        />
        <EditableField
          label="Miasto"
          value={profile.city || ""}
          editing={editing}
          onChange={(value) => setProfile(prev => ({ ...prev, city: value }))}
          placeholder="Warszawa"
          icon="🌆"
        />
        <Field label="Rola" value={profile.role || "customer"} icon="🎭" />
      </div>
    </div>
  )
}

function Field({ label, value, full, readOnly, icon }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {label}
      </label>
      <div className={`rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 ${readOnly ? 'opacity-60' : ''}`}>
        {value}
      </div>
    </div>
  )
}

function EditableField({ label, value, editing, onChange, placeholder, full, icon }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {label}
      </label>
      {editing ? (
        <motion.input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-cyan-500/30 bg-black/40 px-4 py-3 text-slate-100 placeholder-slate-400 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-xl"
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          whileFocus={{ scale: 1.01 }}
        />
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100">
          {value || <span className="text-slate-500">{placeholder || "Nie podano"}</span>}
        </div>
      )}
    </div>
  )
}

function OrdersTab({ orders, loading, cancelOrder, filter, setFilter }) {
  // Filtruj zamówienia na podstawie wybranego filtra
  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'active') {
      return ['pending', 'confirmed', 'preparing'].includes(order.status);
    }
    if (filter === 'completed') {
      return ['completed', 'delivered', 'cancelled'].includes(order.status);
    }
    return true;
  });

  if (loading) return <div className="text-center text-slate-400 py-8">Ładowanie zamówień...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Historia zamówień</h2>

        {/* Filtry */}
        <div className="flex gap-2">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            icon="📦"
          >
            Wszystkie ({orders.length})
          </FilterButton>
          <FilterButton
            active={filter === 'active'}
            onClick={() => setFilter('active')}
            icon="⏳"
          >
            W trakcie ({orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length})
          </FilterButton>
          <FilterButton
            active={filter === 'completed'}
            onClick={() => setFilter('completed')}
            icon="✅"
          >
            Zakończone ({orders.filter(o => ['completed', 'delivered', 'cancelled'].includes(o.status)).length})
          </FilterButton>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <div className="text-4xl mb-4">📦</div>
          <p>
            {filter === 'all' && 'Nie masz jeszcze żadnych zamówień'}
            {filter === 'active' && 'Brak aktywnych zamówień'}
            {filter === 'completed' && 'Brak zakończonych zamówień'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <motion.div
              key={order.id}
              className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              layout
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Zamówienie #{order.id.slice(-8)}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {new Date(order.created_at).toLocaleDateString('pl-PL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {order.restaurant_name && (
                    <p className="text-sm text-cyan-400 mt-1">
                      🏪 {order.restaurant_name}
                    </p>
                  )}
                  {order.dish_name && (
                    <p className="text-sm text-slate-300 mt-1">
                      🍽️ {order.dish_name}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusClass(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-slate-300">
                  Kwota: {(Number(order.total_price || 0) / 100).toFixed(2)} zł
                </div>
                {(order.status === 'pending' || order.status === 'confirmed') && (
                  <button
                    onClick={() => {
                      if (confirm('Czy na pewno chcesz anulować to zamówienie?')) {
                        cancelOrder(order.id)
                      }
                    }}
                    className="px-3 py-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
                  >
                    Anuluj
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterButton({ active, onClick, icon, children }) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-xl text-sm font-medium transition-all
        ${active
          ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 text-white border-2 border-cyan-500/50 shadow-lg'
          : 'bg-black/30 text-slate-300 border border-white/10 hover:bg-black/50 hover:border-white/20'
        }
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="mr-1">{icon}</span>
      {children}
    </motion.button>
  )
}

function RestaurantsTab({ restaurants, selectedRestaurant, menuItems, loadingMenu, onSelectRestaurant, onBack, addToCart }) {
  if (selectedRestaurant) {
    return (
      <div className="space-y-6">
        {/* Restaurant Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={onBack}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-slate-300 hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05, x: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              ← Wróć
            </motion.button>
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedRestaurant.name}</h2>
              <p className="text-sm text-slate-400">📍 {selectedRestaurant.city}</p>
            </div>
          </div>
        </div>

        {loadingMenu ? (
          <div className="text-center text-slate-400 py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="inline-block text-4xl mb-4"
            >
              ⏳
            </motion.div>
            <p>Ładowanie menu...</p>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            <div className="text-4xl mb-4">🍽️</div>
            <p>Brak pozycji w menu</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.id}
                className="rounded-xl border border-cyan-500/20 bg-black/40 p-5 backdrop-blur-xl group relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{
                  scale: 1.03,
                  y: -5,
                  boxShadow: "0 20px 40px rgba(0, 255, 255, 0.3)",
                  borderColor: "rgba(0, 255, 255, 0.5)"
                }}
              >
                {/* Glow effect on hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-white text-lg group-hover:text-cyan-300 transition-colors">
                      {item.name}
                    </h4>
                    <span className="text-cyan-400 font-bold text-lg whitespace-nowrap ml-2">
                      {Number(item.price).toFixed(2)} zł
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">{item.description}</p>
                  )}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(item, selectedRestaurant);
                    }}
                    className="w-full mt-2 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gradient-to-r hover:from-cyan-500/30 hover:to-purple-500/30"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🛒 Dodaj do koszyka
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Dostępne restauracje</h2>
        <p className="text-slate-400">Wybierz restaurację, aby zobaczyć menu i złożyć zamówienie</p>
      </div>

      {restaurants.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <div className="text-4xl mb-4">🏪</div>
          <p>Brak dostępnych restauracji</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant, index) => (
            <motion.div
              key={restaurant.id}
              className="rounded-xl border border-cyan-500/20 bg-black/40 p-6 backdrop-blur-xl cursor-pointer group relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{
                scale: 1.05,
                y: -8,
                boxShadow: "0 25px 50px rgba(0, 255, 255, 0.3)",
                borderColor: "rgba(0, 255, 255, 0.5)"
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectRestaurant(restaurant)}
            >
              {/* Animated background gradient */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
              />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">🏪</div>
                  <motion.div
                    className="text-cyan-400 opacity-0 group-hover:opacity-100"
                    initial={{ x: -10 }}
                    whileHover={{ x: 0 }}
                  >
                    →
                  </motion.div>
                </div>
                <h3 className="font-bold text-white text-xl mb-2 group-hover:text-cyan-300 transition-colors">
                  {restaurant.name}
                </h3>
                <p className="text-sm text-slate-400 mb-3">📍 {restaurant.city}</p>
                {restaurant.cuisine_type && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{restaurant.cuisine_type}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
                  <span>Zobacz menu</span>
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </div>
              </div>

              {/* Bottom accent line */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReservationsTab({ userId }) {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const { push } = useToast()

  useEffect(() => {
    if (!userId) return

    const loadReservations = async () => {
      try {
        setLoading(true)
        // Assuming we have a reservations table
        const { data, error } = await supabase
          .from('table_reservations')
          .select('*, restaurants(name)')
          .eq('user_id', userId)
          .order('reservation_date', { ascending: false })

        if (error) throw error
        setReservations(data || [])
      } catch (e) {
        AmberLogger.error('Error loading reservations:', e)
      } finally {
        setLoading(false)
      }
    }

    loadReservations()
  }, [userId])

  const cancelReservation = async (reservationId) => {
    try {
      const { error } = await supabase
        .from('table_reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservationId)
        .eq('user_id', userId)

      if (error) throw error

      push('Rezerwacja została anulowana', 'success')

      // Refresh
      const { data } = await supabase
        .from('table_reservations')
        .select('*, restaurants(name)')
        .eq('user_id', userId)
        .order('reservation_date', { ascending: false })

      setReservations(data || [])
    } catch (e) {
      push('Błąd podczas anulowania rezerwacji', 'error')
      AmberLogger.error(e)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400 py-8">Ładowanie rezerwacji...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Moje Rezerwacje</h2>
        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium hover:shadow-lg transition-all">
          + Nowa rezerwacja
        </button>
      </div>

      {reservations.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <div className="text-4xl mb-4">🪑</div>
          <p>Nie masz jeszcze żadnych rezerwacji</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation, index) => (
            <motion.div
              key={reservation.id}
              className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {reservation.restaurants?.name || 'Restauracja'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {new Date(reservation.reservation_date).toLocaleDateString('pl-PL', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-cyan-400 mt-1">
                    👥 {reservation.party_size} osób • 🪑 Stolik #{reservation.table_number || 'TBD'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getReservationStatusClass(reservation.status)}`}>
                  {getReservationStatusText(reservation.status)}
                </span>
              </div>

              {reservation.status === 'confirmed' && (
                <button
                  onClick={() => {
                    if (confirm('Czy na pewno chcesz anulować tę rezerwację?')) {
                      cancelReservation(reservation.id)
                    }
                  }}
                  className="px-3 py-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
                >
                  Anuluj rezerwację
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsTab({ profile, loyaltyPoints, notifications, setNotifications }) {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [orderUpdates, setOrderUpdates] = useState(true)
  const [promotions, setPromotions] = useState(true)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Ustawienia</h2>
        <p className="text-slate-400">Zarządzaj swoimi preferencjami i powiadomieniami</p>
      </div>

      {/* Loyalty Program */}
      <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Program Lojalnościowy</h3>
            <p className="text-sm text-slate-300">Zbieraj punkty za każde zamówienie</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-400">{loyaltyPoints}</div>
            <div className="text-xs text-slate-400">punktów</div>
          </div>
        </div>
        <div className="w-full bg-black/30 rounded-full h-2 mb-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((loyaltyPoints % 100), 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-400">
          {100 - (loyaltyPoints % 100)} punktów do następnej nagrody
        </p>
      </div>

      {/* Notifications Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Powiadomienia</h3>

        <SettingToggle
          label="Powiadomienia Email"
          description="Otrzymuj aktualizacje na email"
          checked={emailNotifications}
          onChange={setEmailNotifications}
          icon="📧"
        />

        <SettingToggle
          label="Powiadomienia Push"
          description="Powiadomienia w przeglądarce"
          checked={pushNotifications}
          onChange={setPushNotifications}
          icon="🔔"
        />

        <SettingToggle
          label="Powiadomienia SMS"
          description="Otrzymuj SMS o statusie zamówienia"
          checked={smsNotifications}
          onChange={setSmsNotifications}
          icon="📱"
        />

        <SettingToggle
          label="Aktualizacje zamówień"
          description="Powiadomienia o statusie zamówień"
          checked={orderUpdates}
          onChange={setOrderUpdates}
          icon="📦"
        />

        <SettingToggle
          label="Promocje i oferty"
          description="Otrzymuj informacje o promocjach"
          checked={promotions}
          onChange={setPromotions}
          icon="🎁"
        />
      </div>

      {/* Account Actions */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Konto</h3>

        <button className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-left">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Zmień hasło</div>
              <div className="text-xs text-slate-400">Zaktualizuj swoje hasło</div>
            </div>
            <span>🔒</span>
          </div>
        </button>

        <button className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-left">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Historia płatności</div>
              <div className="text-xs text-slate-400">Zobacz wszystkie transakcje</div>
            </div>
            <span>💳</span>
          </div>
        </button>

        <button className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-left">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Pobierz dane</div>
              <div className="text-xs text-slate-400">Eksportuj swoje dane</div>
            </div>
            <span>📥</span>
          </div>
        </button>

        <button className="w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-left">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Usuń konto</div>
              <div className="text-xs text-red-400/70">Trwale usuń swoje konto</div>
            </div>
            <span>⚠️</span>
          </div>
        </button>
      </div>
    </div>
  )
}

function SettingToggle({ label, description, checked, onChange, icon }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="font-medium text-white">{label}</div>
          <div className="text-xs text-slate-400">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'bg-gray-600'
        }`}
      >
        <div
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'transform translate-x-6' : ''
          }`}
        />
      </button>
    </div>
  )
}

function getStatusClass(status) {
  switch(status) {
    case 'delivered': return 'bg-green-600/20 text-green-500 border-green-600/30'
    case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'preparing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'pending': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

function getStatusText(status) {
  switch(status) {
    case 'delivered': return 'Dostarczone'
    case 'completed': return 'Gotowe do odbioru'
    case 'preparing': return 'W przygotowaniu'
    case 'pending': return 'Oczekiwanie'
    case 'cancelled': return 'Anulowane'
    default: return 'Nieznany'
  }
}

function getReservationStatusClass(status) {
  switch(status) {
    case 'confirmed': return 'bg-green-600/20 text-green-500 border-green-600/30'
    case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

function getReservationStatusText(status) {
  switch(status) {
    case 'confirmed': return 'Potwierdzona'
    case 'pending': return 'Oczekuje'
    case 'cancelled': return 'Anulowana'
    case 'completed': return 'Zakończona'
    default: return 'Nieznany'
  }
}

function StatsCards({ orders }) {
  const totalOrders = orders.filter(o => o.status !== 'cancelled').length
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length
  const totalSpent = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total_price) || 0) / 100, 0)
  const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length

  const stats = [
    {
      title: "Wszystkich zamówień",
      value: totalOrders,
      icon: "📦",
      gradient: "from-orange-500/25 to-orange-500/10",
      borderColor: "border-orange-500/30",
      glowColor: "rgba(249, 115, 22, 0.3)"
    },
    {
      title: "Ukończonych",
      value: completedOrders,
      icon: "✅",
      gradient: "from-emerald-500/25 to-emerald-500/10",
      borderColor: "border-emerald-500/30",
      glowColor: "rgba(16, 185, 129, 0.3)"
    },
    {
      title: "Łączna kwota",
      value: `${totalSpent.toFixed(2)} zł`,
      icon: "💰",
      gradient: "from-purple-500/25 to-purple-500/10",
      borderColor: "border-purple-500/30",
      glowColor: "rgba(168, 85, 247, 0.3)"
    },
    {
      title: "W trakcie",
      value: pendingOrders,
      icon: "⏳",
      gradient: "from-cyan-500/25 to-cyan-500/10",
      borderColor: "border-cyan-500/30",
      glowColor: "rgba(6, 182, 212, 0.3)"
    }
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          gradient={stat.gradient}
          borderColor={stat.borderColor}
          glowColor={stat.glowColor}
          index={index}
        />
      ))}
    </div>
  )
}

function StatCard({ title, value, icon, gradient, borderColor, glowColor, index }) {
  return (
    <motion.div
      className={`rounded-2xl border ${borderColor} bg-black/40 backdrop-blur-xl p-6 transition-all shadow-2xl relative overflow-hidden group cursor-pointer`}
      whileHover={{
        scale: 1.05,
        y: -5,
        boxShadow: `0 20px 40px ${glowColor}`,
        transition: { type: "spring", stiffness: 300 }
      }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        delay: index * 0.1
      }}
      style={{
        background: `linear-gradient(135deg, ${gradient.includes('orange') ? 'rgba(249, 115, 22, 0.1)' : gradient.includes('emerald') ? 'rgba(16, 185, 129, 0.1)' : gradient.includes('purple') ? 'rgba(168, 85, 247, 0.1)' : 'rgba(6, 182, 212, 0.1)'}, rgba(0, 0, 0, 0.3))`,
        borderColor: borderColor.includes('orange') ? 'rgba(249, 115, 22, 0.3)' : borderColor.includes('emerald') ? 'rgba(16, 185, 129, 0.3)' : borderColor.includes('purple') ? 'rgba(168, 85, 247, 0.3)' : 'rgba(6, 182, 212, 0.3)'
      }}
    >
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${glowColor}, transparent 70%)`
        }}
      />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <motion.p
            className="text-sm font-medium text-slate-300 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            {title}
          </motion.p>
          <motion.p
            className="text-3xl font-bold text-white"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.3 + index * 0.1,
              type: "spring",
              stiffness: 200
            }}
          >
            {value}
          </motion.p>
        </div>
        <motion.div
          className="text-3xl opacity-80"
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            delay: index * 0.2
          }}
        >
          {icon}
        </motion.div>
      </div>

      {/* Bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)`
        }}
      />
    </motion.div>
  )
}

function CartTab() {
  const { cart, restaurant, total, removeFromCart, updateQuantity, clearCart, submitOrder, isSubmitting } = useCart();
  const { push } = useToast();

  if (cart.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🛒</div>
        <h3 className="text-xl font-semibold text-white mb-2">Koszyk jest pusty</h3>
        <p className="text-slate-400">Dodaj produkty z zakładki "Restauracje"</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Twój koszyk</h2>
        <button
          onClick={clearCart}
          className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
        >
          Wyczyść koszyk
        </button>
      </div>

      <div className="space-y-4">
        {cart.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex-1">
              <h3 className="font-medium text-white">{item.name}</h3>
              <p className="text-sm text-slate-400">{((item.price * item.quantity) / 100).toFixed(2)} zł</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                -
              </button>
              <span className="w-8 text-center text-white">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                +
              </button>
              <button
                onClick={() => removeFromCart(item.id)}
                className="ml-2 p-2 text-red-400 hover:text-red-300"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {restaurant && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <h3 className="font-medium text-white mb-2">Restauracja: {restaurant.name}</h3>
          <p className="text-sm text-slate-300">{restaurant.address}</p>
        </div>
      )}

      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
        <span className="text-lg font-bold text-white">Razem: {(total / 100).toFixed(2)} zł</span>
        <button
          onClick={() => {
            const deliveryInfo = {
              name: 'Użytkownik',
              phone: '',
              address: '',
              notes: ''
            };
            submitOrder(deliveryInfo);
          }}
          disabled={isSubmitting}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Składanie...' : 'Złóż zamówienie'}
        </button>
      </div>
    </div>
  );
}
