/**
 * KDS API Adapter
 * 
 * Read-only REST client for Kitchen Display System.
 * 
 * CONSTRAINTS:
 * - KDS does NOT decide logic
 * - Backend FSM is authoritative
 * - ALL actions call backend (no local mutations)
 * - Status = backend truth
 */

import { getApiUrl } from './config';

// ============== Types ==============

/**
 * Backend Order Status (FSM authoritative)
 */
export type BackendOrderStatus =
    | 'pending'     // Just created, waiting for kitchen
    | 'new'         // Acknowledged, needs attention
    | 'preparing'   // Being prepared
    | 'ready'       // Ready for pickup/delivery
    | 'delivered'   // Completed
    | 'cancelled';  // Cancelled

/**
 * KDS Display Status (visual only)
 */
export type KDSDisplayStatus =
    | 'status-new'      // Yellow glow - new order
    | 'status-warning'  // Orange glow - getting old
    | 'status-urgent';  // Red glow - overdue

/**
 * Order Channel
 */
export type OrderChannel = 'restaurant' | 'hotel' | 'delivery';

/**
 * Order Item
 */
export interface KDSOrderItem {
    id?: string;
    name: string;
    quantity: number;
    station?: string;      // kuchnia, grill, bar, etc.
    done: boolean;
    prep_time?: number;    // minutes
    notes?: string;
}

/**
 * KDS Order (from backend)
 */
export interface KDSOrder {
    id: string;
    order_number: string;
    channel: OrderChannel;
    status: BackendOrderStatus;
    items: KDSOrderItem[];
    total: number;
    total_formatted: string;
    location: string;              // Table, room, or address
    priority: boolean;
    notes?: string;
    created_at: string;            // ISO timestamp
    updated_at?: string;
    customer_name?: string;
    restaurant_id?: string;
}

/**
 * KDS Dashboard Response
 */
export interface KDSDashboardResponse {
    ok: boolean;
    orders: KDSOrder[];
    stats: {
        new_count: number;
        preparing_count: number;
        ready_count: number;
        avg_time_minutes: number;
    };
    last_updated: string;
}

// ============== Status Mapping Table ==============

/**
 * Maps backend order status to KDS visual status based on time elapsed.
 * 
 * | Backend Status | Time < Warning | Time >= Warning | Time >= Critical |
 * |----------------|----------------|-----------------|------------------|
 * | pending/new    | status-new     | status-warning  | status-urgent    |
 * | preparing      | (none)         | status-warning  | status-urgent    |
 * | ready          | (none)         | (none)          | (none)           |
 * 
 * @param status - Backend order status
 * @param elapsedMinutes - Minutes since order created
 * @param warningThreshold - Minutes before warning (default: 10)
 * @param criticalThreshold - Minutes before critical (default: 20)
 */
export function mapStatusToKDS(
    status: BackendOrderStatus,
    elapsedMinutes: number,
    warningThreshold: number = 10,
    criticalThreshold: number = 20
): KDSDisplayStatus | null {
    // Ready and delivered orders don't get status classes
    if (status === 'ready' || status === 'delivered' || status === 'cancelled') {
        return null;
    }

    // Critical time - always urgent
    if (elapsedMinutes >= criticalThreshold) {
        return 'status-urgent';
    }

    // Warning time
    if (elapsedMinutes >= warningThreshold) {
        return 'status-warning';
    }

    // New orders get the new status (yellow)
    if (status === 'pending' || status === 'new') {
        return 'status-new';
    }

    // Preparing but not yet warning
    return null;
}

/**
 * Get timer CSS class based on elapsed time
 */
export function getTimerClass(
    elapsedMinutes: number,
    warningThreshold: number = 10,
    criticalThreshold: number = 20
): 'timer-ok' | 'timer-warning' | 'timer-critical' {
    if (elapsedMinutes >= criticalThreshold) return 'timer-critical';
    if (elapsedMinutes >= warningThreshold) return 'timer-warning';
    return 'timer-ok';
}

/**
 * Get status badge properties
 */
export function getStatusBadge(status: BackendOrderStatus): {
    label: string;
    color: string;
    bgColor: string
} {
    switch (status) {
        case 'pending':
        case 'new':
            return { label: 'Nowe', color: '#92400e', bgColor: '#fef3c7' };
        case 'preparing':
            return { label: 'W przygotowaniu', color: '#1e40af', bgColor: '#dbeafe' };
        case 'ready':
            return { label: 'Gotowe', color: '#065f46', bgColor: '#d1fae5' };
        case 'delivered':
            return { label: 'Wydane', color: '#374151', bgColor: '#e5e7eb' };
        case 'cancelled':
            return { label: 'Anulowane', color: '#991b1b', bgColor: '#fee2e2' };
        default:
            return { label: status, color: '#374151', bgColor: '#e5e7eb' };
    }
}

