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
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/auth';
import { useOrders } from '../../hooks/useOrders';
import { supabase } from '../../lib/supabase';
import { ROUTES } from '../../app/routeConfig';
import StarfieldBackground from '../../components/StarfieldBackground';
import ErrorFallback from '../../components/ErrorFallback';
import { useToast } from '../../components/Toast';
import './ClientPanel.css';

// Types
type SectionName = 'dashboard' | 'food' | 'taxi' | 'hotels' | 'orders' | 'payments' | 'profile' | 'settings';

interface NavItem {
    id: SectionName;
    icon: string;
    label: string;
    badge?: number;
}

interface ProfileFormState {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    postal_code: string;
    city: string;
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

const PANEL_SECTIONS = new Set<SectionName>([
    'dashboard',
    'food',
    'taxi',
    'hotels',
    'orders',
    'payments',
    'profile',
    'settings',
]);

function getSectionFromSearch(search: string): SectionName | null {
    const value = new URLSearchParams(search).get('section');
    if (!value) return null;
    return PANEL_SECTIONS.has(value as SectionName) ? (value as SectionName) : null;
}

export default function ClientPanel() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, setUser } = useAuth() as any;
    const { push } = useToast() as any;
    const { orders, loading: loadingOrders, error: ordersError } = useOrders({ userId: user?.id });

    // Local state for restaurants
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loadingRestaurants, setLoadingRestaurants] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [activeSection, setActiveSection] = useState<SectionName>(() => getSectionFromSearch(location.search) || 'dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showAddCardModal, setShowAddCardModal] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileForm, setProfileForm] = useState<ProfileFormState>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        postal_code: '',
        city: '',
    });

    // Fetch restaurants
    useEffect(() => {
        const fetchRestaurants = async () => {
            setLoadingRestaurants(true);
            const { data, error } = await supabase
                .from('restaurants')
                .select('*')
                .limit(20);

            if (error) setFetchError(error.message);
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

    const handleGoHome = () => {
        setSidebarOpen(false);
        navigate(ROUTES.HOME);
    };

    useEffect(() => {
        const nextSection = getSectionFromSearch(location.search);
        if (nextSection) {
            setActiveSection(nextSection);
        }
    }, [location.search]);

    useEffect(() => {
        let cancelled = false;

        const loadProfile = async () => {
            if (!user?.id) return;

            const authUserMeta = (user as any)?.user_metadata || {};
            let metadata = authUserMeta;
            let email = user?.email || '';

            if (!metadata || Object.keys(metadata).length === 0) {
                const { data } = await supabase.auth.getUser();
                metadata = data?.user?.user_metadata || {};
                email = data?.user?.email || email;
            }

            if (cancelled) return;

            setProfileForm({
                first_name: String(metadata?.first_name || ''),
                last_name: String(metadata?.last_name || ''),
                email: String(email || ''),
                phone: String(metadata?.phone || ''),
                address: String(metadata?.address || ''),
                postal_code: String(metadata?.postal_code || ''),
                city: String(metadata?.city || ''),
            });
        };

        loadProfile();
        return () => {
            cancelled = true;
        };
    }, [user?.id, user?.email]);

    const handleProfileFieldChange = (key: keyof ProfileFormState, value: string) => {
        setProfileForm(prev => ({ ...prev, [key]: value }));
    };

    const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user?.id || profileSaving) return;

        setProfileSaving(true);
        try {
            const payload = {
                first_name: profileForm.first_name.trim(),
                last_name: profileForm.last_name.trim(),
                phone: profileForm.phone.trim(),
                address: profileForm.address.trim(),
                postal_code: profileForm.postal_code.trim(),
                city: profileForm.city.trim(),
            };

            const { data, error } = await supabase.auth.updateUser({ data: payload });
            if (error) throw error;

            if (data?.user && typeof setUser === 'function') {
                setUser(data.user);
            }

            console.log('[PROFILE_SAVE] saved');
            push?.('Dane profilu zapisane', 'success');
        } catch (saveError: any) {
            console.error('[PROFILE_SAVE] failed', saveError);
            push?.(saveError?.message || 'Nie udało się zapisać danych profilu', 'error');
        } finally {
            setProfileSaving(false);
        }
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
            <StarfieldBackground />
            {/* Mobile Header */}
            <header className="cp-mobile-header lg:hidden">
                <button onClick={() => setSidebarOpen(true)} className="cp-header-btn" aria-label="Menu">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
                        <path d="M3 12h18M3 6h18M3 18h18" />
                    </svg>
                </button>
                <div className="flex items-center gap-2">
                    <div className="cp-logo-badge">FF</div>
                    <span className="cp-logo-text">FreeFlow</span>
                </div>
                <button
                    onClick={() => {
                        console.log('[NAV_FIX] orders route -> /panel/client?section=orders');
                        navigate(ROUTES.ORDERS);
                    }}
                    className="cp-header-btn"
                    aria-label="Zamówienia"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {stats.activeCount > 0 && <span className="cp-notification-dot" />}
                </button>
            </header>

            {/* Global BottomTabBar handles mobile navigation */}

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
                        <button onClick={handleGoHome} className="nav-btn">
                            <i className="fas fa-home" />
                            <span>Home</span>
                        </button>
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
                    {ordersError && (
                        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                            Nie udało się pobrać części danych zamówień. Panel pokazuje dostępne dane.
                        </div>
                    )}
                    {/* Dashboard — action-first consumer home */}
                    {activeSection === 'dashboard' && (
                        <section className="section animate-fade cp-home">

                            {/* Greeting */}
                            <div className="cp-greeting">
                                <h2 className="cp-greeting-title">
                                    Cześć, {user?.email?.split('@')[0] || 'Gościu'}
                                </h2>
                                <p className="cp-greeting-sub">Co zamawiamy dzisiaj?</p>
                            </div>

                            {/* ── HERO: Jedzenie ────────────────────────────── */}
                            <button
                                onClick={() => handleSectionChange('food')}
                                className="cp-hero-card"
                                aria-label="Zamów jedzenie"
                            >
                                <div className="cp-hero-glow" />
                                <div className="cp-hero-inner">
                                    <div className="cp-hero-icon-wrap">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2C8 2 5 5 5 9c0 3.9 2.7 7.2 6.4 8.7L12 22l.6-4.3C16.3 16.2 19 12.9 19 9c0-4-3-7-7-7z" />
                                        </svg>
                                    </div>
                                    <div className="cp-hero-body">
                                        <span className="cp-hero-eyebrow">Główna kategoria</span>
                                        <h3 className="cp-hero-title">Jedzenie</h3>
                                        <p className="cp-hero-meta">
                                            {restaurants.length > 0
                                                ? `${restaurants.length} restauracji w pobliżu`
                                                : 'Odkryj restauracje'}
                                        </p>
                                    </div>
                                    <div className="cp-hero-arrow">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="cp-hero-cta">Zamów teraz</div>
                            </button>

                            {/* ── SECONDARY: Taxi + Hotele ──────────────────── */}
                            <div className="cp-secondary-row">
                                <button
                                    onClick={() => handleSectionChange('taxi')}
                                    className="cp-secondary-card"
                                    aria-label="Zamów taxi"
                                >
                                    <div className="cp-secondary-icon">
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5m-9 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="cp-secondary-title">Taxi</h4>
                                        <p className="cp-secondary-meta">Dostępne 24/7</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleSectionChange('hotels')}
                                    className="cp-secondary-card"
                                    aria-label="Znajdź hotel"
                                >
                                    <div className="cp-secondary-icon">
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                            <polyline points="9 22 9 12 15 12 15 22" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="cp-secondary-title">Hotele</h4>
                                        <p className="cp-secondary-meta">Znajdź nocleg</p>
                                    </div>
                                </button>
                            </div>

                            {/* ── ORDERS CONTEXT ────────────────────────────── */}
                            {stats.activeOrder ? (
                                <div className="active-order-card">
                                    <div className="card-header">
                                        <h4>Aktywne zamówienie</h4>
                                        <span className="status-badge green">{stats.activeOrder.status}</span>
                                    </div>
                                    <div className="order-info">
                                        <div className="cp-order-channel-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                                                {stats.activeOrder.channel === 'taxi'
                                                    ? <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5m-9 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                                                    : <path d="M12 2C8 2 5 5 5 9c0 3.9 2.7 7.2 6.4 8.7L12 22l.6-4.3C16.3 16.2 19 12.9 19 9c0-4-3-7-7-7z" />
                                                }
                                            </svg>
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
                            ) : orders.length > 0 ? (
                                <div className="active-order-card">
                                    <div className="card-header">
                                        <h4>Ostatnie zamówienie</h4>
                                        <button
                                            onClick={() => handleSectionChange('orders')}
                                            className="cp-link-btn"
                                        >
                                            Historia
                                        </button>
                                    </div>
                                    <div className="orders-list" style={{ margin: 0 }}>
                                        {orders.slice(0, 3).map((order: any, i: number) => (
                                            <div key={i} className="order-row">
                                                <div className={`order-icon ${order.channel === 'taxi' ? 'yellow' : 'orange'}`}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                                                        {order.channel === 'taxi'
                                                            ? <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5m-9 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                                                            : <path d="M12 2C8 2 5 5 5 9c0 3.9 2.7 7.2 6.4 8.7L12 22l.6-4.3C16.3 16.2 19 12.9 19 9c0-4-3-7-7-7z" />
                                                        }
                                                    </svg>
                                                </div>
                                                <div className="order-details">
                                                    <p>{order.restaurant_name || 'Zamówienie'}</p>
                                                    <span>{new Date(order.created_at).toLocaleDateString('pl-PL')}</span>
                                                </div>
                                                <span className="order-price">{(Number(order.total_price) || 0).toFixed(2)} zł</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="cp-orders-empty">
                                    <div className="cp-orders-empty-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                                            <rect x="9" y="3" width="6" height="4" rx="1" />
                                            <path d="M9 12h6M9 16h4" />
                                        </svg>
                                    </div>
                                    <p className="cp-orders-empty-label">Brak zamówień</p>
                                    <button
                                        onClick={() => handleSectionChange('food')}
                                        className="cp-orders-empty-cta"
                                    >
                                        Zamów pierwsze danie →
                                    </button>
                                </div>
                            )}

                            {/* ── PROMO ─────────────────────────────────────── */}
                            <div className="cp-promo-strip">
                                <div className="cp-promo-inner">
                                    <div>
                                        <p className="cp-promo-title">-20% na jedzenie</p>
                                        <p className="cp-promo-desc">Min. zamówienie 50 zł · Kod: FOOD20 · Ważny 3 dni</p>
                                    </div>
                                    <button className="cp-promo-use">Użyj</button>
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
                                {fetchError ? (
                                    <div className="col-span-full">
                                        <ErrorFallback message={fetchError} onRetry={() => {
                                            setFetchError(null);
                                            setLoadingRestaurants(true);
                                            supabase.from('restaurants').select('*').limit(20)
                                                .then(({ data, error }: { data: any, error: any }) => {
                                                    if (error) setFetchError(error.message);
                                                    if (data) setRestaurants(data);
                                                    setLoadingRestaurants(false);
                                                });
                                        }} />
                                    </div>
                                ) : loadingRestaurants ? (
                                    <p className="text-gray-400">Ładowanie restauracji...</p>
                                ) : restaurants.length === 0 ? (
                                    <div className="col-span-full">
                                        <ErrorFallback message="Brak dostępnych restauracji w tej chwili." onRetry={() => {
                                            setLoadingRestaurants(true);
                                            supabase.from('restaurants').select('*').limit(20)
                                                .then(({ data, error }: { data: any, error: any }) => {
                                                    if (error) setFetchError(error.message);
                                                    if (data) setRestaurants(data);
                                                    setLoadingRestaurants(false);
                                                });
                                        }} />
                                    </div>
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
                                                    {order.items && order.items.map((i: any) => `${Number(i?.quantity ?? i?.qty ?? 1) || 1}x ${i.name}`).join(', ')}
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
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                `${profileForm.first_name || ''} ${profileForm.last_name || ''}`.trim() || profileForm.email || 'Guest',
                                            )}&background=667eea&color=fff&size=128`}
                                            alt="Avatar"
                                        />
                                        <button className="avatar-edit">
                                            <i className="fas fa-camera" />
                                        </button>
                                    </div>
                                    <h4>{`${profileForm.first_name || ''} ${profileForm.last_name || ''}`.trim() || profileForm.email || 'Gość'}</h4>
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
                                    <form className="profile-form" onSubmit={handleProfileSave}>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Imię</label>
                                                <input
                                                    type="text"
                                                    value={profileForm.first_name}
                                                    onChange={(e) => handleProfileFieldChange('first_name', e.target.value)}
                                                    autoComplete="given-name"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Nazwisko</label>
                                                <input
                                                    type="text"
                                                    value={profileForm.last_name}
                                                    onChange={(e) => handleProfileFieldChange('last_name', e.target.value)}
                                                    autoComplete="family-name"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Email</label>
                                            <input type="email" value={profileForm.email} readOnly autoComplete="email" />
                                        </div>
                                        <div className="form-group">
                                            <label>Telefon</label>
                                            <input
                                                type="tel"
                                                value={profileForm.phone}
                                                onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                                                autoComplete="tel"
                                            />
                                        </div>

                                        <hr />

                                        <h4>Adres dostawy</h4>
                                        <div className="form-group">
                                            <label>Ulica i numer</label>
                                            <input
                                                type="text"
                                                value={profileForm.address}
                                                onChange={(e) => handleProfileFieldChange('address', e.target.value)}
                                                autoComplete="street-address"
                                            />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Kod pocztowy</label>
                                                <input
                                                    type="text"
                                                    value={profileForm.postal_code}
                                                    onChange={(e) => handleProfileFieldChange('postal_code', e.target.value)}
                                                    autoComplete="postal-code"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Miasto</label>
                                                <input
                                                    type="text"
                                                    value={profileForm.city}
                                                    onChange={(e) => handleProfileFieldChange('city', e.target.value)}
                                                    autoComplete="address-level2"
                                                />
                                            </div>
                                        </div>

                                        <button type="submit" className="primary-btn full" disabled={profileSaving}>
                                            <i className="fas fa-save" /> {profileSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
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

            <nav className="bottom-nav lg:hidden" aria-label="Nawigacja panelu klienta">
                {bottomNavItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleSectionChange(item.id)}
                        className={`bottom-nav-btn ${activeSection === item.id ? 'active' : ''}`}
                        aria-label={item.label}
                    >
                        <i className={`fas ${item.icon}`} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

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
