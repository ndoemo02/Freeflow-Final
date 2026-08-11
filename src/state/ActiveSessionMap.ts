/**
 * ActiveSessionMap — Level 2 Memory (Mid-term)
 *
 * Jedno źródło prawdy (Source of Truth) dla stanu sesji Live.
 * Przetrzymuje FullSessionSnapshot między cyklami życia komponentów,
 * przeżywa rekonnekty WebSocket, przejścia menu↔checkout i manualne
 * resety UI (clearHomeContext, resetSession).
 *
 * Kontrakt:
 * - Backend (ResponseBuilder + ActiveSessionMap w sessionStore) jest
 *   "Absolute Truth" — każda odpowiedź zawiera pełny cart + cartHash.
 * - Frontendowy ActiveSessionMap jest lustrem — NIGDY nie merguje,
 *   tylko nadpisuje stan tym co przyszło z backendu.
 * - cartHash służy do wykrywania desynchronizacji przed kolejnym
 *   tool callem — mismatch → force sync z backendu.
 */

export interface CartItemSnapshot {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface FullSessionSnapshot {
  sessionId: string;
  restaurantId: string | null;
  restaurantName: string | null;
  menuItems: any[];
  cartItems: CartItemSnapshot[];
  cartHash: string;
  lastUpdated: number;
  uiMode: 'list' | 'restaurant' | 'checkout';
  conversationPhase: string;
}

const CART_STATE_HASH_VERSION = 'cart-fnv1a-v1';

type CartHashItem = Partial<CartItemSnapshot> & {
  menu_item_id?: string;
  qty?: number | string;
  price_pln?: number | string;
  quantity?: number | string;
  price?: number | string;
};

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hashCartItems(items: CartHashItem[]): string {
  if (!items || items.length === 0) return 'empty';
  const normalized = items
    .map((i) => {
      const id = String(i.menu_item_id ?? i.id ?? '');
      const quantity = finiteNumber(i.quantity ?? i.qty, 1);
      const price = finiteNumber(i.price_pln ?? i.price, 0);
      return `${id}:${quantity}:${price}`;
    })
    .sort()
    .join('|');
  // Simple FNV-1a-like hash for consistency verification
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function extractCartItems(cart: any): CartItemSnapshot[] {
  if (!cart) return [];
  const items = Array.isArray(cart.items) ? cart.items : (Array.isArray(cart) ? cart : []);
  return items
    .filter((item: any) => item && (item.id || item.menu_item_id))
    .map((item: any) => ({
      id: String(item.id || item.menu_item_id || ''),
      name: String(item.name || ''),
      quantity: finiteNumber(item.quantity ?? item.qty, 1),
      price: finiteNumber(item.price_pln ?? item.price, 0),
    }));
}

function extractCurrentRestaurant(response: Record<string, unknown> | null): {
  id: string | null;
  name: string | null;
} {
  if (!response) return { id: null, name: null };
  const ctx = (response.context || response) as Record<string, any>;
  const cr = ctx?.currentRestaurant || ctx?.current_restaurant || response?.currentRestaurant || response?.restaurant;
  if (!cr) return { id: null, name: null };
  return {
    id: cr.id ? String(cr.id) : null,
    name: String(cr.display_name || cr.name || ''),
  };
}

// ─── Singleton ActiveSessionMap ────────────────────────────────────────────

class ActiveSessionMapStore {
  private map = new Map<string, FullSessionSnapshot>();

  /** Zapisz pełny snapshot sesji z odpowiedzi backendu */
  set(sessionId: string, snapshot: {
    sessionId?: string;
    restaurantId?: string | null;
    restaurantName?: string | null;
    menuItems?: any[];
    cartItems?: CartItemSnapshot[] | any;
    cartHash?: string;
    uiMode?: 'list' | 'restaurant' | 'checkout';
    conversationPhase?: string;
  }): void {
    const prev = this.map.get(sessionId);
    const cartItems = snapshot.cartItems
      ? (Array.isArray(snapshot.cartItems) ? snapshot.cartItems : extractCartItems(snapshot.cartItems))
      : (prev?.cartItems || []);
    const cartHash = snapshot.cartHash || hashCartItems(cartItems);

    this.map.set(sessionId, {
      sessionId: snapshot.sessionId || sessionId,
      restaurantId: snapshot.restaurantId ?? prev?.restaurantId ?? null,
      restaurantName: snapshot.restaurantName ?? prev?.restaurantName ?? null,
      menuItems: snapshot.menuItems ?? prev?.menuItems ?? [],
      cartItems,
      cartHash,
      lastUpdated: Date.now(),
      uiMode: snapshot.uiMode || prev?.uiMode || 'list',
      conversationPhase: snapshot.conversationPhase || prev?.conversationPhase || 'idle',
    });
  }

  /** Pobierz pełny snapshot */
  get(sessionId: string): FullSessionSnapshot | undefined {
    return this.map.get(sessionId);
  }

  /** Aktualizuj tylko cart (po tool callu) i przelicz hash */
  updateCart(sessionId: string, cart: any): FullSessionSnapshot | undefined {
    const prev = this.map.get(sessionId);
    if (!prev) return undefined;
    const cartItems = extractCartItems(cart);
    const cartHash = hashCartItems(cartItems);
    const updated: FullSessionSnapshot = {
      ...prev,
      cartItems,
      cartHash,
      lastUpdated: Date.now(),
    };
    this.map.set(sessionId, updated);
    return updated;
  }

  /** Aktualizuj z pełnej odpowiedzi backendu (response object) */
  updateFromResponse(sessionId: string, response: Record<string, unknown> | null, uiMode?: string, conversationPhase?: string): FullSessionSnapshot {
    const rawCart = (response as any)?.meta?.cart || (response as any)?.cart || null;
    const cartItems = extractCartItems(rawCart);
    const cartHash = (response as any)?.meta?.cartHash || (response as any)?.cartHash || hashCartItems(cartItems);
    const restaurant = extractCurrentRestaurant(response);
    const menuItems = (response as any)?.menu || (response as any)?.menuItems || (response as any)?.context?.menuItems || [];

    const snapshot: FullSessionSnapshot = {
      sessionId,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      menuItems: Array.isArray(menuItems) ? menuItems : [],
      cartItems,
      cartHash,
      lastUpdated: Date.now(),
      uiMode: (uiMode as FullSessionSnapshot['uiMode']) || 'list',
      conversationPhase: conversationPhase || 'idle',
    };
    this.map.set(sessionId, snapshot);
    return snapshot;
  }

  /** Sprawdź czy frontendowy cart zgadza się z backendowym hashem */
  verifyCartHash(sessionId: string, expectedHash: string): boolean {
    const snapshot = this.map.get(sessionId);
    if (!snapshot) return true; // no state yet — trust backend
    if (expectedHash === 'empty' && snapshot.cartItems.length === 0) return true;
    return snapshot.cartHash === expectedHash;
  }

  /** Pobierz cartHash */
  getCartHash(sessionId: string): string | undefined {
    return this.map.get(sessionId)?.cartHash;
  }

  /** Usuń sesję */
  delete(sessionId: string): void {
    this.map.delete(sessionId);
  }

  /** Debug: zrzut stanu */
  dump(sessionId: string): string {
    const s = this.map.get(sessionId);
    if (!s) return `ActiveSessionMap[${sessionId}]: EMPTY`;
    return `ActiveSessionMap[${sessionId}]: cart=[${s.cartItems.map(i => `${i.name}x${i.quantity}`).join(', ')}] hash=${s.cartHash} restaurant=${s.restaurantName || 'none'} uiMode=${s.uiMode}`;
  }
}

export const activeSessionMap = new ActiveSessionMapStore();

export { CART_STATE_HASH_VERSION, hashCartItems, extractCartItems };
