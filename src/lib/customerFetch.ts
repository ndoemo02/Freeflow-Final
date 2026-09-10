import { getAccessToken } from './supabase';

export async function customerFetch(url: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Zaloguj się, aby uzyskać dostęp do zamówień.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.method?.toUpperCase() === 'POST' && /\/api\/orders(?:\?|$)/.test(url) && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', crypto.randomUUID());
  }
  return fetch(url, { ...init, headers });
}
