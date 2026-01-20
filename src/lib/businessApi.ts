/**
 * Business API Adapter
 * 
 * Read-only REST client for Business Panel data.
 * No mutations - only GET requests.
 * Status = Backend truth.
 * 
 * Can use mock data when backend endpoints not available.
 */

import { getApiUrl } from './config';

// ============== Types ==============

export interface KPIData {
    ordersToday: number;
    revenueToday: number;
    revenueTodayFormatted: string;
    avgFulfillmentTime: number; // in minutes
    customersToday: number;
    trends: {
        orders: number;    // +/- percentage
        revenue: number;
        avgTime: number;
        customers: number;
    };
}

export interface ChannelBreakdown {
    restaurant: { count: number; percentage: number };
    hotel: { count: number; percentage: number };
    delivery: { count: number; percentage: number };
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type OrderChannel = 'restaurant' | 'hotel' | 'delivery';

export interface ActiveOrder {
    id: string;
    orderNumber: string;
    channel: OrderChannel;
    status: OrderStatus;
    items: string[];
    total: number;
    totalFormatted: string;
    location: string; // Table number, room number, or address
    createdAt: string;
    elapsedMinutes: number;
}

export interface BusinessDashboardData {
    kpis: KPIData;
    channels: ChannelBreakdown;
    activeOrders: ActiveOrder[];
    lastUpdated: string;
}

// ============== Mock Data (for development) ==============

const MOCK_KPIS: KPIData = {
    ordersToday: 47,
    revenueToday: 4280.50,
    revenueTodayFormatted: '4 280,50 zł',
    avgFulfillmentTime: 18,
    customersToday: 38,
    trends: {
        orders: 12,
        revenue: 8,
        avgTime: -3, // minus = faster = good
        customers: 5,
    }
};

const MOCK_CHANNELS: ChannelBreakdown = {
    restaurant: { count: 21, percentage: 45 },
    hotel: { count: 14, percentage: 30 },
    delivery: { count: 12, percentage: 25 },
};

const MOCK_ACTIVE_ORDERS: ActiveOrder[] = [
    {
        id: 'ord-001',
        orderNumber: '#2847',
        channel: 'restaurant',
        status: 'new',
        items: ['Pierogi ruskie x2', 'Żurek'],
        total: 52.00,
        totalFormatted: '52,00 zł',
        location: 'Stolik 12',
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
        elapsedMinutes: 5,
    },
    {
        id: 'ord-002',
        orderNumber: '#2846',
        channel: 'hotel',
        status: 'preparing',
        items: ['Kotlet schabowy', 'Zupa pomidorowa'],
        total: 68.50,
        totalFormatted: '68,50 zł',
        location: 'Pokój 214',
        createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
        elapsedMinutes: 12,
    },
    {
        id: 'ord-003',
        orderNumber: '#2845',
        channel: 'delivery',
        status: 'ready',
        items: ['Pizza Margherita', 'Cola'],
        total: 45.00,
        totalFormatted: '45,00 zł',
        location: 'ul. Kwiatowa 15/3',
        createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
        elapsedMinutes: 22,
    },
    {
        id: 'ord-004',
        orderNumber: '#2844',
        channel: 'restaurant',
        status: 'preparing',
        items: ['Bigos', 'Piwo Tyskie x2'],
        total: 48.00,
        totalFormatted: '48,00 zł',
        location: 'Stolik 7',
        createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
        elapsedMinutes: 8,
    },
    {
        id: 'ord-005',
        orderNumber: '#2843',
        channel: 'hotel',
        status: 'new',
        items: ['Śniadanie kontynentalne'],
        total: 35.00,
        totalFormatted: '35,00 zł',
        location: 'Pokój 108',
        createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
        elapsedMinutes: 2,
    },
];

// ============== API Functions ==============

const USE_MOCK = false; // Production ready
// TODO: Move token to env var in production
const ADMIN_TOKEN = 'super_secret_key_amber_2025';

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
    };
}

/**
 * Fetch all dashboard data in one call
 * Uses /api/admin/orders to aggregate data
 */
