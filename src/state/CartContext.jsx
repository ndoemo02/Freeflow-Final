import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/config';
import { useToast } from '../components/Toast';
import { useConversationStore } from '../store/useConversationStore';
import { activeSessionMap } from '../state/ActiveSessionMap';

const CartContext = createContext();

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { push } = useToast();
  const [cart, setCart] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fix #5.6: Wykryj nową sesję po refreshu strony.
    // CartContext persistuje w localStorage, ale backendowa sesja jest NOWA
    // (nowy sessionId). Stare dane koszyka z innej sesji powodują konflikt:
    // cart.length > backendItems.length → sync blokowany → restaurant=null → submit fail.
    const savedCart = localStorage.getItem('freeflow_cart');
    const savedRestaurant = localStorage.getItem('freeflow_cart_restaurant');
    const savedSessionId = localStorage.getItem('freeflow_cart_session');
    const currentSessionId = localStorage.getItem('amber-session-id') || localStorage.getItem('brain_session_id');

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

    const isNewSession = !savedSessionId || (currentSessionId && savedSessionId !== currentSessionId);

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
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('freeflow_cart', JSON.stringify(cart));
      const sid = localStorage.getItem('amber-session-id') || localStorage.getItem('brain_session_id');
      if (sid) localStorage.setItem('freeflow_cart_session', sid);
    } else {
      localStorage.removeItem('freeflow_cart');
    }
  }, [cart]);

  useEffect(() => {
    if (restaurant) {
      localStorage.setItem('freeflow_cart_restaurant', JSON.stringify(restaurant));
    } else {
      localStorage.removeItem('freeflow_cart_restaurant');
    }
  }, [restaurant]);

  const addToCart = (item, restaurantData) => {
    if (restaurant && restaurant.id !== restaurantData.id) {
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
    const existingIndex = cart.findIndex(cartItem => cartItem.id === item.id);

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += quantityToAdd;
      setCart(newCart);
      console.log(`✅ Updated quantity for ${item.name}: +${quantityToAdd} (total: ${newCart[existingIndex].quantity})`);
      push(`Zwiększono ilość: ${item.name} (+${quantityToAdd})`, 'success');
    } else {
      setCart([...cart, { ...item, quantity: quantityToAdd }]);
      console.log(`✅ Added new item to cart: ${item.name} (quantity: ${quantityToAdd})`);
      push(`Dodano do koszyka: ${item.name} (${quantityToAdd}x)`, 'success');
    }

    console.log('Item added to cart', { item, restaurant: restaurantData, quantityAdded: quantityToAdd });
  };

  const removeFromCart = (itemId) => {
    const newCart = cart.filter(item => item.id !== itemId);
    setCart(newCart);

    if (newCart.length === 0) {
      setRestaurant(null);
    }

    push('Usunięto z koszyka', 'info');
    console.log('Item removed from cart', { itemId });
  };

  const updateQuantity = (itemId, quantity) => {
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
    const { clearRestaurant = false, closeDrawer = false, silent = false } = options;

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
      const sid = window.localStorage.getItem('amber-session-id') || window.localStorage.getItem('brain_session_id');
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
      const sessionId = window.localStorage.getItem('amber-session-id') || window.localStorage.getItem('brain_session_id');
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
    setRestaurant((prev) => ({ ...prev, id: finalRestaurantId, name: restData.name }));
    console.log(`[CART_RESTAURANT_RESOLVE] success id=${finalRestaurantId} name="${restData.name}"`);
    return finalRestaurantId;
  };

  const buildOrderData = (deliveryInfo, restaurantId, status = 'pending') => ({
    user_id: user?.id || null,
    restaurant_id: restaurantId,
    restaurant_name: restaurant?.name || 'Unknown Restaurant',
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
    created_at: new Date().toISOString(),
  });

  const submitOrder = async (deliveryInfo) => {
    console.log('🛒 submitOrder called with user:', user);

    if (!user) {
      push('Musisz być zalogowany, aby złożyć zamówienie', 'error');
      return false;
    }

    if (cart.length === 0) {
      push('Koszyk jest pusty', 'error');
      return false;
    }

    if (!restaurant) {
      push('Nie wybrano restauracji', 'error');
      return false;
    }

    setIsSubmitting(true);

    try {
      const finalRestaurantId = await resolveRestaurantId();
      const orderData = buildOrderData(deliveryInfo, finalRestaurantId);
      const apiUrl = getApiUrl('/api/orders');
      console.log('🛒 Submitting order to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
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
      push('Zamówienie złożone pomyślnie! 🎉', 'success');
      resetCartLocal({ clearRestaurant: true, closeDrawer: true, silent: true });
      return data;
    } catch (error) {
      console.error('❌ Failed to submit order:', error.message, error);
      push(`Błąd: ${error.message}`, 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const value = {
    cart,
    restaurant,
    total,
    isOpen,
    isSubmitting,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    resetCartLocal,
    syncCart,
    submitOrder,
    setIsOpen,
    itemCount: cart.reduce((sum, item) => sum + Number(item.quantity || item.qty || 1), 0)
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}


