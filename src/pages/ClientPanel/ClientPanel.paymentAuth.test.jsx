import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ getSession: vi.fn(), fetch: vi.fn(), push: vi.fn(), refresh: vi.fn(), orders: [
  { id: 'order-1', status: 'pending', total_price: 24, created_at: '2026-09-11T10:00:00Z', items: [] },
] }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  auth: { getSession: mock.getSession },
  from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
}) }));
vi.mock('../../state/auth', () => ({ useAuth: () => ({ user: { id: 'customer-a', email: 'test@example.com', user_metadata: { first_name: 'Test' } } }) }));
vi.mock('../../hooks/useOrders', () => ({ useOrders: () => ({ orders: mock.orders, loading: false, fetchOrders: mock.refresh }) }));
vi.mock('../../store/useConversationStore', () => ({ useConversationStore: { getState: () => ({ sessionId: 'sess_test', handleOrderSuccess: vi.fn() }) } }));
vi.mock('../../components/Toast', () => ({ useToast: () => ({ push: mock.push }) }));
vi.mock('../../components/StarfieldBackground', () => ({ default: () => null }));
vi.mock('../../lib/config', () => ({ getApiUrl: path => path }));
vi.mock('../../lib/analysisConsent', () => ({ getAnalysisConsent: async () => ({}), updateAnalysisConsent: vi.fn() }));
import ClientPanel from './ClientPanel';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mock.getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-current' } } });
  // Stop at the payment response: no redirect, finalization or external service calls.
  mock.fetch.mockImplementation(async () => new Response(JSON.stringify({ error: 'test-response-stop' }), { status: 400 }));
  vi.stubGlobal('fetch', mock.fetch);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const mount = (suffix = '') => render(<MemoryRouter initialEntries={[`/panel/client?section=orders${suffix}`]}><ClientPanel /></MemoryRouter>);

it('checkout-session reads JWT at click time and sends Authorization', async () => {
  mount();
  const button = await screen.findByRole('button', { name: 'Przejdź do płatności' });
  mock.getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-checkout-fresh' } } });
  fireEvent.click(button);
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(1));
  const [url, init] = mock.fetch.mock.calls[0];
  expect(url).toBe('/api/payments/checkout-session');
  expect(init.method).toBe('POST');
  expect(init.headers.Authorization).toBe('Bearer jwt-checkout-fresh');
  expect(JSON.parse(init.body).order_id).toBe('order-1');
  expect(mock.getSession).toHaveBeenCalledTimes(1);
});

it('verify-session reads JWT on return and sends the required order/session IDs', async () => {
  mock.getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-verify-fresh' } } });
  mount('&stripe=success&order_id=order-1&session_id=cs_test_1');
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(1));
  expect(mock.fetch).toHaveBeenCalledWith('/api/payments/verify-session', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jwt-verify-fresh' },
    body: JSON.stringify({ order_id: 'order-1', session_id: 'cs_test_1' }),
  });
  expect(mock.getSession).toHaveBeenCalledTimes(1);
});

it.each(['checkout', 'verify'])('%s refuses a request without JWT', async endpoint => {
  mock.getSession.mockResolvedValue({ data: { session: null } });
  mount(endpoint === 'verify' ? '&stripe=success&order_id=order-1&session_id=cs_test_1' : '');
  if (endpoint === 'checkout') fireEvent.click(await screen.findByRole('button', { name: 'Przejdź do płatności' }));
  await waitFor(() => expect(mock.push).toHaveBeenCalledWith(expect.stringMatching(/zalog/i), 'error'));
  expect(mock.fetch).not.toHaveBeenCalled();
});

it('finalize after a verified payment sends Authorization and the Stripe checkout id', async () => {
  // Production 2026-09-26: finalize went without Authorization -> 401, so only the
  // Stripe webhook could confirm a paid order.
  mock.getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-return' } } });
  mock.fetch.mockImplementation(async (url) => url === '/api/payments/verify-session'
    ? new Response(JSON.stringify({ ok: true, paid: true, order_id: 'order-1' }), { status: 200 })
    : new Response(JSON.stringify({ ok: true, order_id: 'order-1', status: 'confirmed' }), { status: 200 }));
  mount('&stripe=success&order_id=order-1&session_id=cs_test_1');
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledWith('/api/orders/finalize', expect.anything()));
  const [, init] = mock.fetch.mock.calls.find(([url]) => url === '/api/orders/finalize');
  expect(init.method).toBe('POST');
  expect(init.headers.Authorization).toBe('Bearer jwt-return');
  expect(JSON.parse(init.body)).toEqual({ order_id: 'order-1', checkout_session_id: 'cs_test_1' });
});
