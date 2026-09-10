import React from 'react';
import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ fetch: vi.fn(), push: vi.fn() }));
vi.mock('../lib/customerFetch', () => ({ customerFetch: mock.fetch }));
vi.mock('./auth', () => ({ useAuth: () => ({ user: { id: 'customer-a' } }) }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ push: mock.push }) }));
vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('../lib/config', () => ({ getApiUrl: path => path }));
vi.mock('../store/useConversationStore', () => ({ useConversationStore: { getState: () => ({ cart: null, cartSyncKey: 0 }) } }));
vi.mock('../state/ActiveSessionMap', () => ({ activeSessionMap: { delete: vi.fn() } }));
import { CartProvider, useCart } from './CartContext';
const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('amber-session-id', 'sess_cart_payment_test');
  mock.fetch.mockReset(); mock.push.mockClear();
});
afterEach(cleanup);
async function filledCart() {
  const hook = renderHook(() => useCart(), { wrapper });
  await act(async () => hook.result.current.addToCart({ id: 'dish', name: 'Pierogi', price: 12, quantity: 2 }, { id: '11111111-1111-4111-8111-111111111111', name: 'Demo' }));
  mock.push.mockClear(); return hook;
}
it('keeps the reviewed cart and retry key after a lost response, clears only after success', async () => {
  const { result } = await filledCart();
  mock.fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response(JSON.stringify({ id: 'order-1' })));
  await act(async () => { expect(await result.current.submitOrder({})).toBe(false); });
  expect(result.current.cart).toHaveLength(1); expect(result.current.total).toBe(24);
  expect(mock.push.mock.calls.some(([, type]) => type === 'success')).toBe(false);
  await act(async () => { expect((await result.current.submitOrder({})).id).toBe('order-1'); });
  const first = mock.fetch.mock.calls[0][1], retry = mock.fetch.mock.calls[1][1];
  expect(retry.headers['Idempotency-Key']).toBe(first.headers['Idempotency-Key']); expect(retry.body).toBe(first.body);
  expect(JSON.parse(first.body)).toMatchObject({ session_id: 'sess_cart_payment_test', total_cents: 2400, items: [{ menu_item_id: 'dish', qty: 2 }] });
  expect(result.current.cart).toHaveLength(0);
});
it('keeps the cart after a price conflict and uses a new key after the customer changes it', async () => {
  const { result } = await filledCart();
  mock.fetch.mockImplementation(async () => new Response(JSON.stringify({ error: 'price_changed_review_required' }), { status: 409 }));
  await act(async () => { await result.current.submitOrder({}); });
  expect(result.current.cart).toHaveLength(1);
  await act(async () => result.current.updateQuantity('dish', 3));
  await act(async () => { await result.current.submitOrder({}); });
  expect(mock.fetch.mock.calls[1][1].headers['Idempotency-Key']).not.toBe(mock.fetch.mock.calls[0][1].headers['Idempotency-Key']);
  expect(result.current.total).toBe(36);
});
