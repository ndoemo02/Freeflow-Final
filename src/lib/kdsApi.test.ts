/**
 * P4-B — kontrakt widoku kuchni dla zamowienia OPLACONEGO
 * ===========================================================================
 * Do dzis stan platnosci zyl w markerze `[stripe_test_paid:…]` w polu `notes`,
 * a `sanitizeKdsNotes` odfiltrowywal go z widoku kuchni — restauracja nie miala
 * jak rozpoznac oplaconego zamowienia (CLAUDE.md §10).
 *
 * Po P4 stan platnosci wyraza `status = 'confirmed'` + `confirmed_at`.
 * 'confirmed' i 'accepted' to DWA ROZNE zdarzenia: confirmed = klient zaplacil,
 * accepted = restauracja przyjela. KDS musi umiec pokazac to pierwsze.
 * ===========================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./supabase', () => ({
    getAccessToken: vi.fn(async () => 'token-testowy'),
}));

vi.mock('./config', () => ({
    getApiUrl: (path: string) => `https://backend.test/${String(path).replace(/^\//, '')}`,
}));

import { fetchKDSOrders, getStatusBadge, mapStatusToKDS } from './kdsApi';

function mockOrdersResponse(orders: any[]) {
    return vi.fn(async () => ({
        ok: true,
        statusText: 'OK',
        json: async () => ({ data: orders }),
    })) as any;
}

const zamowienieOplacone = {
    id: 'ord-oplacone-1234',
    status: 'confirmed',
    items: [{ name: 'Pizza', quantity: 1 }],
    totalPrice: 42,
    notes: 'Bez cebuli',
    createdAt: new Date().toISOString(),
    restaurantId: 'rest-1',
};

beforeEach(() => {
    vi.stubGlobal('fetch', mockOrdersResponse([zamowienieOplacone]));
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('P4-B / KDS rozpoznaje zamowienie oplacone', () => {
    it('status confirmed dociera do kuchni bez podmiany na inny', async () => {
        const wynik = await fetchKDSOrders('rest-1');

        expect(wynik.orders).toHaveLength(1);
        expect(wynik.orders[0].status).toBe('confirmed');
    });

    it('oplacone zamowienie liczy sie jako wymagajace uwagi', async () => {
        const wynik = await fetchKDSOrders('rest-1');

        expect(wynik.stats.new_count).toBe(1);
    });

    it('oplacone zamowienie dostaje wlasna etykiete, nie surowy status', async () => {
        const badge = getStatusBadge('confirmed');

        expect(badge.label).toBe('Opłacone');
        expect(badge.label).not.toBe('confirmed');
    });

    it('swiezo oplacone zamowienie swieci jak nowe', () => {
        expect(mapStatusToKDS('confirmed', 0)).toBe('status-new');
    });

    it('oplacone i przeterminowane nadal eskaluje do urgent', () => {
        expect(mapStatusToKDS('confirmed', 25)).toBe('status-urgent');
    });
});

describe('P4-B / notatki kuchni nie sa juz czyszczone z markera platnosci', () => {
    it('marker w notatce zamowienia legacy trafia do kuchni bez wycinania', async () => {
        vi.stubGlobal(
            'fetch',
            mockOrdersResponse([
                { ...zamowienieOplacone, notes: 'Bez cebuli\n[stripe_test_paid:cs_test_123]' },
            ])
        );

        const wynik = await fetchKDSOrders('rest-1');

        expect(wynik.orders[0].notes).toContain('Bez cebuli');
        expect(wynik.orders[0].notes).toContain('[stripe_test_paid:cs_test_123]');
    });

    it('pusta notatka nadal daje null, nie pusty napis', async () => {
        vi.stubGlobal('fetch', mockOrdersResponse([{ ...zamowienieOplacone, notes: '   ' }]));

        const wynik = await fetchKDSOrders('rest-1');

        expect(wynik.orders[0].notes).toBeNull();
    });
});
