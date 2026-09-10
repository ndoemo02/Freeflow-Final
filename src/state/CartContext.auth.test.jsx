import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ getSession: vi.fn(), push: vi.fn(), fetch: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getSession: mock.getSession } }) }));
vi.mock('./auth', () => ({ useAuth: () => ({ user: { id: 'customer-a' } }) }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ push: mock.push }) }));
vi.mock('../lib/config', () => ({ getApiUrl: path => path }));
vi.mock('../store/useConversationStore', () => ({ useConversationStore: { getState: () => ({ cart: null, cartSyncKey: 0 }) } }));
vi.mock('../state/ActiveSessionMap', () => ({ activeSessionMap: { delete: vi.fn() } }));

import { CartProvider, useCart } from './CartContext';
const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mock.getSession.mockResolvedValue({ data: { session: { access_token: 'current-token' } } });
  mock.fetch.mockImplementation(async () => new Response(JSON.stringify({ id: 'order-1' })));
  vi.stubGlobal('fetch', mock.fetch);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function filledCart() {
  const hook = renderHook(() => useCart(), { wrapper });
  await act(async () => hook.result.current.addToCart(
    { id: 'dish-1', name: 'Pierogi', price: 12, quantity: 2 },
    { id: '11111111-1111-4111-8111-111111111111', name: 'Demo' },
  ));
  mock.push.mockClear();
  return hook;
}

it('manual confirmation reads the current Supabase session and sends its JWT', async () => {
  const { result } = await filledCart();
  // Token changes after render: submission must read the session at click time.
  mock.getSession.mockResolvedValue({ data: { session: { access_token: 'refreshed-token' } } });
  await act(async () => { expect(await result.current.submitOrder({})).toEqual({ id: 'order-1' }); });
  expect(mock.getSession).toHaveBeenCalledTimes(1);
  expect(mock.fetch).toHaveBeenCalledTimes(1);
  const [url, init] = mock.fetch.mock.calls[0];
  expect(url).toBe('/api/orders');
  expect(init.method).toBe('POST');
  expect(new Headers(init.headers).get('Authorization')).toBe('Bearer refreshed-token');
  expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  expect(JSON.parse(init.body)).toMatchObject({ total_cents: 2400, items: [{ menu_item_id: 'dish-1', qty: 2 }] });
});

it.each([null, { access_token: '' }])('does not send an order without JWT despite cached user state (%j)', async session => {
  const { result } = await filledCart();
  mock.getSession.mockResolvedValue({ data: { session } });
  await act(async () => { expect(await result.current.submitOrder({})).toBe(false); });
  expect(mock.fetch).not.toHaveBeenCalled();
  expect(result.current.cart).toHaveLength(1);
  expect(result.current.isSubmitting).toBe(false);
  expect(mock.push).toHaveBeenCalledWith(expect.stringMatching(/zalog/i), 'error');
});

it('preserves the cart after server rejection and reads a fresh JWT for an explicit retry', async () => {
  const { result } = await filledCart();
  mock.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }));
  await act(async () => { expect(await result.current.submitOrder({})).toBe(false); });
  expect(result.current.cart).toHaveLength(1);
  expect(mock.fetch).toHaveBeenCalledTimes(1);
  mock.getSession.mockResolvedValue({ data: { session: { access_token: 'next-token' } } });
  await act(async () => { await result.current.submitOrder({}); });
  expect(mock.getSession).toHaveBeenCalledTimes(2);
  expect(new Headers(mock.fetch.mock.calls[1][1].headers).get('Authorization')).toBe('Bearer next-token');
});
