import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRef } from 'react';
import { recordLiveCartAudit, auditCartSnapshot } from '../lib/liveCartAudit';
import { useAuth } from './auth';
import { supabase, getAccessToken } from '../lib/supabase';
import { getApiUrl } from '../lib/config';
import { useToast } from '../components/Toast';
import { useConversationStore } from '../store/useConversationStore';
import { activeSessionMap } from '../state/ActiveSessionMap';
import { isCanonicalSessionId } from '../lib/sessionIdContract';
import { readCheckoutDraft, writeCheckoutDraft, removeCheckoutDraft, CHECKOUT_DRAFT_KEY } from '../lib/checkoutDraft';

const CartContext = createContext();

// Kontrakt B3: session_id musi pasowac do ^sess_[a-z0-9_]+$, dlugosc <=128
// (CHECK w orders.session_id i brain_sessions.id na nowej bazie). Oba klucze
// localStorage sprawdzane, ale zwracany jest wylacznie kanoniczny identyfikator
// — nie samo cokolwiek, co tam lezy.
function getCartSessionId() {
  if (typeof window === 'undefined') return null;
  const candidates = [
    window.localStorage.getItem('amber-session-id'),
    window.localStorage.getItem('brain_session_id'),
  ];
  return candidates.find(isCanonicalSessionId) || null;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

export function CartProvider({ children }) {
  const { user, isLoading = false } = useAuth();
  const { push } = useToast();
  const [cart, setCart] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submission = useRef(null);
  const draft = useRef(null);
  const owner = useRef(undefined);
  const blockedLiveSession = useRef(null);
  const inFlight = useRef(false);
  const [readyOwner, setReadyOwner] = useState(null);
  const [checkoutDelivery, setCheckoutDelivery] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);
  const [hasCheckoutDraft, setHasCheckoutDraft] = useState(false);
  const ownerId = user?.id || '';
  const liveSessionId = getCartSessionId();

  useEffect(() => {
    if (isLoading) return;
    const changedOwner = owner.current !== undefined && owner.current !== ownerId;
    owner.current = ownerId;
    setReadyOwner(ownerId);
    if (changedOwner || !ownerId) {
      removeCheckoutDraft();
      draft.current = null;
      submission.current = null;
      setHasCheckoutDraft(false);
      setCheckoutDelivery(null);
      setCheckoutError(null);
      setCart([]);
      setRestaurant(null);
      setIsOpen(false);
      for (const key of ['freeflow_cart', 'freeflow_cart_restaurant', 'freeflow_cart_session', 'freeflow_cart_owner']) localStorage.removeItem(key);
      if (changedOwner) {
        blockedLiveSession.current = getCartSessionId();
        useConversationStore.getState().resetSession?.();
      }
      return;
    }
    try {
      const savedDraft = readCheckoutDraft(ownerId);
      if (savedDraft) {
        draft.current = savedDraft;
        submission.current = savedDraft.submission || null;
        setCart(savedDraft.cart);
        setRestaurant(savedDraft.restaurant);
        setCheckoutDelivery(savedDraft.deliveryInfo || null);
        setHasCheckoutDraft(true);
        setIsOpen(true);
        return;
      }
    } catch (error) {
      setCheckoutError(error.message);
      setIsOpen(true);
      return;
    }
    // Fix #5.6: Wykryj nową sesję po refreshu strony.
    // CartContext persistuje w localStorage, ale backendowa sesja jest NOWA
    // (nowy sessionId). Stare dane koszyka z innej sesji powodują konflikt:
    // cart.length > backendItems.length → sync blokowany → restaurant=null → submit fail.
    const savedCart = localStorage.getItem('freeflow_cart');
    const savedRestaurant = localStorage.getItem('freeflow_cart_restaurant');
    const savedSessionId = localStorage.getItem('freeflow_cart_session');
    const currentSessionId = getCartSessionId();

    // Nowa sesja = inne sessionId niż przy ostatnim zapisie → wyczyść stare dane
    // Fix #6.1 Ghost Cart guard: store wyczyszczony → ignoruj localStorage
    let storeWasCleared = false;
    try {
      const storeState = useConversationStore.getState();
      storeWasCleared = storeState?.cart === null && (storeState?.cartSyncKey ?? 0) > 0;
    } catch (_) { /* store not initialized yet */ }
    if (storeWasCleared) {
      console.log('[CART_GHOST_GUARD] Store cart=null + cartSyncKey>0 — czyszcze localStorage');
      localStorage.removeItem('freeflow_cart');
      localStorage.removeItem('freeflow_cart_restaurant');
      localStorage.removeItem('freeflow_cart_session');
      return;
    }

    const isNewSession = localStorage.getItem('freeflow_cart_owner') !== ownerId
      || !savedSessionId || (currentSessionId && savedSessionId !== currentSessionId);

    if (isNewSession) {
      console.log('[CART_SESSION] Nowa sesja — czyszcze stary koszyk z localStorage');
      localStorage.removeItem('freeflow_cart');
      localStorage.removeItem('freeflow_cart_restaurant');
      if (currentSessionId) {
        localStorage.setItem('freeflow_cart_session', currentSessionId);
      }
      return; // nie ładuj starych danych
    }

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart from localStorage', e);
      }
    }

    if (savedRestaurant) {
      try {
        setRestaurant(JSON.parse(savedRestaurant));
      } catch (e) {
        console.error('Failed to parse restaurant from localStorage', e);
      }
    }
  }, [ownerId, isLoading]);

  useEffect(() => useConversationStore.subscribe?.((state, previous) => {
    if (state.sessionId === previous.sessionId || draft.current) return;
    blockedLiveSession.current = previous.sessionId;
    setCart([]);
    setRestaurant(null);
    setIsOpen(false);
    submission.current = null;
    for (const key of ['freeflow_cart', 'freeflow_cart_restaurant', 'freeflow_cart_session', 'freeflow_cart_owner']) localStorage.removeItem(key);
  }), []);

  useEffect(() => {
    if (isLoading || !ownerId || readyOwner !== ownerId || draft.current) return;
    if (cart.length > 0) {
      localStorage.setItem('freeflow_cart_owner', ownerId);
      localStorage.setItem('freeflow_cart', JSON.stringify(cart));
      const sid = getCartSessionId();
      if (sid) localStorage.setItem('freeflow_cart_session', sid);
    } else {
      localStorage.removeItem('freeflow_cart');
    }
  }, [cart, ownerId, readyOwner, isLoading]);

  useEffect(() => {
    if (isLoading || !ownerId || readyOwner !== ownerId || draft.current) return;
    if (restaurant) {
      localStorage.setItem('freeflow_cart_restaurant', JSON.stringify(restaurant));
    } else {
      localStorage.removeItem('freeflow_cart_restaurant');
    }
  }, [restaurant, ownerId, readyOwner, isLoading]);

  useEffect(() => {
    if (!draft.current || !cart.length || isLoading || readyOwner !== ownerId || draft.current.ownerId !== ownerId) return;
    const next = { ...draft.current, cart, restaurant, deliveryInfo: checkoutDelivery };
    try {
      writeCheckoutDraft(next);
      draft.current = next;
    } catch (_) {
      setCheckoutError('Nie można zapisać checkoutu. Sprawdź dostępność pamięci przeglądarki.');
    }
  }, [cart, restaurant, checkoutDelivery, ownerId, readyOwner, isLoading]);

  const beginCheckout = () => {
    if (draft.current) return true;
    if (isLoading || !ownerId || owner.current !== ownerId || readyOwner !== ownerId || !cart.length || !restaurant || checkoutError) return false;
    const next = { version: 1, id: crypto.randomUUID(), ownerId, cart, restaurant,
      deliveryInfo: checkoutDelivery, submission: submission.current };
    try {
      writeCheckoutDraft(next);
      draft.current = next;
      setHasCheckoutDraft(true);
      for (const key of ['freeflow_cart', 'freeflow_cart_restaurant', 'freeflow_cart_session', 'freeflow_cart_owner']) localStorage.removeItem(key);
      return true;
    } catch (_) {
      setCheckoutError('Nie można zapisać checkoutu. Sprawdź dostępność pamięci przeglądarki.');
      return false;
    }
  };

  // Opening a populated cart is the manual handoff; mere SYNC_CART is not.
  useEffect(() => {
    recordLiveCartAudit(getCartSessionId(), 'ui_cart_committed', {
      cart: auditCartSnapshot(cart), drawer_open: isOpen, draft_active: !!draft.current,
    });
  }, [cart, isOpen, hasCheckoutDraft]);
  useEffect(() => { if (isOpen) beginCheckout(); }, [isOpen, cart, restaurant, readyOwner]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== CHECKOUT_DRAFT_KEY && event.key !== null) return;
      // Another tab changed/cleared this checkout. Do not resurrect an older copy.
      draft.current = null;
      submission.current = null;
      setCart([]);
      setRestaurant(null);
      setHasCheckoutDraft(false);
      setCheckoutDelivery(null);
      blockedLiveSession.current = getCartSessionId();
      setCheckoutError('Checkout zmienił się w innej karcie. Odśwież stronę przed kontynuowaniem.');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addToCart = (item, restaurantData) => {
    if (!ownerId || owner.current !== ownerId || readyOwner !== ownerId || isLoading || inFlight.current || checkoutError) return;
    blockedLiveSession.current = null;
    const replacingRestaurant = restaurant && restaurant.id !== restaurantData.id;
    if (replacingRestaurant) {
      const confirm = window.confirm(
        `Masz już pozycje z ${restaurant.name} w koszyku. Czy chcesz wyczyścić koszyk i dodać pozycję z ${restaurantData.name}?`
      );
      if (!confirm) return;

      setCart([]);
      setRestaurant(restaurantData);
    } else if (!restaurant) {
      setRestaurant(restaurantData);
    }

    const quantityToAdd = item.quantity || 1;
    const baseCart = replacingRestaurant ? [] : cart;
    const existingIndex = baseCart.findIndex(cartItem => cartItem.id === item.id);

    if (existingIndex >= 0) {
      const newCart = baseCart.map(entry => ({ ...entry }));
      newCart[existingIndex].quantity += quantityToAdd;
      setCart(newCart);
      console.log(`✅ Updated quantity for ${item.name}: +${quantityToAdd} (total: ${newCart[existingIndex].quantity})`);
      push(`Zwiększono ilość: ${item.name} (+${quantityToAdd})`, 'success');
    } else {
      setCart([...baseCart, { ...item, quantity: quantityToAdd }]);
      console.log(`✅ Added new item to cart: ${item.name} (quantity: ${quantityToAdd})`);
      push(`Dodano do koszyka: ${item.name} (${quantityToAdd}x)`, 'success');
    }

    console.log('Item added to cart', { item, restaurant: restaurantData, quantityAdded: quantityToAdd });
  };

  const removeFromCart = (itemId) => {
    if (inFlight.current) return;
    const newCart = cart.filter(item => item.id !== itemId);
    setCart(newCart);

    if (newCart.length === 0) {
      resetCartLocal({ clearRestaurant: true });
    }

    push('Usunięto z koszyka', 'info');
    console.log('Item removed from cart', { itemId });
  };

  const updateQuantity = (itemId, quantity) => {
    if (inFlight.current) return;
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const newCart = cart.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    );
    setCart(newCart);
    console.log('Cart quantity updated', { itemId, quantity });
  };

  const resetCartLocal = (options = {}) => {
    const { clearRestaurant = false, closeDrawer = false, silent = false, source = 'manual' } = options;
    if (source === 'live' && (draft.current || checkoutError || isLoading || readyOwner !== ownerId || owner.current !== ownerId)) return;
    removeCheckoutDraft();
    draft.current = null;
    setHasCheckoutDraft(false);
    setCheckoutDelivery(null);
    setCheckoutError(null);
    blockedLiveSession.current = getCartSessionId();
    submission.current = null;

    setCart([]);
    if (clearRestaurant) {
      setRestaurant(null);
    }
    if (closeDrawer) {
      setIsOpen(false);
    }

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('freeflow_cart');
      if (clearRestaurant) {
        window.localStorage.removeItem('freeflow_cart_restaurant');
      }
      window.localStorage.removeItem('freeflow_cart_session');

      // Fix #6.1: Clear ActiveSessionMap so no stale data survives.
      const sid = getCartSessionId();
      if (sid) {
        activeSessionMap.delete(sid);
        console.log('[CART_RESET] ActiveSessionMap cleared for session', sid.slice(0, 8));
      }
    }

    if (!silent) {
      console.log('Cart reset locally', { clearRestaurant, closeDrawer });
    }
  };

  const clearCart = async (options = {}) => {
    const { syncBackend = true, clearRestaurant = false, closeDrawer = false, silent = false } = options;

    resetCartLocal({ clearRestaurant, closeDrawer, silent: true });

    if (syncBackend && typeof window !== 'undefined') {
      const sessionId = getCartSessionId();
      if (sessionId) {
        fetch(getApiUrl('/api/brain/v2'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            input: 'wyczyść koszyk',
            text: 'wyczyść koszyk',
            includeTTS: false,
            meta: { channel: 'web' }
          })
        }).catch(err => console.error('Failed to notify backend of clearCart', err));
      }
    }

    if (!silent) {
      push('Koszyk wyczyszczony', 'info');
      console.log('Cart cleared', { syncBackend, clearRestaurant, closeDrawer });
    }
  };

  const syncCart = (backendItems, restaurantData) => {
    recordLiveCartAudit(getCartSessionId(), 'cart_sync_attempt', {
      incoming: auditCartSnapshot(backendItems), visible: auditCartSnapshot(cart),
      draft_active: !!draft.current, checkout_error: !!checkoutError, auth_loading: !!isLoading,
      owner_ready: !!ownerId && readyOwner === ownerId && owner.current === ownerId,
      session_matches: liveSessionId === getCartSessionId(),
      session_blocked: !!blockedLiveSession.current && blockedLiveSession.current === getCartSessionId(),
    });
    if (draft.current || checkoutError || isLoading || !ownerId || readyOwner !== ownerId
      || liveSessionId !== getCartSessionId() || owner.current !== ownerId
      || (blockedLiveSession.current && blockedLiveSession.current === getCartSessionId())) return;
    console.log('🛒 Syncing cart from Backend:', backendItems, restaurantData);
    if (!backendItems || !Array.isArray(backendItems)) return;

    const mappedItems = backendItems.map(item => ({
      id: item.id || item.menu_item_id,
      name: item.name,
      price: Number(item.price_pln ?? item.price ?? 0),
      quantity: Number(item.qty ?? item.quantity ?? 1),
      item_tags: Array.isArray(item.item_tags) ? item.item_tags : [],
      category: item.category || null,
      restaurant_id: item.restaurant_id || null,
      restaurant_name: item.restaurant_name || null,
      special_instructions: item.special_instructions || null,
    }));

    setCart(mappedItems);

    if (restaurantData) {
      const rData = typeof restaurantData === 'string' ? { name: restaurantData, id: 'unknown-sync' } : restaurantData;
      if (!(restaurant && restaurant.name === rData.name)) {
        setRestaurant(rData);
      }
    }
  };

  const total = cart.reduce((sum, item) => sum + ((item.price ?? item.price_pln ?? 0) * (item.quantity ?? item.qty ?? 1)), 0);

  const isValidUUID = (id) => {
    if (!id || typeof id !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const resolveRestaurantId = async () => {
    let finalRestaurantId = restaurant?.id;
    const needsLookup = !finalRestaurantId || finalRestaurantId === 'unknown-sync' || !isValidUUID(finalRestaurantId);

    if (!needsLookup) return finalRestaurantId;

    const searchName = (restaurant?.name || '').trim();
    console.log(`[CART_RESTAURANT_RESOLVE] resolving by name="${searchName}"`);

    if (!searchName) {
      throw new Error('Brak nazwy restauracji w koszyku. Proszę dodać produkty ponownie.');
    }

    let { data: restData, error: restErr } = await supabase
      .from('restaurants')
      .select('id, name')
      .ilike('name', searchName)
      .limit(1)
      .maybeSingle();

    if (!restData?.id) {
      const partialResult = await supabase
        .from('restaurants')
        .select('id, name')
        .ilike('name', `%${searchName}%`)
        .limit(1)
        .maybeSingle();
      restData = partialResult.data;
      restErr = partialResult.error;
    }

    if (!restData?.id) {
      // Stage10: `aliases` is backend-only (never granted to anon/authenticated) —
      // this fallback goes through the backend resolver instead of a direct
      // Supabase select on restaurants.aliases.
      try {
        const resolveRes = await fetch(getApiUrl(`/api/restaurants/resolve?name=${encodeURIComponent(searchName)}`));
        const resolveJson = await resolveRes.json().catch(() => null);
        if (resolveRes.ok && resolveJson?.ok && resolveJson.data?.id) {
          restData = resolveJson.data;
        }
      } catch (err) {
        console.error('[CART_RESTAURANT_RESOLVE] resolve endpoint error:', err);
      }
    }

    if (!restData?.id) {
      console.error('[CART_RESTAURANT_RESOLVE] failed', restErr);
      throw new Error(`Nie można znaleźć restauracji "${searchName}" w bazie. Spróbuj wybrać restaurację ponownie.`);
    }

    finalRestaurantId = restData.id;
    if (owner.current !== ownerId) throw new Error('Użytkownik zmienił się podczas przygotowania zamówienia.');
    setRestaurant((prev) => ({ ...prev, id: finalRestaurantId, name: restData.name }));
    console.log(`[CART_RESTAURANT_RESOLVE] success id=${finalRestaurantId} name="${restData.name}"`);
    return finalRestaurantId;
  };

  const buildOrderData = (deliveryInfo, restaurantId, status = 'pending') => ({
    user_id: user?.id || null,
    restaurant_id: restaurantId,
    items: cart.map((item) => ({
      menu_item_id: item.id,
      name: item.name,
      unit_price_cents: Math.round(Number(item.price || 0) * 100),
      qty: Number(item.quantity || 1),
      special_instructions: item.special_instructions || null,
    })),
    total_price: total,
    total_cents: Math.round(total * 100),
    status,
    customer_name: deliveryInfo.name || user?.user_metadata?.first_name || user?.email || 'Guest',
    customer_phone: deliveryInfo.phone || user?.user_metadata?.phone || '',
    delivery_address: deliveryInfo.address || user?.user_metadata?.address || '',
    notes: deliveryInfo.notes || '',
  });

  const submitOrder = async (deliveryInfo) => {
    console.log('🛒 submitOrder called with user:', user);

    if (!user) {
      push('Musisz być zalogowany, aby złożyć zamówienie', 'error');
      return false;
    }
    if (inFlight.current || isLoading || readyOwner !== ownerId || checkoutError) return false;

    if (cart.length === 0) {
      push('Koszyk jest pusty', 'error');
      return false;
    }

    if (!restaurant) {
      push('Nie wybrano restauracji', 'error');
      return false;
    }

    if (!beginCheckout()) return false;
    const attemptDraftId = draft.current.id;
    inFlight.current = true;
    setIsSubmitting(true);

    try {
      const finalRestaurantId = await resolveRestaurantId();
      if (owner.current !== ownerId || draft.current?.id !== attemptDraftId) return false;
      const orderData = buildOrderData(deliveryInfo, finalRestaurantId);
      const apiUrl = getApiUrl('/api/orders');
      console.log('🛒 Submitting order to:', apiUrl);

      const accessToken = await getAccessToken(ownerId);
      if (!accessToken) throw new Error('Zaloguj się ponownie, aby złożyć zamówienie.');
      if (owner.current !== ownerId || draft.current?.id !== attemptDraftId) return false;

      // Keep the attempt across failed requests; changed order data starts a new one.
      // The backend owns created_at, so elapsed time must not change this body.
      const body = JSON.stringify(orderData);
      if (!submission.current || submission.current.body !== body) {
        submission.current = { body, key: crypto.randomUUID() };
      }
      const savedAttempt = { ...draft.current, deliveryInfo, submission: submission.current };
      writeCheckoutDraft(savedAttempt);
      draft.current = savedAttempt;
      setCheckoutDelivery(deliveryInfo);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'Idempotency-Key': submission.current.key },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (owner.current !== ownerId || draft.current?.id !== attemptDraftId) return false;
      push('Zamówienie złożone pomyślnie! 🎉', 'success');
      resetCartLocal({ clearRestaurant: true, closeDrawer: true, silent: true });
      return data;
    } catch (error) {
      console.error('❌ Failed to submit order:', error.message, error);
      push(`Błąd: ${error.message}`, 'error');
      return false;
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const canViewCart = !isLoading && !!ownerId && readyOwner === ownerId;
  const value = {
    cart: canViewCart ? cart : [],
    restaurant: canViewCart ? restaurant : null,
    total: canViewCart ? total : 0,
    isOpen: canViewCart && isOpen,
    isSubmitting,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    resetCartLocal,
    syncCart,
    submitOrder,
    setIsOpen,
    setLiveIsOpen: (open) => { if (!draft.current) setIsOpen(open); },
    beginCheckout,
    hasCheckoutDraft: canViewCart && hasCheckoutDraft,
    checkoutDelivery: canViewCart ? checkoutDelivery : null,
    setCheckoutDelivery: (value) => { if (!inFlight.current && owner.current === ownerId) setCheckoutDelivery(value); },
    checkoutError: canViewCart ? checkoutError : null,
    itemCount: canViewCart ? cart.reduce((sum, item) => sum + Number(item.quantity || item.qty || 1), 0) : 0
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}


