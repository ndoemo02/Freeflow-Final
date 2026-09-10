import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { KDSOrder } from '../lib/kdsApi';

const polling = vi.hoisted(() => ({
    orders: [] as KDSOrder[], stats: {}, isPolling: false,
    refresh: vi.fn(), startOrder: vi.fn(), toggleItem: vi.fn(),
    completeOrder: vi.fn(), bumpOrder: vi.fn(), recallLastOrder: vi.fn(),
}));
vi.mock('../hooks/useKDSPolling', () => ({ useKDSPolling: () => polling }));
vi.mock('../hooks/useOwnerRestaurant', () => ({ useOwnerRestaurant: () => ({ selectedId: 'rest-demo' }) }));
vi.mock('../components/OwnerRestaurantSelector', () => ({ OwnerRestaurantSelector: () => null }));
vi.mock('../lib/supabase', () => ({ getAccessToken: async () => 'test-token' }));
vi.mock('../lib/config', () => ({ getApiUrl: (path: string) => `https://backend.test/${path}` }));

import BusinessPanelNew from './BusinessPanelNew';
import { fetchKDSOrders } from '../lib/kdsApi';

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('renders a confirmed API order in the new column and allows the kitchen to accept it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true, json: async () => ({ ok: true, data: [{
            id: 'paid-order', restaurant_id: 'rest-demo', status: 'confirmed',
            items: [{ name: 'Pizza demo', qty: 2 }], total_price: '58.00',
            delivery_address: 'Adres demo', customer_name: 'Klient demo', notes: null,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }] }),
    })));
    polling.orders = (await fetchKDSOrders('rest-demo')).orders;
    render(<MemoryRouter><BusinessPanelNew /></MemoryRouter>);
    expect(screen.getByText('NOWE (1)')).toBeInTheDocument();
    expect(screen.getByText('Pizza demo')).toBeInTheDocument();
    expect(screen.getByText('Opłacone')).toBeInTheDocument();
    expect(screen.getByText('Adres demo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PRZYJMIJ' }));
    expect(polling.startOrder).toHaveBeenCalledWith('paid-order');
});
