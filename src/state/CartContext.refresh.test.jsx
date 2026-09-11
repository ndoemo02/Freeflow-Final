import React from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ state: { cart: null, cartSyncKey: 0 } }));
vi.mock('./auth', () => ({ useAuth: () => ({ user: { id: 'customer-a' } }) }));
vi.mock('../lib/supabase', () => ({ supabase: {}, getAccessToken: vi.fn() }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ push: vi.fn() }) }));
vi.mock('../store/useConversationStore', () => ({ useConversationStore: { getState: () => mock.state } }));
vi.mock('./ActiveSessionMap', () => ({ activeSessionMap: { delete: vi.fn() } }));

import { CartProvider, useCart } from './CartContext';
const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
const items = [{ id: 'dish-1', name: 'Pierogi', price: 12, quantity: 2 }];

beforeEach(() => {
  localStorage.clear();
  mock.state = { cart: null, cartSyncKey: 0 };
  localStorage.setItem('freeflow_cart', JSON.stringify(items));
  localStorage.setItem('freeflow_cart_restaurant', JSON.stringify({ id: 'demo', name: 'Demo' }));
  localStorage.setItem('freeflow_cart_session', 'sess_before_reload');
  localStorage.setItem('freeflow_cart_owner', 'customer-a');
  localStorage.setItem('amber-session-id', 'sess_before_reload');
});
afterEach(cleanup);

// Characterization of existing guards, not acceptance of the desired durable checkout.
it('restores saved cart when the conversation session remains unchanged', () => {
  const { result } = renderHook(() => useCart(), { wrapper });
  expect(result.current.cart).toEqual(items);
  expect(result.current.restaurant.name).toBe('Demo');
});

it('discards saved cart after the real conversation store initializes a fresh session', async () => {
  const { useConversationStore } = await vi.importActual('../store/useConversationStore');
  expect(useConversationStore.getState().sessionId).not.toBe('sess_before_reload');
  expect(localStorage.getItem('amber-session-id')).toBe(useConversationStore.getState().sessionId);
  expect(useConversationStore.getState().cartSyncKey).toBe(0);
  const { result } = renderHook(() => useCart(), { wrapper });
  expect(result.current.cart).toEqual([]);
  expect(localStorage.getItem('freeflow_cart')).toBeNull();
  expect(localStorage.getItem('freeflow_cart_restaurant')).toBeNull();
});

it('ghost guard discards a cleared cart even with an unchanged session', () => {
  mock.state = { cart: null, cartSyncKey: 1 };
  const { result } = renderHook(() => useCart(), { wrapper });
  expect(result.current.cart).toEqual([]);
  expect(localStorage.getItem('freeflow_cart')).toBeNull();
});

it('discards a cart without a saved session marker', () => {
  localStorage.removeItem('freeflow_cart_session');
  const { result } = renderHook(() => useCart(), { wrapper });
  expect(result.current.cart).toEqual([]);
});
