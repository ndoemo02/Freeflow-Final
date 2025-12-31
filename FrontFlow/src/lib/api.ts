// src/lib/api.ts - using Vercel proxy for CORS

export default async function api(path: string, init?: RequestInit): Promise<any> {
  // Use full URLs if they start with http, otherwise relative URLs
  const fullUrl = path.startsWith('http') ? path : path;
  
  const res = await fetch(fullUrl, init);

  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error("API error:", text);
    const msg = text || res.statusText || 'Unknown error';
    throw new Error(`API ${res.status}: ${msg}`);
  }

  // brak body lub nie-JSON? zwróć pusty obiekt
  if (!isJson) {
    return {};
  }

  // bezpieczne parsowanie
  const raw = await res.text().catch(() => '');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    // mimo Content-Type nie da się zparsować
    return {};
  }
}

export async function tts(text: string, opts?: { lang?: string; voiceName?: string; gender?: string; audioEncoding?: string }): Promise<HTMLAudioElement> {
  const body = JSON.stringify({ text, ...(opts || {}) });
  const data = await api('/api/tts', { method: 'POST', body });
  const audioContent = data?.audioContent || '';
  const contentType = data?.contentType || 'audio/mpeg';
  const mime = contentType || 'audio/mpeg';
  const audio = new Audio(`data:${mime};base64,${audioContent}`);
  return audio;
}

// Funkcje do zamówień
export interface OrderItem {
  menu_item_id: string;
  name: string;
  unit_price_cents: number;
  qty: number;
}

export interface CreateOrderRequest {
  restaurant_id: string;
  items: OrderItem[];
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  notes?: string;
}

export interface CreateOrderResponse {
  order_id: string;
  eta: string;
  total_cents: number;
  status: string;
}

// Utwórz zamówienie przez backend API
export async function createOrder(orderData: CreateOrderRequest): Promise<CreateOrderResponse> {
  const body = JSON.stringify(orderData);
  const data = await api('/api/orders', { 
    method: 'POST', 
    body,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return data;
}

// Pobierz zamówienia użytkownika
export async function getUserOrders(userId?: string): Promise<any[]> {
  const url = userId ? `/api/orders?user_id=${userId}` : '/api/orders';
  const data = await api(url, { method: 'GET' });
  return data.orders || [];
}

// Pobierz restauracje
export async function getRestaurants(city?: string): Promise<any[]> {
  const url = city ? `/api/restaurants?city=${encodeURIComponent(city)}` : '/api/restaurants';
  const data = await api(url, { method: 'GET' });
  return data.restaurants || [];
}

// Pobierz menu restauracji
export async function getRestaurantMenu(restaurantId: string, dish?: string): Promise<any[]> {
  const url = dish 
    ? `/api/menu?restaurant_id=${restaurantId}&dish=${encodeURIComponent(dish)}`
    : `/api/menu?restaurant_id=${restaurantId}`;
  const data = await api(url, { method: 'GET' });
  return data.menu || [];
}