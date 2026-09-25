import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  auth: { user: { id: 'a' }, isLoading: false }, state: { cart: null, cartSyncKey: 0 },
  fetch: vi.fn(), token: vi.fn(), listener: null,
}));
vi.mock('./auth', () => ({ useAuth: () => mock.auth }));
vi.mock('../lib/supabase', () => ({ supabase: {}, getAccessToken: mock.token }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ push: vi.fn() }) }));
vi.mock('../lib/config', () => ({ getApiUrl: path => path }));
vi.mock('../store/useConversationStore', () => ({ useConversationStore: { getState: () => mock.state, setState: vi.fn(),
  subscribe: fn => { mock.listener = fn; return () => { mock.listener = null; }; },
} }));
vi.mock('./ActiveSessionMap', () => ({ activeSessionMap: { delete: vi.fn() } }));
import { CartProvider, useCart } from './CartContext';
import { CHECKOUT_DRAFT_KEY } from '../lib/checkoutDraft';
import { useActionDispatcher } from '../hooks/useActionDispatcher';
import { compactToolResponse } from '../hooks/useGeminiLiveSession';
import replay from './fixtures/liveCartAuditReplay.json';
const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
const restaurant = { id: '11111111-1111-4111-8111-111111111111', name: 'Demo' };
const items = [{ id: 'dish-1', name: 'Pierogi', price: 12, quantity: 2 }];
const delivery = { name: 'Test', phone: '123', address: 'Test 1', notes: 'Dzwonek' };
const read = () => JSON.parse(localStorage.getItem(CHECKOUT_DRAFT_KEY));
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('amber-session-id', 'sess_live_a');
  mock.auth = { user: { id: 'a' }, isLoading: false };
  mock.state = { cart: null, cartSyncKey: 0 };
  mock.fetch.mockReset().mockImplementation(async () => new Response(JSON.stringify({ id: 'order-1' })));
  mock.token.mockReset().mockResolvedValue('jwt-a');
  vi.stubGlobal('fetch', mock.fetch);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('audit: active draft accepts a later Live snapshot from its session and reload restores it', async () => {
  const hook = renderHook(() => ({ ...useCart(), ...useActionDispatcher() }), { wrapper });
  const first = replay.steps[0].response;
  const second = replay.steps[1].response;
  vi.stubEnv('VITE_FREEFLOW_TRACELAB_DEBUG', '1');
  window.__FREEFLOW_CART_AUDIT__ = { run_id: 'checkout-regression', sessionId: 'sess_live_a', events: [] };
  await act(async () => hook.result.current.syncCart(first.cart.items, replay.restaurant));
  await act(async () => hook.result.current.setIsOpen(true));
  expect(hook.result.current.hasCheckoutDraft).toBe(true);
  const compact = compactToolResponse('add_item_to_cart', second);
  expect(compact.actionStatus).toBe('added');
  expect(compact.cartCount).toBe(2);
  await act(async () => hook.result.current.syncCart(second.cart.items, replay.restaurant));
  expect(hook.result.current.cart.map(item => item.id)).toEqual(second.cart.items.map(item => item.id));
  const attempt = window.__FREEFLOW_CART_AUDIT__.events.filter(event => event.event === 'cart_sync_attempt').at(-1).payload;
  expect(attempt).toMatchObject({ draft_active: true, owner_ready: true, session_matches: true, session_blocked: false });
  expect(attempt.incoming.items).toHaveLength(2);
  expect(read().cart).toHaveLength(2);
  expect(remount(hook).result.current.cart).toHaveLength(2);
  delete window.__FREEFLOW_CART_AUDIT__;
  vi.unstubAllEnvs();
  expect(mock.fetch).not.toHaveBeenCalled();
});

it('Live add badge must not create a checkout draft: all three backend items remain visible', async () => {
  const hook = renderHook(() => ({ ...useCart(), ...useActionDispatcher() }), { wrapper });
  const snapshots = [];
  for (const step of replay.steps) {
    const response = step.response;
    // Same boundaries as Live events: dispatch actions, then Cart consumes the store snapshot.
    await act(async () => hook.result.current.dispatch(response.actions,
      { ...response.meta, intent: response.intent, tool: step.tool, cart: response.cart }));
    if (response.cart) {
      await act(async () => hook.result.current.syncCart(response.cart.items, replay.restaurant));
      snapshots.push({ draft: hook.result.current.hasCheckoutDraft, count: hook.result.current.cart.length });
    }
  }
  expect(snapshots).toEqual([{ draft: false, count: 1 }, { draft: false, count: 2 }, { draft: false, count: 3 }]);
  expect(hook.result.current.cart.map(item => item.id)).toEqual(replay.steps.at(-1).response.cart.items.map(item => item.id));
  expect(mock.fetch).not.toHaveBeenCalled();
});
async function handoff() {
  const hook = renderHook(() => ({ ...useCart(), ...useActionDispatcher() }), { wrapper });
  await act(async () => hook.result.current.dispatch([
    { type: 'SYNC_CART', payload: { items, restaurant } },
    { type: 'SHOW_CART', payload: { mode: 'checkout' } },
  ], { tool: 'open_checkout' }));
  await act(async () => hook.result.current.setCheckoutDelivery(delivery));
  expect(hook.result.current.hasCheckoutDraft).toBe(true);
  return hook;
}
function remount(hook) {
  hook.unmount();
  localStorage.setItem('amber-session-id', 'sess_after_reload');
  return renderHook(() => useCart(), { wrapper });
}

