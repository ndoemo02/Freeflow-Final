import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ getSession: vi.fn(), fetch: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getSession: mock.getSession } }) }));
vi.mock('../lib/config', () => ({ getApiUrl: path => path }));
import { useOrders } from './useOrders';

beforeEach(() => {
  vi.clearAllMocks();
  mock.getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-current' } } });
  mock.fetch.mockImplementation(async () => new Response(JSON.stringify({ orders: [{ id: 'order-1', items: [] }] })));
  vi.stubGlobal('fetch', mock.fetch);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('GET sends the current Supabase JWT and reads it again for refresh', async () => {
  const { result } = renderHook(() => useOrders({ userId: 'customer-a' }));
  await waitFor(() => expect(result.current.orders).toHaveLength(1));
  expect(mock.fetch.mock.calls[0][0]).toBe('/api/orders?user_id=customer-a');
  expect(mock.fetch.mock.calls[0][1]).toMatchObject({ method: 'GET', headers: { Authorization: 'Bearer jwt-current' } });
  mock.getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-refreshed' } } });
  await act(async () => { await result.current.fetchOrders(); });
  expect(mock.getSession).toHaveBeenCalledTimes(2);
  expect(mock.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer jwt-refreshed');
});

it.each([null, { access_token: '' }])('GET refuses to send a request without JWT (%j)', async session => {
  mock.getSession.mockResolvedValue({ data: { session } });
  const { result } = renderHook(() => useOrders({ userId: 'customer-a' }));
  await waitFor(() => expect(result.current.error).toMatch(/zalog/i));
  expect(mock.fetch).not.toHaveBeenCalled();
  expect(result.current.loading).toBe(false);
});

it('PATCH obtains JWT at mutation time and preserves the existing URL/body', async () => {
  const { result } = renderHook(() => useOrders());
  mock.getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-patch' } } });
  mock.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ order: { id: 'order-1', status: 'cancelled', items: [] } })));
  await act(async () => {
    expect(await result.current.updateOrderStatus('order-1', 'cancelled')).toMatchObject({ id: 'order-1', status: 'cancelled' });
  });
  expect(mock.getSession).toHaveBeenCalledTimes(1);
  expect(mock.fetch).toHaveBeenCalledWith('/api/orders/order-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jwt-patch' },
    body: JSON.stringify({ status: 'cancelled' }),
  });
});

it('PATCH refuses to send a request without JWT', async () => {
  const { result } = renderHook(() => useOrders());
  mock.getSession.mockResolvedValue({ data: { session: null } });
  await act(async () => { await expect(result.current.updateOrderStatus('order-1', 'cancelled')).rejects.toThrow(/zalog/i); });
  expect(mock.fetch).not.toHaveBeenCalled();
  expect(result.current.loading).toBe(false);
});
