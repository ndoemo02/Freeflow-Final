import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({ getAccessToken: vi.fn(async () => 'test-token') }));
vi.mock('./config', () => ({ getApiUrl: (path: string) => `https://backend.test/${path}` }));

import { fetchBusinessDashboard, getStatusDisplay } from './businessApi';
import { getAccessToken } from './supabase';

// Shape returned by api/owner/orders.js, including numeric-string PLN amounts.
const paidOrder = {
    id: 'paid-order', restaurant_id: 'restaurant-demo', status: 'confirmed',
    items: [{ name: 'Pizza demo', qty: 2, unit_price_cents: 2900 }],
    total_price: '58.00', customer_name: 'Klient demo', customer_phone: 'demo-phone',
    delivery_address: 'Adres demo', notes: null,
    created_at: '2026-09-06T12:00:00.000Z',
    confirmed_at: '2026-09-06T12:01:00.000Z', updated_at: '2026-09-06T12:01:00.000Z',
};

function respond(orders: unknown[]) {
    vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true, json: async () => ({ ok: true, data: orders }),
    })));
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T12:10:00.000Z'));
    vi.mocked(getAccessToken).mockResolvedValue('test-token');
    respond([paidOrder]);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('business dashboard / owner orders contract', () => {
    it('shows the paid order and derives KPIs from raw database fields', async () => {
        const result = await fetchBusinessDashboard('restaurant-demo');
        expect(result.activeOrders).toHaveLength(1);
        expect(result.activeOrders[0]).toMatchObject({
            id: paidOrder.id, status: 'confirmed', total: 58,
            items: ['Pizza demo'], location: 'Adres demo',
            createdAt: paidOrder.created_at, elapsedMinutes: 10,
        });
        expect(result.kpis).toMatchObject({ ordersToday: 1, revenueToday: 58, customersToday: 1 });
        expect(result.activeOrders[0].totalFormatted).toBe(result.kpis.revenueTodayFormatted);
        expect(getStatusDisplay(result.activeOrders[0].status)).toMatchObject({ label: 'Opłacone' });
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('restaurant_id=restaurant-demo'),
            { headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) },
        );
    });

    it('counts only today and deduplicates available customer phone numbers', async () => {
        respond([
            paidOrder,
            { ...paidOrder, id: 'second', total_price: 29 },
            { ...paidOrder, id: 'no-phone', total_price: 10, customer_phone: null },
            { ...paidOrder, id: 'yesterday', total_price: 100, created_at: '2026-09-05T12:00:00.000Z' },
        ]);
        expect((await fetchBusinessDashboard('restaurant-demo')).kpis)
            .toMatchObject({ ordersToday: 3, revenueToday: 97, customersToday: 1 });
    });

    it('excludes cancelled/delivered and preserves existing active status mappings', async () => {
        respond(['confirmed', 'pending', 'accepted', 'preparing', 'completed', 'cancelled', 'delivered']
            .map(status => ({ ...paidOrder, id: status, status })));
        const result = await fetchBusinessDashboard('restaurant-demo');
        expect(result.activeOrders.map(order => order.status))
            .toEqual(['confirmed', 'new', 'new', 'preparing', 'ready']);
    });

    it('requires a restaurant and token before fetching', async () => {
        await expect(fetchBusinessDashboard()).rejects.toThrow('Restaurant selection required');
        vi.mocked(getAccessToken).mockResolvedValue(null);
        await expect(fetchBusinessDashboard('restaurant-demo')).rejects.toThrow('Owner authentication required');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('surfaces an endpoint failure rather than showing an empty dashboard', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403 })));
        await expect(fetchBusinessDashboard('restaurant-demo')).rejects.toThrow('HTTP 403');
    });
});
