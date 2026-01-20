/**
 * BusinessClientPanel - Read-only MVP Dashboard for Business Clients
 * 
 * CONSTRAINTS:
 * - No mutations (read-only)
 * - No FSM logic on frontend
 * - Status = backend truth
 * - No coupling with Home
 * 
 * SECTIONS:
 * - KPI Header (orders today, revenue, avg time)
 * - Orders by Channel
 * - Active Orders List (status only)
 * - Link to KDS
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    fetchBusinessDashboard,
    BusinessDashboardData,
    KPIData,
    ChannelBreakdown,
    ActiveOrder
} from '../../lib/businessApi';

// Components
import StatCard from '../../components/business/StatCard';
import ChannelBreakdownCard from '../../components/business/ChannelBreakdownCard';
import ActiveOrdersList from '../../components/business/ActiveOrdersList';

// Styles
import './BusinessClientPanel.css';

// Icons as simple components
const IconDollar = () => <span>💰</span>;
const IconReceipt = () => <span>📋</span>;
const IconClock = () => <span>⏱️</span>;
const IconUsers = () => <span>👥</span>;

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function BusinessClientPanel() {
    // Data state
    const [data, setData] = useState<BusinessDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // Fetch dashboard data
    const loadData = useCallback(async () => {
        try {
            setError(null);
            const dashboardData = await fetchBusinessDashboard();
            setData(dashboardData);
            setLastRefresh(new Date());
        } catch (err) {
            setError('Nie udało się załadować danych. Spróbuj ponownie.');
            console.error('[BusinessPanel] Load error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load and refresh interval
    useEffect(() => {
        loadData();

        const interval = setInterval(loadData, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [loadData]);

    // Loading state
    if (loading) {
        return (
            <div className="business-panel">
                <div className="business-panel__loading">
                    <div className="business-panel__spinner" />
                    <p>Ładowanie danych...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error && !data) {
        return (
            <div className="business-panel">
                <div className="business-panel__error">
                    <span className="business-panel__error-icon">⚠️</span>
                    <p>{error}</p>
                    <button onClick={loadData} className="business-panel__retry-btn">
                        Spróbuj ponownie
                    </button>
                </div>
            </div>
        );
    }

    const kpis = data?.kpis;
    const channels = data?.channels;
    const orders = data?.activeOrders || [];

    return (
        <div className="business-panel">
            {/* Header */}
            <header className="business-panel__header">
                <div className="business-panel__header-left">
                    <h1 className="business-panel__title">Panel Biznesowy</h1>
                    <p className="business-panel__subtitle">
                        Ostatnia aktualizacja: {lastRefresh.toLocaleTimeString('pl-PL')}
                    </p>
                </div>
                <div className="business-panel__header-right">
                    <button onClick={loadData} className="business-panel__refresh-btn" title="Odśwież">
                        🔄
                    </button>
                    <Link to="/panel/business-kds" className="business-panel__kds-link">
                        🍳 Kitchen Display
                    </Link>
                </div>
            </header>

            {/* KPI Section */}
            <section className="business-panel__kpis">
                <StatCard
                    icon={<IconReceipt />}
                    iconBgColor="#22c55e"
                    value={kpis?.ordersToday || 0}
                    label="Zamówień dziś"
                    trend={kpis?.trends.orders}
                />
                <StatCard
                    icon={<IconDollar />}
                    iconBgColor="#3b82f6"
                    value={kpis?.revenueTodayFormatted || '0 zł'}
                    label="Przychód dziś"
                    trend={kpis?.trends.revenue}
                />
                <StatCard
                    icon={<IconClock />}
                    iconBgColor="#f59e0b"
                    value={`${kpis?.avgFulfillmentTime || 0} min`}
                    label="Śr. czas realizacji"
                    trend={kpis?.trends.avgTime}
                    trendReversed // For time, negative = better
                />
                <StatCard
                    icon={<IconUsers />}
                    iconBgColor="#8b5cf6"
                    value={kpis?.customersToday || 0}
                    label="Klienci dziś"
                    trend={kpis?.trends.customers}
                />
            </section>

            {/* Main Content Grid */}
            <section className="business-panel__content">
                {/* Left Column - Active Orders */}
                <div className="business-panel__orders">
                    <ActiveOrdersList orders={orders} />
                </div>

                {/* Right Column - Channel Breakdown */}
                <div className="business-panel__channels">
                    {channels && <ChannelBreakdownCard data={channels} />}

                    {/* Quick Stats */}
                    <div className="business-panel__quick-stats glass">
                        <h3 className="business-panel__section-title">Aktywność na żywo</h3>
                        <div className="quick-stat">
                            <span className="quick-stat__icon">🟢</span>
                            <span className="quick-stat__value">{orders.filter(o => o.status === 'new').length}</span>
                            <span className="quick-stat__label">Nowych</span>
                        </div>
                        <div className="quick-stat">
                            <span className="quick-stat__icon">🔵</span>
                            <span className="quick-stat__value">{orders.filter(o => o.status === 'preparing').length}</span>
                            <span className="quick-stat__label">W przygotowaniu</span>
                        </div>
                        <div className="quick-stat">
                            <span className="quick-stat__icon">✅</span>
                            <span className="quick-stat__value">{orders.filter(o => o.status === 'ready').length}</span>
                            <span className="quick-stat__label">Gotowych</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Error toast if refresh failed but we have cached data */}
            {error && data && (
                <div className="business-panel__toast">
                    ⚠️ Odświeżanie nie powiodło się. Pokazuję ostatnie dane.
                </div>
            )}
        </div>
    );
}