/**
 * Get channel display properties
 */
export function getChannelDisplay(channel: OrderChannel): {
    name: string;
    short: string;
    icon: string;
    cssClass: string;
} {
    switch (channel) {
        case 'restaurant':
            return { name: 'Restauracja', short: 'REST', icon: 'fa-utensils', cssClass: 'channel-restaurant' };
        case 'hotel':
            return { name: 'Room Service', short: 'HOTEL', icon: 'fa-bed', cssClass: 'channel-hotel' };
        case 'delivery':
            return { name: 'Dostawa', short: 'DOST', icon: 'fa-motorcycle', cssClass: 'channel-delivery' };
        default:
            return { name: channel, short: channel.toUpperCase(), icon: 'fa-box', cssClass: '' };
    }
}

// ============== API Functions ==============

/**
 * Fetch KDS orders from backend
 * GET /api/orders?view=kds
 */
export async function fetchKDSOrders(): Promise<KDSDashboardResponse> {
    try {
        const url = getApiUrl('api/orders?view=kds');
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch KDS orders: ${response.statusText}`);
        }

        const data = await response.json();
        return data as KDSDashboardResponse;
    } catch (error) {
        console.error('[KDS API] Fetch error:', error);
        throw error;
    }
}

/**
 * Start an order (transition: new/pending -> preparing)
 * Backend FSM is authoritative - this is just a request
 * 
 * POST /api/orders/:id/start
 */
export async function startOrder(orderId: string): Promise<{ ok: boolean; order?: KDSOrder; error?: string }> {
    try {
        const url = getApiUrl(`api/orders/${orderId}/start`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, error: data.error || response.statusText };
        }

        return { ok: true, order: data.order };
    } catch (error) {
        console.error('[KDS API] Start order error:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
    }
}

/**
 * Mark order as ready (transition: preparing -> ready)
 * Backend FSM is authoritative
 * 
 * POST /api/orders/:id/ready
 */
export async function markOrderReady(orderId: string): Promise<{ ok: boolean; order?: KDSOrder; error?: string }> {
    try {
        const url = getApiUrl(`api/orders/${orderId}/ready`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, error: data.error || response.statusText };
        }

        return { ok: true, order: data.order };
    } catch (error) {
        console.error('[KDS API] Ready order error:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
    }
}

/**
 * Mark item as done within an order
 * Backend FSM is authoritative
 * 
 * POST /api/orders/:id/items/:itemIndex/toggle
 */
export async function toggleOrderItem(
    orderId: string,
    itemIndex: number
): Promise<{ ok: boolean; order?: KDSOrder; error?: string }> {
    try {
        const url = getApiUrl(`api/orders/${orderId}/items/${itemIndex}/toggle`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, error: data.error || response.statusText };
        }

        return { ok: true, order: data.order };
    } catch (error) {
        console.error('[KDS API] Toggle item error:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
    }
}

/**
 * Complete/deliver an order (transition: ready -> delivered)
 * Backend FSM is authoritative
 * 
 * POST /api/orders/:id/complete
 */
export async function completeOrder(orderId: string): Promise<{ ok: boolean; order?: KDSOrder; error?: string }> {
    try {
        const url = getApiUrl(`api/orders/${orderId}/complete`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, error: data.error || response.statusText };
        }

        return { ok: true, order: data.order };
    } catch (error) {
        console.error('[KDS API] Complete order error:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
    }
}

/**
 * Bump order (mark all items done, move to ready queue)
 * Backend FSM is authoritative
 * 
 * POST /api/orders/:id/bump
 */
export async function bumpOrder(orderId: string): Promise<{ ok: boolean; order?: KDSOrder; error?: string }> {
    try {
        const url = getApiUrl(`api/orders/${orderId}/bump`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, error: data.error || response.statusText };
        }

        return { ok: true, order: data.order };
    } catch (error) {
        console.error('[KDS API] Bump order error:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
    }
}

/**
 * Recall last completed order
 * Backend FSM is authoritative
 * 
 * POST /api/orders/recall-last
 */
export async function recallLastOrder(): Promise<{ ok: boolean; order?: KDSOrder; error?: string }> {
    try {
        const url = getApiUrl('api/orders/recall-last');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, error: data.error || response.statusText };
        }

        return { ok: true, order: data.order };
    } catch (error) {
        console.error('[KDS API] Recall order error:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
    }
}

// ============== Helpers ==============

/**
 * Calculate elapsed seconds since order creation
 */
export function getElapsedSeconds(createdAt: string): number {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
}

/**
 * Format seconds as MM:SS
 */
export function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Get elapsed minutes since order creation
 */
export function getElapsedMinutes(createdAt: string): number {
    return Math.floor(getElapsedSeconds(createdAt) / 60);
}
