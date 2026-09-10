import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const selected = vi.hoisted(() => ({ id: 'rest-demo' }));
vi.mock('../hooks/useOwnerRestaurant', () => ({ useOwnerRestaurant: () => ({ selectedId: selected.id }) }));
vi.mock('../components/OwnerRestaurantSelector', () => ({ OwnerRestaurantSelector: () => null }));
vi.mock('../lib/supabase', () => ({ getAccessToken: async () => 'owner-test-token' }));
vi.mock('../lib/config', () => ({ getApiUrl: (path: string) => `https://backend.test/${path.replace(/^\//, '')}` }));
import BusinessPanelNew from './BusinessPanelNew';
import { useKDSPolling } from '../hooks/useKDSPolling';
import { fetchBusinessDashboard } from '../lib/businessApi';

// Shape written by package 5 pricing/finalization and returned by owner/orders.
const paidOrder = () => ({
  id: 'paid-order-1', restaurant_id: 'rest-demo', status: 'confirmed',
  items: [{ menu_item_id: 'dish-1', name: 'Pierogi demo', qty: 2, quantity: 2,
    unit_price_cents: 1200, price_pln: 12, pricing_version: 1, special_instructions: 'Bez cebuli' }],
  total_price: '24.00', customer_name: 'Klient demo', customer_phone: 'demo-phone',
  delivery_address: 'Adres demo', notes: 'Odbior osobisty',
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  confirmed_at: '2026-09-07T00:00:00Z',
});
const response = (data: unknown, status = 200) => new Response(JSON.stringify({ ok: status === 200, data }), { status });
function serve(order: ReturnType<typeof paidOrder>, rejectPatch = false) {
  const statuses: string[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer owner-test-token');
    if (init?.method === 'PATCH') {
      expect(url.pathname).toBe(`/api/owner/orders/${order.id}`);
      const body = JSON.parse(String(init.body));
      expect(body.restaurant_id).toBe('rest-demo');
      if (rejectPatch) return response(null, 403);
      statuses.push(body.status); order.status = body.status;
      return response(order);
    }
    expect(url.pathname).toBe('/api/owner/orders');
    expect(url.searchParams.get('restaurant_id')).toBe('rest-demo');
    return response([order]);
  });
  vi.stubGlobal('fetch', fetchMock); return { fetchMock, statuses };
}
beforeEach(() => { selected.id = 'rest-demo'; Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('hands one paid snapshot to dashboard and real KDS polling, then follows manual preparation and delivery', async () => {
  const order = paidOrder(); const { statuses } = serve(order);
  const business = await fetchBusinessDashboard('rest-demo');
  expect(business.activeOrders[0]).toMatchObject({ id: order.id, status: 'confirmed', total: 24 });
  render(<MemoryRouter><BusinessPanelNew /></MemoryRouter>);
  await screen.findByText('Pierogi demo');
  expect(screen.getByText('2x')).toBeInTheDocument();
  expect(screen.getByText('Bez cebuli')).toBeInTheDocument();
  expect(screen.getByText('Opłacone')).toBeInTheDocument();
  expect(statuses).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'PRZYJMIJ' }));
  await screen.findByRole('button', { name: 'PRZYGOTOWANE' });
  expect(statuses).toEqual(['preparing']);
  fireEvent.click(screen.getByRole('button', { name: 'PRZYGOTOWANE' }));
  await screen.findByRole('button', { name: 'WYŚLIJ / ZAKOŃCZ' });
  expect(statuses).toEqual(['preparing', 'completed']);
  fireEvent.click(screen.getByRole('button', { name: 'WYŚLIJ / ZAKOŃCZ' }));
  await waitFor(() => expect(screen.queryByText('Pierogi demo')).not.toBeInTheDocument());
  expect(statuses).toEqual(['preparing', 'completed', 'delivered']);
  expect(order.confirmed_at).toBe('2026-09-07T00:00:00Z');
});
it('keeps an accepted order visible and does not advance it after a rejected PATCH', async () => {
  const order = { ...paidOrder(), status: 'accepted' }; serve(order, true);
  render(<MemoryRouter><BusinessPanelNew /></MemoryRouter>);
  const button = await screen.findByRole('button', { name: 'PRZYJMIJ' });
  fireEvent.click(button);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(order.status).toBe('accepted'); expect(screen.getByText('Pierogi demo')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'PRZYGOTOWANE' })).not.toBeInTheDocument();
});
it('does not let the kitchen start an unpaid pending order in the demo UI', async () => {
  const order = { ...paidOrder(), status: 'pending', confirmed_at: '' }; const { statuses } = serve(order);
  render(<MemoryRouter><BusinessPanelNew /></MemoryRouter>);
  await screen.findByText('Pierogi demo');
  const button = screen.getByRole('button', { name: 'OCZEKUJE NA PŁATNOŚĆ' });
  expect(button).toBeDisabled(); fireEvent.click(button); expect(statuses).toEqual([]);
});
it('discards a late response from the previously selected restaurant', async () => {
  let release: (value: Response) => void = () => {};
  const delayed = new Promise<Response>(resolve => { release = resolve; });
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const scope = new URL(String(input)).searchParams.get('restaurant_id');
    if (scope === 'A') return delayed; // Deliberately ignores abort, like a late cached response.
    return response([{ ...paidOrder(), id: 'order-B', restaurant_id: 'B' }]);
  }));
  const { result, rerender } = renderHook(({ restaurantId }) => useKDSPolling({ restaurantId }), { initialProps: { restaurantId: 'A' } });
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  rerender({ restaurantId: 'B' });
  await waitFor(() => expect(result.current.orders[0]?.id).toBe('order-B'));
  await act(async () => { release(response([{ ...paidOrder(), id: 'order-A', restaurant_id: 'A' }])); });
  expect(result.current.orders.map(order => order.id)).toEqual(['order-B']);
});
it('does not restart disabled polling when the window regains focus', async () => {
  const { fetchMock } = serve(paidOrder());
  renderHook(() => useKDSPolling({ restaurantId: 'rest-demo', enabled: false }));
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  expect(fetchMock).not.toHaveBeenCalled();
});

it('does not let a late successful kitchen action refresh the old restaurant over the new one', async () => {
  let finishPatch: (value: Response) => void = () => {};
  const patch = new Promise<Response>(resolve => { finishPatch = resolve; });
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    if (init?.method === 'PATCH') return patch;
    const scope = new URL(String(input)).searchParams.get('restaurant_id');
    return response([{ ...paidOrder(), id: `order-${scope}`, restaurant_id: scope }]);
  }));
  const { result, rerender } = renderHook(({ restaurantId }) => useKDSPolling({ restaurantId }), { initialProps: { restaurantId: 'A' } });
  await waitFor(() => expect(result.current.orders[0]?.id).toBe('order-A'));
  let action: Promise<boolean>;
  act(() => { action = result.current.startOrder('order-A'); });
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(true));
  rerender({ restaurantId: 'B' });
  await waitFor(() => expect(result.current.orders[0]?.id).toBe('order-B'));
  await act(async () => { finishPatch(response({})); await action; });
  expect(result.current.orders.map(order => order.id)).toEqual(['order-B']);
  expect(result.current.isLoading).toBe(false);
});
