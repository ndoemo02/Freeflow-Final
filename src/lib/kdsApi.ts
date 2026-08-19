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
import { getAccessToken } from './supabase';

// ============== Types ==============

/**
 * Backend Order Status (FSM authoritative)
 */
export type BackendOrderStatus =
    | 'pending'     // Just created, waiting for kitchen
    | 'confirmed'   // Klient zaplacil, restauracja jeszcze nie przyjela (P4)
    | 'new'         // Acknowledged, needs attention
    | 'preparing'   // Being prepared
    | 'ready'       // Ready for pickup/delivery
    | 'delivered'   // Completed
    | 'completed'   // Completed (legacy/backend alias)
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
export type OrderChannel = 'restaurant' | 'hotel' | 'delivery' | 'unknown';

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

    // New orders get the new status (yellow).
    // 'confirmed' = oplacone i nieprzyjete jeszcze przez kuchnie, wiec wymaga
    // uwagi dokladnie tak samo jak zamowienie swieze.
    if (status === 'pending' || status === 'new' || status === 'confirmed') {
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
        case 'confirmed':
            return { label: 'Opłacone', color: '#5b21b6', bgColor: '#ede9fe' };
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
        case 'unknown':
            return { name: 'Nieustalony', short: 'N/D', icon: 'fa-question', cssClass: 'channel-unknown' };
    }
}

// ============== API Functions ==============

async function getHeaders() {
    const token = await getAccessToken();
    if (!token) throw new Error('Owner authentication required');
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
}

/**
 * P4-B: filtr markera `[stripe_test_paid:...]` usuniety. Stan platnosci wyraza
 * status 'confirmed' + confirmed_at, a nie tekst w notatce - nie ma juz czego
 * wycinac z widoku kuchni. Zostaje samo przyciecie bialych znakow.
 */
function sanitizeKdsNotes(rawNotes: unknown): string | null {
    const notes = String(rawNotes ?? '');
    if (!notes) return null;

    const cleaned = notes
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join('\n')
        .trim();

    return cleaned.length > 0 ? cleaned : null;
}

/**
 * Fetch KDS orders from backend using Admin API
 * GET /api/admin/orders
 */
export async function fetchKDSOrders(restaurantId?: string): Promise<KDSDashboardResponse> {
    if (!restaurantId) throw new Error('Restaurant selection required');
    try {
        const url = getApiUrl(`api/owner/orders?limit=100&restaurant_id=${encodeURIComponent(restaurantId)}`);
        const response = await fetch(url, { headers: await getHeaders() });

        if (!response.ok) {
            throw new Error(`Failed to fetch KDS orders: ${response.statusText}`);
        }

        const json = await response.json();
        const rawOrders = json.data || [];

        // Filter for active orders only (exclude cancelled, delivered if you want, but KDS usually shows active)
        const activeOrders = rawOrders.filter((o: any) => o.status !== 'cancelled' && o.status !== 'delivered');

        // Map to KDS structure
        const orders: KDSOrder[] = activeOrders.map((o: any) => ({
            id: o.id,
            order_number: `#${o.id.slice(0, 4)}`,
            channel: 'unknown',
            // DB constraint in production can reject "ready", so treat "completed" as KDS-ready stage.
            status: o.status === 'pending' ? 'new' : (o.status === 'completed' ? 'ready' : o.status),
            items: Array.isArray(o.items) ? o.items.map((i: any, idx: number) => ({
                id: `item-${idx}`,
                name: i.name || i.dish_name || (typeof i === 'string' ? i : 'Pozycja'),
                quantity: i.quantity || i.qty || 1,
                station: 'kuchnia', // Default station
                done: false // Backend V1 doesn't track item status yet
            })) : [],
            total: Number(o.totalPrice) || 0,
            total_formatted: (Number(o.totalPrice) || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' }),
            location: 'Brak danych',
            priority: false,
            notes: sanitizeKdsNotes(o.notes),
            created_at: o.createdAt,
            updated_at: o.updatedAt,
            customer_name: o.customer?.name,
            restaurant_id: o.restaurantId
        }));

        const activeAges = orders
            .map((order) => Math.max(0, (Date.now() - new Date(order.created_at).getTime()) / 60000))
            .filter(Number.isFinite);

        // Calculate stats exclusively from the tenant-scoped orders response.
        const stats = {
            new_count: orders.filter((o: any) => o.status === 'new' || o.status === 'pending' || o.status === 'confirmed').length,
            preparing_count: orders.filter((o: any) => o.status === 'preparing').length,
            ready_count: orders.filter((o: any) => o.status === 'ready').length,
            avg_time_minutes: activeAges.length
                ? Math.round(activeAges.reduce((sum, minutes) => sum + minutes, 0) / activeAges.length)
                : 0
        };

        return {
            ok: true,
            orders,
            stats,
            last_updated: new Date().toISOString()
        };
    } catch (error) {
        console.warn('[KDS API] Backend unavailable:', error instanceof Error ? error.message : error);
        throw error;
    }
}

/**
 * Start an order (transition: new/pending -> preparing)
 * Uses tenant-scoped PATCH /api/owner/orders/:id
 */
export async function startOrder(orderId: string, restaurantId?: string): Promise<{ ok: boolean; order?: KDSOrder; error?: string }> {
    try {
        if (!restaurantId) throw new Error('Restaurant selection required');
        const url = getApiUrl(`api/owner/orders/${orderId}`);
        const response = await fetch(url, {
            method: 'PATCH',
            headers: await getHeaders(),
            body: JSON.stringify({ status: 'preparing', restaurant_id: restaurantId })
        });

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, error: data.error || response.statusText };
        }

        return { ok: true };
    } catch (error) {
        console.error('[KDS API] Start order error:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
    }
}

