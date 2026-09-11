import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
vi.mock('../state/auth', () => ({ useAuth: () => ({ user: { id: 'a' }, isLoading: false }) }));
vi.mock('../lib/supabase', () => ({ supabase: {}, getAccessToken: vi.fn() }));
vi.mock('./Toast', () => ({ useToast: () => ({ push: vi.fn() }) }));
vi.mock('../store/useConversationStore', () => {
  const state = { cart: null, cartSyncKey: 0, conversationPhase: 'idle', uiMode: 'list' };
  return { useConversationStore: Object.assign(selector => selector(state), { getState: () => state }) };
});
vi.mock('../state/ActiveSessionMap', () => ({ activeSessionMap: { delete: vi.fn() } }));
vi.mock('@headlessui/react', () => {
  const Box = ({ children }) => <div>{children}</div>;
  const Transition = ({ show, children }) => show ? <div>{children}</div> : null;
  Transition.Child = Box;
  const Dialog = Object.assign(Box, { Panel: Box, Title: Box });
  return { Dialog, Transition };
});
vi.mock('framer-motion', () => ({ motion: { div: ({ children }) => <div>{children}</div> }, AnimatePresence: ({ children }) => <>{children}</> }));
import Cart from './Cart';
import { CartProvider } from '../state/CartContext';
import { CHECKOUT_DRAFT_KEY } from '../lib/checkoutDraft';
afterEach(() => { cleanup(); localStorage.clear(); });

it('shows restored checkout fields, persists manual edits and requires fresh manual approval', () => {
  localStorage.clear();
  localStorage.setItem('amber-session-id', 'sess_new_live');
  localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({
    version: 1, ownerId: 'a', id: 'draft-1',
    cart: [{ id: 'dish-1', name: 'Pierogi', price: 12, quantity: 2 }],
    restaurant: { id: 'demo', name: 'Demo' },
    deliveryInfo: { name: 'Test', phone: '123', address: 'Test 1', notes: 'Dzwonek' },
    submission: null,
  }));
  const mount = () => render(<MemoryRouter><CartProvider><Cart /></CartProvider></MemoryRouter>);
  const first = mount();
  expect(screen.getByText('Pierogi')).toBeTruthy();
  expect(screen.getByPlaceholderText('Adres dostawy').value).toBe('Test 1');
  expect(screen.getByRole('checkbox').checked).toBe(false);
  fireEvent.change(screen.getByPlaceholderText('Adres dostawy'), { target: { value: 'Test 2' } });
  expect(JSON.parse(localStorage.getItem(CHECKOUT_DRAFT_KEY)).deliveryInfo.address).toBe('Test 2');
  fireEvent.click(screen.getByRole('checkbox'));
  first.unmount();
  mount();
  expect(screen.getByPlaceholderText('Adres dostawy').value).toBe('Test 2');
  expect(screen.getByRole('checkbox').checked).toBe(false);
});
