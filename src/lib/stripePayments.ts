import { customerFetch } from './customerFetch';
import { getApiUrl } from './config';

export function paymentErrorMessage(code?: string) {
  if (code === 'price_changed_review_required' || code === 'order_requires_review') return 'Sprawdź aktualne ceny i złóż zamówienie ponownie.';
  if (code === 'payment_not_verified') return 'Płatność nie została jeszcze potwierdzona. Spróbuj odświeżyć stronę.';
  if (code === 'checkout_expired') return 'Sesja płatności wygasła. Złóż zamówienie ponownie.';
  if (code === 'unauthorized') return 'Zaloguj się, aby kontynuować płatność.';
  return 'Nie udało się potwierdzić operacji płatności. Spróbuj ponownie.';
}
async function post(path: string, body: object) {
  const response = await customerFetch(getApiUrl(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) throw new Error(paymentErrorMessage(payload.error));
  return payload;
}
export async function startStripeCheckout(orderId: string): Promise<string> {
  const payload = await post('/api/payments/checkout-session', { order_id: orderId });
  const url = new URL(payload.url);
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password) throw new Error(paymentErrorMessage());
  return url.href;
}
export async function finalizeStripeOrder(orderId: string, checkoutId: string) {
  const payload = await post('/api/orders/finalize', { order_id: orderId, checkout_session_id: checkoutId });
  if (payload.order_id !== orderId || !payload.confirmed_at || !['confirmed', 'accepted', 'preparing', 'completed', 'delivered'].includes(payload.status)) throw new Error(paymentErrorMessage());
  return payload;
}