/**
 * Mark order as ready (transition: preparing -> completed in DB, rendered as "GOTOWE" in KDS UI)
 * Uses tenant-scoped PATCH /api/owner/orders/:id
 */
export async function markOrderReady(orderId: string, restaurantId?: string): Promise<{ ok: boolean; order?: KDSOrder; error?: string }> {
    try {
        if (!restaurantId) throw new Error('Restaurant selection required');
        const url = getApiUrl(`api/owner/orders/${orderId}`);
        const response = await fetch(url, {
            method: 'PATCH',
            headers: await getHeaders(),
            body: JSON.stringify({ status: 'completed', restaurant_id: restaurantId })
        });
        const data = await response.json().catch(() => ({}));
        return response.ok
            ? { ok: true }
            : { ok: false, error: String(data?.error || response.statusText || 'unknown_error') };
    } catch (error) {
        console.error('[KDS API] Ready order error:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
    }
}

/**
 * Toggle item status (simulated client-side only for now as backend lacks item-level status)
 */
export async function toggleOrderItem(
    orderId: string,
    itemIndex: number
): Promise<{ ok: boolean; order?: KDSOrder; error?: string }> {
    console.warn('[KDS API] Item toggle not persisted to backend yet (not supported in V1 API)');
    return { ok: false, error: 'not_supported' };
}

/**
 * Complete/deliver an order (transition: ready -> delivered)
 * Uses tenant-scoped PATCH /api/owner/orders/:id
 */
export async function completeOrder(orderId: string, restaurantId?: string): Promise<{ ok: boolean; order?: KDSOrder; error?: string }> {
    try {
        if (!restaurantId) throw new Error('Restaurant selection required');
        const url = getApiUrl(`api/owner/orders/${orderId}`);
        const response = await fetch(url, {
            method: 'PATCH',
            headers: await getHeaders(),
            body: JSON.stringify({ status: 'delivered', restaurant_id: restaurantId })
        });

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, error: data.error || response.statusText };
        }

        return { ok: true };
    } catch (error) {
        console.error('[KDS API] Complete order error:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
    }
}

/**
 * Bump order (move back to ready? or special status)
 * Treating as 'ready' for V1
 */
export async function bumpOrder(orderId: string, restaurantId?: string): Promise<{ ok: boolean; order?: KDSOrder; error?: string }> {
    return markOrderReady(orderId, restaurantId);
}

/**
 * Recall last completed order
 * Helper not implemented in V1 Backend yet
 */
export async function recallLastOrder(): Promise<{ ok: boolean; order?: KDSOrder; error?: string }> {
    console.warn('[KDS API] Recall not implemented in backend');
    return { ok: false, error: 'Not implemented' };
}

// ============== Helpers ==============
// (Helpers getElapsedSeconds, formatTime, getElapsedMinutes remain unchanged)
export function getElapsedSeconds(createdAt: string): number {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
}

export function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function getElapsedMinutes(createdAt: string): number {
    return Math.floor(getElapsedSeconds(createdAt) / 60);
}

