/**
 * Business API Adapter
 * 
 * Read-only REST client for Business Panel data.
 * No mutations - only GET requests.
 * Status = Backend truth.
 * 
 * Backend failures are surfaced as unavailable; demo fixtures are never returned.
 */

import { getApiUrl } from './config';
import { getAccessToken } from './supabase';

// ============== Types ==============

export interface KPIData {
    ordersToday: number;
    revenueToday: number;
    revenueTodayFormatted: string;
    avgFulfillmentTime: number | null; // in minutes
    customersToday: number;
    trends: {
        orders: number | null;    // +/- percentage
        revenue: number | null;
        avgTime: number | null;
        customers: number | null;
    };
}

export interface ChannelBreakdown {
    restaurant: { count: number; percentage: number };
    hotel: { count: number; percentage: number };
    delivery: { count: number; percentage: number };
    unknown: { count: number; percentage: number };
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type OrderChannel = 'restaurant' | 'hotel' | 'delivery' | 'unknown';

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

// ============== API Functions ==============

async function getHeaders(): Promise<Record<string, string>> {
    const token = await getAccessToken();
    if (!token) throw new Error('Owner authentication required');
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
}

/**
 * Fetch all dashboard data in one call
 * Uses the tenant-scoped /api/owner/orders feed.
 */
export async function fetchBusinessDashboard(restaurantId?: string): Promise<BusinessDashboardData> {
    if (!restaurantId) throw new Error('Restaurant selection required');
    try {
        // Fetch all orders (limit 500 to catch today's volume)
        const url = getApiUrl(`api/owner/orders?limit=500&restaurant_id=${encodeURIComponent(restaurantId)}`);
        const response = await fetch(url, { headers: await getHeaders() });

        if (!response.ok) {
            throw new Error(`Business dashboard unavailable: HTTP ${response.status}`);
        }

        const json = await response.json();
        const orders = json.data || [];

        // --- Calculate KPIs ---
        const today = new Date().toDateString();
        const ordersToday = orders.filter((o: any) => new Date(o.createdAt).toDateString() === today);

        const revenueToday = ordersToday.reduce((sum: number, o: any) => sum + (Number(o.totalPrice) || 0), 0);

        // The current orders API has no authoritative completion timestamp.
        // Keep this unavailable until the operational schema exposes one.
        const avgFulfillmentTime = null;

        const uniqueCustomers = new Set(
            ordersToday.map((o: any) => o.userId || o.customer?.phone || null).filter(Boolean),
        ).size;

        const kpis: KPIData = {
            ordersToday: ordersToday.length,
            revenueToday: revenueToday,
            revenueTodayFormatted: revenueToday.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' }),
            avgFulfillmentTime,
            customersToday: uniqueCustomers,
            trends: { orders: null, revenue: null, avgTime: null, customers: null }
        };

        // --- Calculate Channels ---
        const channelCounts = { restaurant: 0, hotel: 0, delivery: 0, unknown: 0 };
        const totalChannels = ordersToday.length || 1;

        // The current orders contract has no authoritative channel field.
        ordersToday.forEach(() => {
            channelCounts.unknown++;
        });

        const channels: ChannelBreakdown = {
            restaurant: { count: channelCounts.restaurant, percentage: Math.round(channelCounts.restaurant / totalChannels * 100) },
            hotel: { count: 0, percentage: 0 },
            delivery: { count: 0, percentage: 0 },
            unknown: { count: channelCounts.unknown, percentage: Math.round(channelCounts.unknown / totalChannels * 100) }
        };

        // --- Active Orders ---
        const activeOrders: ActiveOrder[] = orders
            .filter((o: any) => ['new', 'pending', 'accepted', 'preparing', 'ready', 'completed'].includes(o.status))
            .map((o: any) => ({
                id: o.id,
                orderNumber: `#${o.id.slice(0, 4)}`,
                channel: 'unknown',
                status: ['pending', 'accepted'].includes(o.status)
                    ? 'new'
                    : (o.status === 'completed' ? 'ready' : o.status),
                items: Array.isArray(o.items) ? o.items.map((i: any) => i.name || i) : [],
                total: Number(o.totalPrice) || 0,
                totalFormatted: (Number(o.totalPrice) || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' }),
                location: o.customer?.address || 'Brak danych',
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
        console.warn('[BusinessAPI] Dashboard unavailable:', error instanceof Error ? error.message : error);
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
export type StatusTone = 'new' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'neutral';

export function getStatusDisplay(status: OrderStatus): { label: string; tone: StatusTone } {
    switch (status) {
        case 'new':
            return { label: 'Nowe', tone: 'new' };
        case 'preparing':
            return { label: 'W przygotowaniu', tone: 'preparing' };
        case 'ready':
            return { label: 'Gotowe', tone: 'ready' };
        case 'delivered':
            return { label: 'Dostarczone', tone: 'delivered' };
        case 'cancelled':
            return { label: 'Anulowane', tone: 'cancelled' };
        default:
            return { label: status, tone: 'neutral' };
    }
}

/**
 * Get channel display properties
 */
export function getChannelDisplay(channel: OrderChannel): { label: string; icon: string; color: string } {
    switch (channel) {
        case 'restaurant':
            return { label: 'Restauracja', icon: '🍽️', color: '#3DDCC3' };
        case 'hotel':
            return { label: 'Hotel', icon: '🏨', color: '#8b5cf6' };
        case 'delivery':
            return { label: 'Dostawa', icon: '🚴', color: '#22c55e' };
        case 'unknown':
            return { label: 'Nieustalony', icon: '❔', color: '#6b7280' };
        default:
            return { label: channel, icon: '📦', color: '#6b7280' };
    }
}
