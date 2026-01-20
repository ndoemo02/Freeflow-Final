/**
 * Client Panel - ServiceHub-style Customer Dashboard
 * 
 * Features:
 * - Responsive sidebar (desktop) / bottom nav (mobile)
 * - Dashboard with quick services, stats, active orders
 * - Food, Taxi, Hotels sections
 * - Orders history
 * - Payments & Profile management
 * - Settings
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../state/auth';
import { useOrders } from '../../hooks/useOrders';
import { supabase } from '../../lib/supabase';
import './ClientPanel.css';

// Types
type SectionName = 'dashboard' | 'food' | 'taxi' | 'hotels' | 'orders' | 'payments' | 'profile' | 'settings';

interface NavItem {
    id: SectionName;
    icon: string;
    label: string;
    badge?: number;
}

// Navigation items
const mainNavItems: NavItem[] = [
    { id: 'dashboard', icon: 'fa-th-large', label: 'Dashboard' },
    { id: 'food', icon: 'fa-utensils', label: 'Jedzenie' },
    { id: 'taxi', icon: 'fa-car', label: 'Taxi' },
    { id: 'hotels', icon: 'fa-hotel', label: 'Hotele' },
    { id: 'orders', icon: 'fa-clipboard-list', label: 'Zamówienia' },
];

const settingsNavItems: NavItem[] = [
    { id: 'payments', icon: 'fa-credit-card', label: 'Płatności' },
    { id: 'profile', icon: 'fa-user-cog', label: 'Profil' },
    { id: 'settings', icon: 'fa-cog', label: 'Ustawienia' },
];

const bottomNavItems: NavItem[] = [
    { id: 'dashboard', icon: 'fa-th-large', label: 'Start' },
    { id: 'food', icon: 'fa-utensils', label: 'Jedzenie' },
    { id: 'taxi', icon: 'fa-car', label: 'Taxi' },
    { id: 'hotels', icon: 'fa-hotel', label: 'Hotele' },
    { id: 'profile', icon: 'fa-user', label: 'Profil' },
];

export default function ClientPanel() {
    const { user } = useAuth();
    const { orders, loading: loadingOrders } = useOrders({ userId: user?.id });

    // Local state for restaurants
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loadingRestaurants, setLoadingRestaurants] = useState(false);

    const [activeSection, setActiveSection] = useState<SectionName>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showAddCardModal, setShowAddCardModal] = useState(false);

    // Fetch restaurants
    useEffect(() => {
        const fetchRestaurants = async () => {
            setLoadingRestaurants(true);
            const { data, error } = await supabase
                .from('restaurants')
                .select('*')
                .limit(20);

            if (data) setRestaurants(data);
            setLoadingRestaurants(false);
        };
        fetchRestaurants();
    }, []);

    const handleSectionChange = (section: SectionName) => {
        setActiveSection(section);
        setSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Calculated Stats
    const stats = useMemo(() => {
        const activeOrders = orders.filter((o: any) => ['pending', 'new', 'preparing', 'ready'].includes(o.status));
        const totalSpent = orders.reduce((sum: number, o: any) => sum + (Number(o.total_price) || 0), 0);
        const activeOrder = activeOrders.length > 0 ? activeOrders[0] : null;
        const currentMonthOrders = orders.filter((o: any) => new Date(o.created_at).getMonth() === new Date().getMonth());

        return {
            activeCount: activeOrders.length,
            totalSpent,
            activeOrder,
            monthCount: currentMonthOrders.length
        };
    }, [orders]);

    // Update nav badge
    const navItemsWithBadge = mainNavItems.map(item =>
        item.id === 'orders' ? { ...item, badge: stats.activeCount || undefined } : item
    );

    return (
        <div className="client-panel">
            {/* Mobile Header */}
            <header className="mobile-header lg:hidden">
                <button onClick={() => setSidebarOpen(true)} className="header-btn">
                    <i className="fas fa-bars" />
                </button>
                <div className="header-logo">
                    <div className="logo-icon">
                        <i className="fas fa-cube" />
                    </div>
                    <span className="logo-text">FreeFlow</span>
                </div>
                <button onClick={() => handleSectionChange('orders')} className="header-btn">
                    <i className="fas fa-bell" />
                    {stats.activeCount > 0 && <span className="notification-dot" />}
                </button>
            </header>

            {/* Mobile Bottom Navigation */}
            <nav className="bottom-nav lg:hidden">
                {bottomNavItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleSectionChange(item.id)}
                        className={`bottom-nav-item ${activeSection === item.id ? 'active' : ''}`}
                    >
                        <i className={`fas ${item.icon}`} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="panel-layout">
                {/* Sidebar */}
                <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                    <div className="sidebar-header">
                        <div className="sidebar-logo">
                            <div className="logo-icon-lg">
                                <i className="fas fa-cube" />
                            </div>
                            <div>
                                <h1>FreeFlow</h1>
                                <p>Panel Klienta</p>
                            </div>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="sidebar-close lg:hidden">
                            <i className="fas fa-times" />
                        </button>
                    </div>

                    <nav className="sidebar-nav">
                        <p className="nav-label">Menu główne</p>
                        {navItemsWithBadge.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleSectionChange(item.id)}
                                className={`nav-btn ${activeSection === item.id ? 'active' : ''}`}
                            >
                                <i className={`fas ${item.icon}`} />
                                <span>{item.label}</span>
                                {item.badge && <span className="nav-badge">{item.badge}</span>}
                            </button>
                        ))}

                        <p className="nav-label mt-6">Ustawienia</p>
                        {settingsNavItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleSectionChange(item.id)}
                                className={`nav-btn ${activeSection === item.id ? 'active' : ''}`}
                            >
                                <i className={`fas ${item.icon}`} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="sidebar-user">
                        <img src={`https://ui-avatars.com/api/?name=${user?.email || 'Guest'}&background=667eea&color=fff`} alt="User" />
                        <div>
                            <p className="user-name">{user?.email?.split('@')[0] || 'Gość'}</p>
                            <p className="user-email">{user?.email || 'Zaloguj się'}</p>
                        </div>
                        <button className="logout-btn">
                            <i className="fas fa-sign-out-alt" />
                        </button>
                    </div>
                </aside>

                {/* Overlay */}
                {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

                {/* Main Content */}
                <main className="main-content">
                    {/* Dashboard */}
                    {activeSection === 'dashboard' && (
                        <section className="section animate-fade">
                            <div className="section-header">
                                <div>
                                    <h2>Witaj, {user?.email?.split('@')[0] || 'Gościu'}! 👋</h2>
                                    <p>Co chciałbyś dzisiaj zamówić?</p>
                                </div>
                                <div className="search-box hidden lg:flex">
                                    <i className="fas fa-search" />
                                    <input type="text" placeholder="Szukaj usług..." />
                                </div>
                            </div>

                            {/* Quick Services */}
                            <div className="quick-services">
                                <button onClick={() => handleSectionChange('food')} className="service-card orange">
                                    <div className="service-icon"><i className="fas fa-utensils" /></div>
                                    <h3>Jedzenie</h3>
                                    <p>{restaurants.length || '0'} restauracji</p>
                                </button>
                                <button onClick={() => handleSectionChange('taxi')} className="service-card yellow">
                                    <div className="service-icon"><i className="fas fa-car" /></div>
                                    <h3>Taxi</h3>
                                    <p>Dostępne 24/7</p>
                                </button>
                                <button onClick={() => handleSectionChange('hotels')} className="service-card blue">
                                    <div className="service-icon"><i className="fas fa-hotel" /></div>
                                    <h3>Hotele</h3>
                                    <p>Znajdź nocleg</p>
                                </button>
                                <button onClick={() => handleSectionChange('orders')} className="service-card green">
                                    <div className="service-icon"><i className="fas fa-history" /></div>
                                    <h3>Zamówienia</h3>
                                    <p>{stats.activeCount} aktywne</p>
                                </button>
                            </div>

                            {/* Stats & Active Order */}
                            <div className="dashboard-grid">
                                <div className="stats-group">
                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span>Wydatki</span>
                                            <span className="trend positive">PLN</span>
                                        </div>
                                        <p className="stat-value">{stats.totalSpent.toFixed(2)} zł</p>
                                        <p className="stat-label">Razem</p>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span>Zamówienia</span>
                                            <span className="trend positive">Nowe</span>
                                        </div>
                                        <p className="stat-value">{stats.monthCount}</p>
                                        <p className="stat-label">Ten miesiąc</p>
                                    </div>
                                    {/* Placeholders for Loyalty - could be wired later */}
                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span>Punkty</span>
                                            <span className="trend gold">Gold</span>
                                        </div>
                                        <p className="stat-value">0</p>
                                        <p className="stat-label">Program lojalnościowy</p>
                                    </div>
                                </div>

                                {/* Active Order Card */}
                                {stats.activeOrder ? (
                                    <div className="active-order-card">
                                        <div className="card-header">
                                            <h4>Aktywne zamówienie</h4>
                                            <span className="status-badge green">{stats.activeOrder.status}</span>
                                        </div>
                                        <div className="order-info">
                                            <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                                                {stats.activeOrder.channel === 'taxi' ? '🚕' :
                                                    stats.activeOrder.channel === 'hotel' ? '🏨' : '🍔'}
                                            </div>
                                            <div>
                                                <p className="order-restaurant">
                                                    {stats.activeOrder.restaurant_name ||
                                                        (stats.activeOrder.items && stats.activeOrder.items[0]?.name) ||
                                                        'Zamówienie'}
                                                </p>
                                                <p className="order-items">
                                                    #{stats.activeOrder.id.slice(0, 8)} • {(Number(stats.activeOrder.total_price) || 0).toFixed(2)} zł
                                                </p>
                                            </div>
                                        </div>
                                        <div className="order-progress">
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{ width: '50%' }} />
                                            </div>
                                            <div className="progress-labels">
                                                <span>Przyjęte</span>
                                                <span className="current">W realizacji</span>
                                                <span className="pending">Gotowe</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="active-order-card empty flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                        <i className="fas fa-check-circle text-4xl mb-2 opacity-30" />
                                        <p>Brak aktywnych zamówień</p>
                                        <button onClick={() => handleSectionChange('food')} className="text-blue-400 text-sm mt-2 hover:underline">
                                            Zamów coś pysznego
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Recent Orders & Promotions */}
                            <div className="bottom-grid">
                                <div className="recent-orders-card">
                                    <div className="card-header">
                                        <h4>Ostatnie zamówienia</h4>
                                        <button onClick={() => handleSectionChange('orders')}>Zobacz wszystkie</button>
                                    </div>
                                    <div className="orders-list">
                                        {orders.slice(0, 3).map((order: any, i: number) => (
                                            <div key={i} className="order-row">
                                                <div className={`order-icon ${order.channel === 'taxi' ? 'yellow' : 'orange'}`}>
                                                    <i className={`fas ${order.channel === 'taxi' ? 'fa-car' : 'fa-utensils'}`} />
                                                </div>
                                                <div className="order-details">
                                                    <p>{order.restaurant_name || 'Zamówienie'}</p>
                                                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <span className="order-price">{(Number(order.total_price) || 0).toFixed(2)} zł</span>
                                            </div>
                                        ))}
                                        {orders.length === 0 && (
                                            <p className="text-center text-gray-500 py-4">Brak historii zamówień</p>
                                        )}
                                    </div>
                                </div>

                                <div className="promotions-card">
                                    <div className="card-header">
                                        <h4>Promocje dla Ciebie</h4>
                                    </div>
                                    <div className="promos-list">
                                        <div className="promo-banner purple">
                                            <div>
                                                <p className="promo-title">-20% na jedzenie</p>
                                                <p className="promo-desc">Min. zamówienie 50 zł</p>
                                            </div>
                                            <div className="promo-code">
                                                <p>FOOD20</p>
                                                <span>Ważny 3 dni</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Food Section */}
                    {activeSection === 'food' && (
                        <section className="section animate-fade">
                            <div className="section-header">
                                <div>
                                    <h2>Zamów jedzenie 🍕</h2>
                                    <p>Wybierz spośród 150+ restauracji</p>
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="categories-scroll">
                                <button className="category-btn active">Wszystkie</button>
                                <button className="category-btn">🍕 Pizza</button>
                                <button className="category-btn">🍔 Burgery</button>
                                <button className="category-btn">🍣 Sushi</button>
                                <button className="category-btn">🥗 Sałatki</button>
                                <button className="category-btn">🍝 Pasta</button>
                            </div>

                            {/* Restaurants Grid */}
                            <div className="restaurants-grid">
                                {loadingRestaurants ? (
                                    <p className="text-gray-400">Ładowanie restauracji...</p>
                                ) : restaurants.length === 0 ? (
                                    <p className="text-gray-400">Brak dostępnych restauracji.</p>
                                ) : (
                                    restaurants.map((r, i) => (
                                        <div key={r.id || i} className="restaurant-card">
                                            {/* Placeholder image if not present */}
                                            <img src={r.img || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=200&fit=crop'} alt={r.name} />
                                            <div className="restaurant-info">
                                                <div className="restaurant-header">
                                                    <h4>{r.name}</h4>
                                                    <span className="rating"><i className="fas fa-star" /> {r.rating || 'New'}</span>
                                                </div>
                                                <p className="cuisine">{r.cuisine_type || 'Kuchnia'}</p>
                                                <div className="restaurant-meta">
                                                    <span><i className="fas fa-clock" /> {r.delivery_time || '30-40'} min</span>
                                                    <span className="free">Dostawa gratis</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    )}

                    {/* Taxi Section */}
                    {activeSection === 'taxi' && (
                        <section className="section animate-fade">
                            <div className="section-header">
                                <div>
                                    <h2>Zamów Taxi 🚕</h2>
                                    <p>Szybko i wygodnie dotrzyj do celu</p>
                                </div>
                            </div>

                            <div className="taxi-grid">
                                <div className="taxi-form-card">
                                    <h4>Zarezerwuj przejazd</h4>
                                    <div className="taxi-form">
                                        <div className="input-with-dot green">
                                            <input type="text" placeholder="Skąd jedziesz?" />
                                        </div>
                                        <div className="input-with-dot red">
                                            <input type="text" placeholder="Dokąd jedziesz?" />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Data</label>
                                                <input type="date" />
                                            </div>
                                            <div className="form-group">
                                                <label>Godzina</label>
                                                <input type="time" />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Typ pojazdu</label>
                                            <div className="vehicle-options">
                                                <button className="vehicle-btn active">
                                                    <i className="fas fa-car" />
                                                    <p>Standard</p>
                                                    <span>od 15 zł</span>
                                                </button>
                                                <button className="vehicle-btn">
                                                    <i className="fas fa-car-side" />
                                                    <p>Comfort</p>
                                                    <span>od 25 zł</span>
                                                </button>
                                                <button className="vehicle-btn">
                                                    <i className="fas fa-shuttle-van" />
                                                    <p>Van</p>
                                                    <span>od 40 zł</span>
                                                </button>
                                            </div>
                                        </div>
                                        <button className="primary-btn">
                                            <i className="fas fa-search" /> Znajdź kierowcę
                                        </button>
                                    </div>
                                </div>

                                <div className="taxi-sidebar">
                                    <div className="map-placeholder">
                                        <i className="fas fa-map-marked-alt" />
                                        <p>Mapa trasy</p>
                                    </div>
                                    <div className="recent-addresses">
                                        <h4>Ostatnie adresy</h4>
                                        <button className="address-btn">
                                            <div className="address-icon"><i className="fas fa-home" /></div>
                                            <div>
                                                <p>Dom</p>
                                                <span>ul. Kwiatowa 15, Warszawa</span>
                                            </div>
                                        </button>
                                        <button className="address-btn">
                                            <div className="address-icon"><i className="fas fa-briefcase" /></div>
                                            <div>
                                                <p>Praca</p>
                                                <span>ul. Marszałkowska 100, Warszawa</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Hotels Section */}
                    {activeSection === 'hotels' && (
                        <section className="section animate-fade">
                            <div className="section-header">
                                <div>
                                    <h2>Znajdź nocleg 🏨</h2>
                                    <p>Hotele, apartamenty i więcej</p>
                                </div>
                            </div>

                            {/* Search Form */}
                            <div className="hotel-search-card">
                                <div className="hotel-search-form">
                                    <div className="form-group">
                                        <label>Gdzie?</label>
                                        <input type="text" placeholder="Miasto lub hotel" />
                                    </div>
                                    <div className="form-group">
                                        <label>Zameldowanie</label>
                                        <input type="date" />
                                    </div>
                                    <div className="form-group">
                                        <label>Wymeldowanie</label>
                                        <input type="date" />
                                    </div>
                                    <div className="form-group">
                                        <label>Goście</label>
                                        <select>
                                            <option>1 osoba</option>
                                            <option>2 osoby</option>
                                            <option>3 osoby</option>
                                            <option>4+ osób</option>
                                        </select>
                                    </div>
                                </div>
                                <button className="primary-btn">
                                    <i className="fas fa-search" /> Szukaj
                                </button>
                            </div>

                            {/* Hotels Grid */}
                            <div className="hotels-grid">
                                {[
                                    { name: 'Hotel Marriott Warsaw', location: 'Centrum, Warszawa', rating: 4.9, price: 289, amenities: ['WiFi', 'Basen', 'SPA'], img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop' },
                                    { name: 'Apartament Luxury Suite', location: 'Śródmieście, Kraków', rating: 4.7, price: 199, amenities: ['WiFi', 'Kuchnia', 'Taras'], img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=200&fit=crop' },
                                    { name: 'Sofitel Grand Sopot', location: 'Plaża, Sopot', rating: 4.8, price: 459, amenities: ['WiFi', 'Plaża', 'SPA'], img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=200&fit=crop' },
                                ].map((h, i) => (
                                    <div key={i} className="hotel-card">
                                        <div className="hotel-image">
                                            <img src={h.img} alt={h.name} />
                                            <span className="hotel-rating">⭐ {h.rating}</span>
                                        </div>
                                        <div className="hotel-info">
                                            <h4>{h.name}</h4>
                                            <p className="location"><i className="fas fa-map-marker-alt" /> {h.location}</p>
                                            <div className="amenities">
                                                {h.amenities.map((a, j) => <span key={j}>{a}</span>)}
                                            </div>
                                            <div className="hotel-footer">
                                                <div>
                                                    <span className="price">{h.price} zł</span>
                                                    <span className="per-night">/ noc</span>
                                                </div>
                                                <button className="book-btn">Rezerwuj</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Orders Section */}
                    {activeSection === 'orders' && (
                        <section className="section animate-fade">
                            <div className="section-header">
                                <div>
                                    <h2>Twoje zamówienia 📋</h2>
                                    <p>Historia i aktywne zamówienia</p>
                                </div>
                                <div className="filter-buttons">
                                    <button className="filter-btn active">Aktywne</button>
                                    <button className="filter-btn">Historia</button>
                                </div>
                            </div>

                            <div className="orders-full-list">
                                {loadingOrders ? (
                                    <p className="text-center text-gray-500 py-10">Ładowanie zamówień...</p>
                                ) : orders.length === 0 ? (
                                    <div className="text-center py-12">
                                        <i className="fas fa-receipt text-4xl text-gray-600 mb-4" />
                                        <p className="text-gray-400">Nie masz jeszcze żadnych zamówień.</p>
                                    </div>
                                ) : (
                                    orders.map((order: any) => (
                                        <div key={order.id} className="order-full-card">
                                            <div className="order-full-header">
                                                <div className="order-full-info">
                                                    <div className={`order-icon-lg ${order.channel === 'taxi' ? 'yellow' : 'orange'}`}>
                                                        <i className={`fas ${order.channel === 'taxi' ? 'fa-car' : 'fa-utensils'}`} />
                                                    </div>
                                                    <div>
                                                        <h4>{order.restaurant_name || (order.channel === 'taxi' ? 'Taxi' : 'Zamówienie')}</h4>
                                                        <p>Zamówienie #{order.id.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                                <span className={`status-badge ${order.status === 'completed' ? 'green' : 'blue'}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <div className="order-full-details">
                                                <p>
                                                    {order.items && order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                                                </p>
                                                <div className="order-full-meta">
                                                    <span>{new Date(order.created_at).toLocaleString()}</span>
                                                    <span className="amount">{(Number(order.total_price) || 0).toFixed(2)} zł</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    )}

                    {/* Payments Section */}
                    {activeSection === 'payments' && (
                        <section className="section animate-fade">
                            <div className="section-header">
                                <div>
                                    <h2>Metody płatności 💳</h2>
                                    <p>Zarządzaj swoimi kartami</p>
                                </div>
                                <button onClick={() => setShowAddCardModal(true)} className="primary-btn">
                                    <i className="fas fa-plus" /> Dodaj kartę
                                </button>
                            </div>

                            <div className="payments-grid">
                                <div className="saved-cards">
                                    <h4>Zapisane karty</h4>
                                    <div className="credit-card purple">
                                        <div className="card-header">
                                            <i className="fab fa-cc-visa" />
                                            <span className="default-badge">Domyślna</span>
                                        </div>
                                        <p className="card-number">•••• •••• •••• 4582</p>
                                        <div className="card-footer">
                                            <div>
                                                <span className="label">Właściciel</span>
                                                <span className="value">JAN KOWALSKI</span>
                                            </div>
                                            <div>
                                                <span className="label">Ważność</span>
                                                <span className="value">12/26</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="credit-card dark">
                                        <div className="card-header">
                                            <i className="fab fa-cc-mastercard" />
                                        </div>
                                        <p className="card-number">•••• •••• •••• 8891</p>
                                        <div className="card-footer">
                                            <div>
                                                <span className="label">Właściciel</span>
                                                <span className="value">JAN KOWALSKI</span>
                                            </div>
                                            <div>
                                                <span className="label">Ważność</span>
                                                <span className="value">08/25</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="other-payments">
                                    <h4>Inne metody płatności</h4>
                                    <div className="payment-methods-list">
                                        <div className="payment-method">
                                            <div className="payment-icon blue"><i className="fab fa-paypal" /></div>
                                            <div>
                                                <p>PayPal</p>
                                                <span>jan.kowalski@email.com</span>
                                            </div>
                                            <label className="toggle">
                                                <input type="checkbox" defaultChecked />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="payment-method">
                                            <div className="payment-icon green"><i className="fab fa-google-pay" /></div>
                                            <div>
                                                <p>Google Pay</p>
                                                <span>Połączony</span>
                                            </div>
                                            <label className="toggle">
                                                <input type="checkbox" defaultChecked />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="payment-method">
                                            <div className="payment-icon red"><i className="fas fa-university" /></div>
                                            <div>
                                                <p>BLIK</p>
                                                <span>Płatności mobilne</span>
                                            </div>
                                            <label className="toggle">
                                                <input type="checkbox" defaultChecked />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="billing-address">
                                        <div className="billing-header">
                                            <h5>Adres rozliczeniowy</h5>
                                            <button>Edytuj</button>
                                        </div>
                                        <p>Jan Kowalski</p>
                                        <span>ul. Kwiatowa 15/3<br />00-001 Warszawa</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Profile Section */}
                    {activeSection === 'profile' && (
                        <section className="section animate-fade">
                            <div className="section-header">
                                <div>
                                    <h2>Twój profil 👤</h2>
                                    <p>Zarządzaj swoimi danymi</p>
                                </div>
                            </div>

                            <div className="profile-grid">
                                <div className="profile-card">
                                    <div className="profile-avatar">
                                        <img src="https://ui-avatars.com/api/?name=Jan+Kowalski&background=667eea&color=fff&size=128" alt="Avatar" />
                                        <button className="avatar-edit">
                                            <i className="fas fa-camera" />
                                        </button>
                                    </div>
                                    <h4>Jan Kowalski</h4>
                                    <p className="member-since">Członek od Styczeń 2023</p>
                                    <div className="member-badge">
                                        <i className="fas fa-crown" /> Gold Member
                                    </div>
                                    <div className="profile-stats">
                                        <div>
                                            <span className="stat-num">47</span>
                                            <span className="stat-text">Zamówień</span>
                                        </div>
                                        <div>
                                            <span className="stat-num">2,480</span>
                                            <span className="stat-text">Punktów</span>
                                        </div>
                                        <div>
                                            <span className="stat-num">12</span>
                                            <span className="stat-text">Kuponów</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="profile-form-card">
                                    <h4>Dane osobowe</h4>
                                    <form className="profile-form">
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Imię</label>
                                                <input type="text" defaultValue="Jan" />
                                            </div>
                                            <div className="form-group">
                                                <label>Nazwisko</label>
                                                <input type="text" defaultValue="Kowalski" />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Email</label>
                                            <input type="email" defaultValue="jan.kowalski@email.com" />
                                        </div>
                                        <div className="form-group">
                                            <label>Telefon</label>
                                            <input type="tel" defaultValue="+48 123 456 789" />
                                        </div>

                                        <hr />

                                        <h4>Adres dostawy</h4>
                                        <div className="form-group">
                                            <label>Ulica i numer</label>
                                            <input type="text" defaultValue="ul. Kwiatowa 15/3" />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Kod pocztowy</label>
                                                <input type="text" defaultValue="00-001" />
                                            </div>
                                            <div className="form-group">
                                                <label>Miasto</label>
                                                <input type="text" defaultValue="Warszawa" />
                                            </div>
                                        </div>

                                        <button type="button" className="primary-btn full">
                                            <i className="fas fa-save" /> Zapisz zmiany
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Settings Section */}
                    {activeSection === 'settings' && (
                        <section className="section animate-fade">
                            <div className="section-header">
                                <div>
                                    <h2>Ustawienia ⚙️</h2>
                                    <p>Dostosuj aplikację</p>
                                </div>
                            </div>

                            <div className="settings-grid">
                                <div className="settings-card">
                                    <h4><i className="fas fa-bell text-purple-500" /> Powiadomienia</h4>
                                    <div className="settings-list">
                                        <div className="setting-item">
                                            <div>
                                                <p>Push</p>
                                                <span>Powiadomienia na telefon</span>
                                            </div>
                                            <label className="toggle">
                                                <input type="checkbox" defaultChecked />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="setting-item">
                                            <div>
                                                <p>Email</p>
                                                <span>Potwierdzenia zamówień</span>
                                            </div>
                                            <label className="toggle">
                                                <input type="checkbox" defaultChecked />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="setting-item">
                                            <div>
                                                <p>Promocje</p>
                                                <span>Specjalne oferty</span>
                                            </div>
                                            <label className="toggle">
                                                <input type="checkbox" />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="settings-card">
                                    <h4><i className="fas fa-shield-alt text-green-500" /> Bezpieczeństwo</h4>
                                    <div className="security-list">
                                        <button className="security-item">
                                            <div className="security-icon"><i className="fas fa-key" /></div>
                                            <div>
                                                <p>Zmień hasło</p>
                                                <span>30 dni temu</span>
                                            </div>
                                            <i className="fas fa-chevron-right" />
                                        </button>
                                        <button className="security-item">
                                            <div className="security-icon"><i className="fas fa-mobile-alt" /></div>
                                            <div>
                                                <p>Weryfikacja 2FA</p>
                                                <span className="enabled">Włączona</span>
                                            </div>
                                            <i className="fas fa-chevron-right" />
                                        </button>
                                    </div>
                                </div>

                                <div className="settings-card">
                                    <h4><i className="fas fa-sliders-h text-blue-500" /> Preferencje</h4>
                                    <div className="preferences-form">
                                        <div className="form-group">
                                            <label>Język</label>
                                            <select>
                                                <option>🇵🇱 Polski</option>
                                                <option>🇬🇧 English</option>
                                                <option>🇩🇪 Deutsch</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Waluta</label>
                                            <select>
                                                <option>PLN (zł)</option>
                                                <option>EUR (€)</option>
                                                <option>USD ($)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="settings-card danger">
                                    <h4><i className="fas fa-exclamation-triangle" /> Strefa zagrożenia</h4>
                                    <div className="danger-actions">
                                        <button className="secondary-btn"><i className="fas fa-download" /> Pobierz moje dane</button>
                                        <button className="danger-btn"><i className="fas fa-trash-alt" /> Usuń konto</button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </main>
            </div>

            {/* Add Card Modal */}
            {showAddCardModal && (
                <div className="modal-overlay" onClick={() => setShowAddCardModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h4>Dodaj nową kartę</h4>
                            <button onClick={() => setShowAddCardModal(false)}>
                                <i className="fas fa-times" />
                            </button>
                        </div>
                        <form className="modal-form">
                            <div className="form-group">
                                <label>Numer karty</label>
                                <input type="text" placeholder="1234 5678 9012 3456" />
                            </div>
                            <div className="form-group">
                                <label>Imię i nazwisko</label>
                                <input type="text" placeholder="JAN KOWALSKI" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Data ważności</label>
                                    <input type="text" placeholder="MM/RR" />
                                </div>
                                <div className="form-group">
                                    <label>CVV</label>
                                    <input type="text" placeholder="123" />
                                </div>
                            </div>
                            <div className="checkbox-row">
                                <input type="checkbox" id="defaultCard" />
                                <label htmlFor="defaultCard">Ustaw jako domyślną</label>
                            </div>
                            <button type="button" onClick={() => setShowAddCardModal(false)} className="primary-btn full">
                                <i className="fas fa-plus" /> Dodaj kartę
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