it('hands off the visible Live cart and restores it after reload under a new session', async () => {
  const hook = await handoff();
  const before = hook.result.current.cart;
  const next = remount(hook);
  expect(next.result.current.cart).toEqual(before);
  expect(next.result.current.restaurant).toEqual(restaurant);
  expect(next.result.current.checkoutDelivery).toEqual(delivery);
  expect(next.result.current.isOpen).toBe(true);
  expect(mock.fetch).not.toHaveBeenCalled();
});

it('restores an owned checkout even if Live ghost guard signals that its conversation was cleared', async () => {
  const hook = await handoff();
  mock.state = { cart: null, cartSyncKey: 10 };
  const next = remount(hook);
  expect(next.result.current.cart).toHaveLength(1);
  await act(async () => next.result.current.resetCartLocal({ source: 'live', clearRestaurant: true }));
  await act(async () => next.result.current.syncCart([], null));
  expect(next.result.current.cart).toHaveLength(1);
  await act(async () => next.result.current.syncCart([{ id: 'beer-1', name: 'Piwo', price: 9, quantity: 1 }], restaurant));
  expect(next.result.current.cart.map(item => item.id)).toEqual(['dish-1']);
});

it('keeps an open checkout editable by Live in the same session but ignores Live clears', async () => {
  const hook = await handoff();
  await act(async () => hook.result.current.dispatch([
    { type: 'SYNC_CART', payload: { items: [{ ...items[0], quantity: 3 }, { id: 'beer-1', name: 'Piwo', price: 9, quantity: 1 }], restaurant } },
  ], {}));
  expect(hook.result.current.cart.map(item => [item.id, item.quantity])).toEqual([['dish-1', 3], ['beer-1', 1]]);
  expect(read().cart).toHaveLength(2);
  await act(async () => hook.result.current.dispatch([{ type: 'CLEAR_CART' }], {}, undefined, [{ type: 'EVENT_ORDER_COMPLETED' }]));
  expect(hook.result.current.cart).toHaveLength(2);
  expect(hook.result.current.hasCheckoutDraft).toBe(true);
});

it('follows a voice removal of the last item in the same session and drops the draft', async () => {
  const hook = await handoff();
  await act(async () => hook.result.current.syncCart([], restaurant));
  expect(hook.result.current.cart).toHaveLength(0);
  expect(hook.result.current.hasCheckoutDraft).toBe(false);
  expect(localStorage.getItem(CHECKOUT_DRAFT_KEY)).toBeNull();
});

it('freezes the cart while the order submission is in flight', async () => {
  const hook = await handoff();
  let resolvePost;
  mock.fetch.mockImplementationOnce(() => new Promise(resolve => { resolvePost = resolve; }));
  let pending;
  await act(async () => { pending = hook.result.current.submitOrder(delivery); await Promise.resolve(); });
  await vi.waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(1));
  await act(async () => hook.result.current.syncCart([{ ...items[0], quantity: 7 }], restaurant));
  expect(hook.result.current.cart[0].quantity).toBe(2);
  await act(async () => { resolvePost(new Response(JSON.stringify({ id: 'order-1' }))); await pending; });
});

it('persists edits and a failed attempt, then retries exactly the same order after reload', async () => {
  const hook = await handoff();
  await act(async () => hook.result.current.updateQuantity('dish-1', 3));
  mock.fetch.mockRejectedValueOnce(new TypeError('lost response'));
  await act(async () => { expect(await hook.result.current.submitOrder(delivery)).toBe(false); });
  const first = mock.fetch.mock.calls[0][1];
  expect(read().submission.key).toBe(first.headers['Idempotency-Key']);
  const next = remount(hook);
  mock.token.mockResolvedValue('jwt-refreshed');
  await act(async () => { await next.result.current.submitOrder(next.result.current.checkoutDelivery); });
  const retry = mock.fetch.mock.calls[1][1];
  expect(retry.headers['Idempotency-Key']).toBe(first.headers['Idempotency-Key']);
  expect(retry.headers.Authorization).toBe('Bearer jwt-refreshed');
  expect(retry.body).toBe(first.body);
  expect(read()).toBeNull();
  expect(remount(next).result.current.cart).toEqual([]);
});

it.each(['clear', 'remove last item'])('does not revive a cancelled checkout after %s, and gives a new order a new key', async action => {
  const hook = await handoff();
  mock.fetch.mockRejectedValueOnce(new TypeError('lost response'));
  await act(async () => { await hook.result.current.submitOrder(delivery); });
  const oldKey = read().submission.key;
  await act(async () => action === 'clear'
    ? hook.result.current.resetCartLocal({ clearRestaurant: true, closeDrawer: true })
    : hook.result.current.removeFromCart('dish-1'));
  await act(async () => hook.result.current.syncCart(items, restaurant));
  expect(hook.result.current.cart).toEqual([]);
  expect(read()).toBeNull();
  const next = remount(hook);
  expect(next.result.current.cart).toEqual([]);
  await act(async () => next.result.current.addToCart(items[0], restaurant));
  await act(async () => { await next.result.current.submitOrder(delivery); });
  expect(mock.fetch.mock.calls[1][1].headers['Idempotency-Key']).not.toBe(oldKey);
});

