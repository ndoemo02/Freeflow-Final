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

const USE_MOCK = true; // Toggle for development

/**
 * Fetch all dashboard data in one call
 */
export async function fetchBusinessDashboard(): Promise<BusinessDashboardData> {
    if (USE_MOCK) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
            kpis: MOCK_KPIS,
            channels: MOCK_CHANNELS,
            activeOrders: MOCK_ACTIVE_ORDERS,
            lastUpdated: new Date().toISOString(),
        };
    }

    try {
        const url = getApiUrl('api/business/dashboard');
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[BusinessAPI] Dashboard fetch error:', error);
        // Fallback to mock on error
        return {
            kpis: MOCK_KPIS,
            channels: MOCK_CHANNELS,
            activeOrders: MOCK_ACTIVE_ORDERS,
            lastUpdated: new Date().toISOString(),
        };
    }
}

/**
 * Fetch KPIs only (lighter call)
 */
export async function fetchKPIs(): Promise<KPIData> {
    if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 200));
        return MOCK_KPIS;
    }

    try {
        const url = getApiUrl('api/business/kpis');
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch KPIs: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[BusinessAPI] KPIs fetch error:', error);
        return MOCK_KPIS;
    }
}

/**
 * Fetch active orders only
 */
export async function fetchActiveOrders(): Promise<ActiveOrder[]> {
    if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 200));
        // Simulate real-time updates - increment elapsed time
        return MOCK_ACTIVE_ORDERS.map(order => ({
            ...order,
            elapsedMinutes: Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
        }));
    }

    try {
        const url = getApiUrl('api/business/orders/active');
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch active orders: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[BusinessAPI] Active orders fetch error:', error);
        return MOCK_ACTIVE_ORDERS;
    }
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
