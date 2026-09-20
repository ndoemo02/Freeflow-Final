export function blockedSideEffect(method, rawUrl) {
  const url = new URL(rawUrl);
  const normalizedMethod = String(method || 'GET').toUpperCase();
  if (url.hostname === 'stripe.com' || url.hostname.endsWith('.stripe.com')) return 'stripe';
  if (/^\/api\/payments(?:\/|$)/.test(url.pathname)) return 'payment_api';
  if (normalizedMethod === 'POST' && url.pathname === '/api/orders') return 'order_submit';
  return null;
}