it('waits for auth hydration and never exposes a draft to another user', async () => {
  const hook = await handoff();
  mock.auth = { user: null, isLoading: true };
  const next = remount(hook);
  expect(next.result.current.cart).toEqual([]);
  expect(read().ownerId).toBe('a');
  mock.auth = { user: { id: 'b' }, isLoading: false };
  next.rerender();
  expect(next.result.current.cart).toEqual([]);
  expect(read()).toBeNull();
});

it.each([null, { id: 'b' }])('clears state on logout/account switch (%j)', async user => {
  const hook = await handoff();
  mock.auth = { user, isLoading: false };
  hook.rerender();
  expect(hook.result.current.cart).toEqual([]);
  expect(read()).toBeNull();
  mock.auth = { user: { id: 'a' }, isLoading: false };
  hook.rerender();
  expect(hook.result.current.cart).toEqual([]);
});

it('does not POST if the attempt cannot be persisted', async () => {
  const hook = await handoff();
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  await act(async () => { expect(await hook.result.current.submitOrder(delivery)).toBe(false); });
  expect(mock.fetch).not.toHaveBeenCalled();
});

it('does not POST when the owner changes while obtaining the JWT', async () => {
  const hook = await handoff();
  let release;
  mock.token.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  let pending;
  await act(async () => { pending = hook.result.current.submitOrder(delivery); });
  mock.auth = { user: { id: 'b' }, isLoading: false };
  hook.rerender();
  await act(async () => { release('jwt-b'); await pending; });
  expect(mock.fetch).not.toHaveBeenCalled();
});

it('restores the same user draft only after auth hydration completes', async () => {
  const hook = await handoff();
  mock.auth = { user: null, isLoading: true };
  const next = remount(hook);
  expect(next.result.current.cart).toEqual([]);
  mock.auth = { user: { id: 'a' }, isLoading: false };
  next.rerender();
  expect(next.result.current.cart[0].quantity).toBe(2);
});

it('isolates transient Live carts between sessions and ignores an old callback', async () => {
  const hook = renderHook(() => useCart(), { wrapper });
  await act(async () => hook.result.current.syncCart(items, restaurant));
  expect(hook.result.current.hasCheckoutDraft).toBe(false);
  const oldSync = hook.result.current.syncCart;
  await act(async () => {
    localStorage.setItem('amber-session-id', 'sess_live_b');
    mock.listener({ sessionId: 'sess_live_b' }, { sessionId: 'sess_live_a' });
  });
  expect(hook.result.current.cart).toEqual([]);
  await act(async () => oldSync(items, restaurant));
  expect(hook.result.current.cart).toEqual([]);
  await act(async () => hook.result.current.syncCart(items, restaurant));
  expect(hook.result.current.cart).toHaveLength(1);
});

it('keeps an owned checkout when Live changes sessions without reload', async () => {
  const hook = await handoff();
  await act(async () => {
    localStorage.setItem('amber-session-id', 'sess_live_b');
    mock.listener({ sessionId: 'sess_live_b' }, { sessionId: 'sess_live_a' });
  });
  expect(hook.result.current.cart).toHaveLength(1);
  expect(read().ownerId).toBe('a');
});

it('does not resurrect a checkout cleared in another tab', async () => {
  const hook = await handoff();
  await act(async () => {
    localStorage.removeItem(CHECKOUT_DRAFT_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: CHECKOUT_DRAFT_KEY, newValue: null }));
  });
  expect(hook.result.current.cart).toEqual([]);
  await act(async () => { expect(await hook.result.current.submitOrder(delivery)).toBe(false); });
  expect(mock.fetch).not.toHaveBeenCalled();
  expect(read()).toBeNull();
});

it('blocks damaged persisted attempts instead of silently assigning a fresh key', async () => {
  const hook = await handoff();
  const damaged = { ...read(), submission: { body: '{}', key: '' } };
  localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(damaged));
  const next = remount(hook);
  expect(next.result.current.checkoutError).toBeTruthy();
  expect(next.result.current.isOpen).toBe(true);
  await act(async () => { expect(await next.result.current.submitOrder(delivery)).toBe(false); });
  expect(mock.fetch).not.toHaveBeenCalled();
});

it('sends the Live session that built the cart, so the backend can clear that session cart', async () => {
  const hook = await handoff();
  localStorage.setItem('amber-session-id', 'sess_live_b');
  await act(async () => { await hook.result.current.submitOrder(delivery); });
  const body = JSON.parse(mock.fetch.mock.calls[0][1].body);
  expect(body.session_id).toBe('sess_live_a');
  expect(body.items).toEqual([expect.objectContaining({ menu_item_id: 'dish-1', qty: 2 })]);
});