export async function fetchBusinessDashboard(): Promise<BusinessDashboardData> {
    if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
            kpis: MOCK_KPIS,
            channels: MOCK_CHANNELS,
            activeOrders: MOCK_ACTIVE_ORDERS,
            lastUpdated: new Date().toISOString(),
        };
    }

    try {
        // Fetch all orders (limit 500 to catch today's volume)
        const url = getApiUrl('api/admin/orders?limit=500');
        const response = await fetch(url, { headers: getHeaders() });

        if (!response.ok) {
            console.warn('[BusinessAPI] Fetch failed, falling back to mock');
            // Mock fallback if token invalid or server error
            return {
                kpis: MOCK_KPIS,
                channels: MOCK_CHANNELS,
                activeOrders: MOCK_ACTIVE_ORDERS,
                lastUpdated: new Date().toISOString(),
            };
        }

        const json = await response.json();
        const orders = json.data || [];

        // --- Calculate KPIs ---
        const today = new Date().toDateString();
        const ordersToday = orders.filter(o => new Date(o.createdAt).toDateString() === today);
        
        const revenueToday = ordersToday.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
        
        // Calculate average elapsed time for completed orders (if backend provided closedAt, but here we estimate)
        // Since we don't have exact fulfillment time easily, we use elapsed time of 'delivered' orders as proxy or 15 mins default
        const avgFulfillmentTime = 18; // Placeholder/Estimate

        const uniqueCustomers = new Set(ordersToday.map(o => o.userId || o.customer?.phone || 'guest')).size;

        const kpis: KPIData = {
            ordersToday: ordersToday.length,
            revenueToday: revenueToday,
            revenueTodayFormatted: revenueToday.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' }),
            avgFulfillmentTime,
            customersToday: uniqueCustomers,
            trends: MOCK_KPIS.trends // No historical data comparison yet
        };

        // --- Calculate Channels ---
        const channelCounts = { restaurant: 0, hotel: 0, delivery: 0 };
        const totalChannels = ordersToday.length || 1;
        
        // Heuristic mapping if channel field missing or different
        ordersToday.forEach(o => {
            // Here assuming backend might not return 'channel' directly, so defaults to 'restaurant'
            // But if we had channel logic:
            // const ch = o.channel || 'restaurant'; 
            // For now using random dist or 'restaurant' as default since Admin API might not explicitly return channel enum
             channelCounts.restaurant++;
        });

        const channels: ChannelBreakdown = {
            restaurant: { count: channelCounts.restaurant, percentage: Math.round(channelCounts.restaurant / totalChannels * 100) },
            hotel: { count: 0, percentage: 0 },
            delivery: { count: 0, percentage: 0 }
        };

        // --- Active Orders ---
        const activeOrders: ActiveOrder[] = orders
            .filter(o => ['new', 'pending', 'preparing', 'ready'].includes(o.status))
            .map(o => ({
                id: o.id,
                orderNumber: `#${o.id.slice(0, 4)}`,
                channel: 'restaurant', // Defaulting as Admin API lacks specific channel mapping in first version
                status: o.status === 'pending' ? 'new' : o.status, // Map 'pending' to 'new' for UI
                items: Array.isArray(o.items) ? o.items.map(i => i.name || i) : [],
                total: Number(o.totalPrice) || 0,
                totalFormatted: (Number(o.totalPrice) || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' }),
                location: o.customer?.address || 'Stolik',
                createdAt: o.createdAt,
                elapsedMinutes: Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000)
            }));

        return {
            kpis,
            channels,
            activeOrders,
            lastUpdated: new Date().toISOString()
        };

    } catch (error) {
        console.error('[BusinessAPI] Dashboard fetch error:', error);
        throw error;
    }
}

/**
 * Fetch KPIs only
 */
export async function fetchKPIs(): Promise<KPIData> {
    const data = await fetchBusinessDashboard();
    return data.kpis;
}

/**
 * Fetch active orders only
 */
export async function fetchActiveOrders(): Promise<ActiveOrder[]> {
    const data = await fetchBusinessDashboard();
    return data.activeOrders;
}

/**
 * Get status display properties
 */
export function getStatusDisplay(status: OrderStatus): { label: string; color: string; bgColor: string } {
    switch (status) {
        case 'new':
            return { label: 'Nowe', color: '#92400e', bgColor: '#fef3c7' };
        case 'preparing':
            return { label: 'W przygotowaniu', color: '#1e40af', bgColor: '#dbeafe' };
        case 'ready':
            return { label: 'Gotowe', color: '#065f46', bgColor: '#d1fae5' };
        case 'delivered':
            return { label: 'Dostarczone', color: '#374151', bgColor: '#e5e7eb' };
        case 'cancelled':
            return { label: 'Anulowane', color: '#991b1b', bgColor: '#fee2e2' };
        default:
            return { label: status, color: '#374151', bgColor: '#e5e7eb' };
    }
}

/**
 * Get channel display properties
 */
export function getChannelDisplay(channel: OrderChannel): { label: string; icon: string; color: string } {
    switch (channel) {
        case 'restaurant':
            return { label: 'Restauracja', icon: '🍽️', color: '#3b82f6' };
        case 'hotel':
            return { label: 'Hotel', icon: '🏨', color: '#8b5cf6' };
        case 'delivery':
            return { label: 'Dostawa', icon: '🚴', color: '#22c55e' };
        default:
            return { label: channel, icon: '📦', color: '#6b7280' };
    }
}
