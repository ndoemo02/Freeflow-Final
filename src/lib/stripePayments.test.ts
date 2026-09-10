import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('./supabase', () => ({ getAccessToken: async () => 'test-token' }));
vi.mock('./config', () => ({ getApiUrl: (path: string) => path }));
import { startStripeCheckout, finalizeStripeOrder } from './stripePayments';
afterEach(() => vi.unstubAllGlobals());
describe('payment UI transport', () => {
  it('sends only the order ID and JWT when the customer starts payment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, url: 'https://checkout.stripe.com/pay/test' })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await startStripeCheckout('order-a')).toBe('https://checkout.stripe.com/pay/test');
    const [url, init] = fetchMock.mock.calls[0]; expect(url).toBe('/api/payments/checkout-session');
    expect(JSON.parse(init.body)).toEqual({ order_id: 'order-a' }); expect(init.headers.get('Authorization')).toBe('Bearer test-token');
  });
  it('binds the payment return to both order and checkout IDs without conversation/cart fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, order_id: 'order-a', status: 'confirmed', confirmed_at: '2026-09-06T00:00:00Z' })));
    vi.stubGlobal('fetch', fetchMock);
    await finalizeStripeOrder('order-a', 'cs_test_a');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ order_id: 'order-a', checkout_session_id: 'cs_test_a' });
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer test-token');
  });
  it.each([409, 503])('does not report success for HTTP %s', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: 'payment_not_verified' }), { status })));
    await expect(finalizeStripeOrder('order-a', 'cs_test_a')).rejects.toThrow('nie została jeszcze potwierdzona');
  });
  it('rejects a wrong order or missing confirmation even with HTTP 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, order_id: 'other', status: 'confirmed' }))));
    await expect(finalizeStripeOrder('order-a', 'cs_test_a')).rejects.toThrow();
  });
  it('rejects an unexpected payment redirect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, url: 'https://example.invalid/pay' }))));
    await expect(startStripeCheckout('order-a')).rejects.toThrow();
  });
});
