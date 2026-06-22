import React, { useState, Fragment, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/auth';
import { useConversationStore } from '../store/useConversationStore';
import { activeSessionMap } from '../state/ActiveSessionMap';
import { ROUTES } from '../app/routeConfig';
import { normalizeMenuItems } from '../lib/normalizeData';

function cartItemBadges(rawItem) {
    const badges = [];
    if (rawItem?.is_vege) badges.push('🌿 Vege');
    if (rawItem?.spicy) badges.push('Pikantne');
    const tags = Array.isArray(rawItem?.item_tags) ? rawItem.item_tags : [];
    for (const tag of tags) {
        const t = String(tag || '').trim().toLowerCase();
        if ((t === 'vege' || t === 'wege') && !badges.some((b) => b.includes('Vege'))) badges.push('🌿 Vege');
        else if (t === 'spicy' && !badges.some((b) => b === 'Pikantne')) badges.push('Pikantne');
        else if (t === 'gluten_free' && !badges.some((b) => b.includes('glutenu'))) badges.push('🚫🌾');
        else if (t === 'vegan' && !badges.some((b) => b.includes('Vegan'))) badges.push('🌱');
        else if (t === 'lactose_free' && !badges.some((b) => b.includes('laktozy'))) badges.push('🥛✕');
        else if (t === 'halal' && !badges.some((b) => b.includes('Halal'))) badges.push('☪️');
    }
    return badges;
}

function formatCartPrice(value) {
    const amount = Number(value || 0);
    return `${amount.toFixed(2)} zł`;
}

export default function Cart() {
  const { cart, restaurant: activeRestaurant, total, isOpen, isSubmitting, removeFromCart, updateQuantity, clearCart, submitOrder, setIsOpen, syncCart } = useCart();

  const restaurantLabel = activeRestaurant
    ? (typeof activeRestaurant === 'object'
      ? (typeof activeRestaurant.name === 'string' ? activeRestaurant.name : JSON.stringify(activeRestaurant.name ?? activeRestaurant))
      : String(activeRestaurant))
    : null;

  const navigate = useNavigate();
  const { user } = useAuth();

  const closeButtonRef = useRef(null);

  const profileDefaults = useMemo(() => {
    const metadata = user?.user_metadata || {};
    const firstName = String(metadata?.first_name || '').trim();
    const lastName = String(metadata?.last_name || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const phone = String(metadata?.phone || '').trim();
    const addressLine = String(metadata?.address || '').trim();
    const postalCode = String(metadata?.postal_code || '').trim();
    const city = String(metadata?.city || '').trim();
    const locality = [postalCode, city].filter(Boolean).join(' ').trim();
    const address = [addressLine, locality].filter(Boolean).join(', ').trim();

    return {
      name: fullName,
      phone,
      address,
    };
  }, [user?.user_metadata]);

  const [deliveryInfo, setDeliveryInfo] = useState({
    name: profileDefaults.name || '',
    phone: profileDefaults.phone || '',
    address: profileDefaults.address || '',
    notes: ''
  });
  const [deliveryTouched, setDeliveryTouched] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);

  React.useEffect(() => {
    const hasUserDefaults = !!(profileDefaults.name || profileDefaults.phone || profileDefaults.address);
    if (!hasUserDefaults) return;

    setDeliveryInfo((prev) => {
      if (deliveryTouched) return prev;
      const shouldHydrate = !prev.name && !prev.phone && !prev.address;
      if (!shouldHydrate) return prev;
      return {
        ...prev,
        name: profileDefaults.name,
        phone: profileDefaults.phone,
        address: profileDefaults.address,
      };
    });
  }, [profileDefaults, deliveryTouched]);

  const handleUpdateQuantity = (id, newQty) => {
    updateQuantity(id, newQty);
  };

  const handleRemoveFromCart = (id) => {
    removeFromCart(id);
  };

  const handleClearCart = () => {
    clearCart({ syncBackend: true, clearRestaurant: true, closeDrawer: false, silent: false });
    const state = useConversationStore.getState();
    const emptyStoreCart = Array.isArray(state.cart)
      ? []
      : { ...(state.cart || {}), items: [] };
    const clearedPendingOrder = state.pendingOrder
      ? { ...state.pendingOrder, items: [], total: 0 }
      : null;
    useConversationStore.setState((prev) => ({
      cart: emptyStoreCart,
      cartSyncKey: prev.cartSyncKey + 1,
      pendingOrder: clearedPendingOrder,
    }));
    // Fix #6.1: Clear ActiveSessionMap so no stale data survives.
    if (state.sessionId) {
      activeSessionMap.delete(state.sessionId);
    }
    setIsOpen(false);
    if (phase === 'checkout' || uiMode === 'checkout') {
      restoreUiModeAfterClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deliveryConfirmed) {
      alert('Potwierdź dane dostawy przed złożeniem zamówienia.');
      return;
    }
    const result = await submitOrder(deliveryInfo);
    if (result) {
      // Order submitted successfully
      useConversationStore.getState().handleOrderSuccess();
      setDeliveryInfo({
        name: profileDefaults.name || '',
        phone: profileDefaults.phone || '',
        address: profileDefaults.address || '',
        notes: ''
      });
      setDeliveryTouched(false);
      setDeliveryConfirmed(false);
      // Przejdz do panelu klienta
      navigate(ROUTES.PANEL_CLIENT);
    }
  };

  const phase = useConversationStore(state => state.conversationPhase);
  const uiMode = useConversationStore(state => state.uiMode);
  const storeCart = useConversationStore(state => state.cart);
  const storeCartSyncKey = useConversationStore(state => state.cartSyncKey);
  const pendingOrder = useConversationStore(state => state.pendingOrder);
  const currentRestaurant = useConversationStore(state => state.currentRestaurant);

  // Fix #5.7: cartSyncKey to monotonically increasing counter bumped on every
  // store cart mutation (both WS and HTTP paths). Using a ref to track the last
  // synced key bypasses ALL React timing/batching edge cases — no length
  // comparison heuristic can fool it.
  const lastSyncedCartKeyRef = useRef(0);

  // Zabezpieczenie przed "wiszacym" koszykiem - jesli uzytkownik w 'checkout' zamknie koszyk z palca, nie otwieraj go
  const [closedInCheckout, setClosedInCheckout] = useState(false);

  // Kiedy faza sie zmienia na nowa (np. wejdziemy w checkout), resetujemy te blokade
  React.useEffect(() => {
    if (phase !== 'checkout') {
      setClosedInCheckout(false);
    }
  }, [phase]);

  const isCartVisible = isOpen || (phase === 'checkout' && !closedInCheckout);

  // Fix #5.7: Sync store cart → local CartContext.
  // Uses cartSyncKey (monotonic counter) as the primary trigger.
  // When cartSyncKey advances, we know the store cart was mutated by a tool
  // result (WS or HTTP). Force sync regardless of length — backend is truth.
  //
  // The length guard (cart.length > backendItems.length) still serves as a
  // secondary safety net for edge cases where the user manually added items
  // that haven't reached the backend yet. But cartSyncKey always wins.
  React.useEffect(() => {
    if (typeof syncCart !== 'function') return;

    const backendItems = Array.isArray(storeCart?.items)
      ? storeCart.items
      : (Array.isArray(storeCart) ? storeCart : []);

    const localCount = cart.length;
    const backendCount = backendItems.length;
    const syncKeyAdvanced = storeCartSyncKey > lastSyncedCartKeyRef.current;
    const localHasMore = localCount > backendCount;

    console.log(
      `[LIVE_CART_DEBUG] sync effect — local=${localCount} backend=${backendCount} ` +
      `syncKey=${storeCartSyncKey} lastSyncedKey=${lastSyncedCartKeyRef.current} ` +
      `keyAdvanced=${syncKeyAdvanced} localHasMore=${localHasMore} ` +
      `backendEmpty=${backendCount === 0}`,
    );

    if (backendCount === 0 && !syncKeyAdvanced) {
      console.log(`[LIVE_CART_DEBUG] skip: backend empty, key not advanced`);
      return;
    }

    // When cartSyncKey advanced: backend explicitly mutated the cart — force sync.
    // When key did NOT advance: only skip if local has strictly MORE items
    // (user added manually, not yet in backend).
    if (!syncKeyAdvanced && localHasMore) {
      console.log(`[LIVE_CART_DEBUG] skip: localHasMore without key advance`);
      return;
    }

    console.log(`[LIVE_CART_DEBUG] syncing... trigger=${syncKeyAdvanced ? 'key' : 'items'}`);

    const restaurantFromPendingOrder = pendingOrder?.restaurant
      ? {
          name: pendingOrder.restaurant,
          id: pendingOrder.restaurant_id || 'unknown-sync',
        }
      : null;

    const currentRestaurantFromStore = currentRestaurant?.id || currentRestaurant?.name
      ? {
          id: String(currentRestaurant.id || currentRestaurant.restaurant_id || ''),
          name: String(currentRestaurant.display_name || currentRestaurant.name || currentRestaurant.restaurant_name || ''),
        }
      : null;

    const firstCartItemWithRestaurant = backendItems.find(
      (item) => item?.restaurant_id && item?.restaurant_name,
    );
    const restaurantFromCartItems = firstCartItemWithRestaurant
      ? { id: String(firstCartItemWithRestaurant.restaurant_id), name: String(firstCartItemWithRestaurant.restaurant_name) }
      : null;

    const restaurantData =
      storeCart?.restaurant
      || pendingOrder?.restaurant_details
      || restaurantFromPendingOrder
      || currentRestaurantFromStore
      || activeRestaurant
      || restaurantFromCartItems
      || null;

    console.log(`[LIVE_CART_DEBUG] restaurantData=${JSON.stringify(restaurantData?.name || restaurantData)}`);
    console.log(`[LIVE_CART_DEBUG] backendItems preview=${JSON.stringify(backendItems.slice(0, 5).map((i) => ({id: i.id, name: i.name, qty: i.qty || i.quantity})))}`);

    syncCart(backendItems, restaurantData);
    lastSyncedCartKeyRef.current = storeCartSyncKey;
    console.log(`[LIVE_CART_DEBUG] sync done — lastSyncedKey now=${storeCartSyncKey}`);
  }, [cart.length, storeCart, storeCartSyncKey, pendingOrder, currentRestaurant, activeRestaurant, syncCart]);

  React.useEffect(() => {
    if (phase !== 'checkout' && uiMode !== 'checkout') return;
    const renderedCartItems = cart.map((item, index) => ({
      id: String(item?.id ?? index),
      name: String(item?.name ?? ''),
      qty: Number(item?.quantity ?? item?.qty ?? 1),
    }));
    console.log(`[LIVE_CART] checkoutVisible=${String(isCartVisible)}`);
    console.log(`[LIVE_CART] renderedCartItems=${JSON.stringify(renderedCartItems)}`);
  }, [phase, uiMode, isCartVisible, cart]);

  const restoreUiModeAfterClose = React.useCallback(() => {
    const state = useConversationStore.getState();
    const suggestedRestaurants = Array.isArray(state.suggestedRestaurants) ? state.suggestedRestaurants : [];
    const currentRestaurantSnapshot = state.currentRestaurant || currentRestaurant || null;
    const context = state.lastContext || state.lastFullResponse?.context || null;

    const lastMenuRaw =
      state.menuItems
      || context?.last_menu
      || state.lastFullResponse?.menuItems
      || state.lastFullResponse?.menu
      || null;
    const restoredMenuItems = normalizeMenuItems(lastMenuRaw) || [];

    const lastMenuRestaurantId =
      context?.last_menu_restaurant_id
      || state.lastFullResponse?.context?.last_menu_restaurant_id
      || null;

    const restoredRestaurant = currentRestaurantSnapshot || (
      lastMenuRestaurantId
        ? (suggestedRestaurants.find((item) => String(item?.id) === String(lastMenuRestaurantId)) || null)
        : null
    );

    let restoredMode = 'list';
    const restorePatch = {};

    if (restoredRestaurant && restoredMenuItems.length > 0) {
      restoredMode = 'restaurant';
      restorePatch.currentRestaurant = restoredRestaurant;
      restorePatch.menuItems = restoredMenuItems;
    } else if (suggestedRestaurants.length > 0) {
      restoredMode = 'list';
    } else if (restoredRestaurant) {
      restoredMode = 'restaurant';
      restorePatch.currentRestaurant = restoredRestaurant;
    }

    const restaurantLog = restoredRestaurant
      ? JSON.stringify({
          id: restoredRestaurant?.id ?? null,
          name: restoredRestaurant?.name ?? null,
        })
      : 'null';

    console.log(`[CART_RETURN] restoring uiMode=${restoredMode}`);
    console.log(`[CART_RETURN] restoringMenuItems=${restoredMenuItems.length}`);
    console.log(`[CART_RETURN] restoringRestaurant=${restaurantLog}`);
    console.log(`[CART_RETURN] restoringListCount=${suggestedRestaurants.length}`);

    useConversationStore.setState({
      uiMode: restoredMode,
      ...restorePatch,
    });
  }, [currentRestaurant]);

  const handleClose = () => {
    setIsOpen(false);
    if (phase === 'checkout') {
      setClosedInCheckout(true);
    }
    if (phase === 'checkout' || uiMode === 'checkout') {
      restoreUiModeAfterClose();
    }
  };

  return (
    <Transition appear show={isCartVisible} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose} initialFocus={closeButtonRef}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl border border-amber-500/15 bg-[#0c0f14]/95 backdrop-blur-xl shadow-[0_0_50px_rgba(255,122,28,0.10)] transition-all">
                {/* Header */}
                <div className="border-b border-white/10 p-6">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-2xl font-bold text-white flex items-center gap-2">
                      <i className="fas fa-shopping-cart text-white/90" />
                      Koszyk
                      {cart.length > 0 && (
                        <span className="text-sm font-normal text-slate-400">
                          ({cart.reduce((sum, item) => sum + Number(item.quantity || item.qty || 1), 0)} pozycji)
                        </span>
                      )}
                    </Dialog.Title>
                    <button
                      ref={closeButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClose();
                      }}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                  {restaurantLabel && (
                    <p className="text-sm text-slate-400 mt-2">
                      <i className="fas fa-store mr-2" />
                      {restaurantLabel}
                    </p>
                  )}
                </div>

                {/* Cart Items */}
                <div className="p-6 max-h-[400px] overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4"><i className="fas fa-shopping-cart" /></div>
                      <p className="text-slate-400 text-lg">Koszyk jest pusty</p>
                      <p className="text-slate-500 text-sm mt-2">Dodaj pozycje z menu restauracji</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {cart.map((rawItem, index) => {
                          const item = {
                            id: (rawItem?.id ?? String(index)).toString(),
                            name: typeof rawItem?.name === 'object' ? JSON.stringify(rawItem.name) : (rawItem?.name ?? 'pozycja'),
                            price: Number(rawItem?.price ?? rawItem?.price_pln ?? 0),
                            quantity: Number(rawItem?.quantity ?? rawItem?.qty ?? 1)
                          };
                          const badges = cartItemBadges(rawItem);
                          return (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.05 }}
                              className="rounded-xl border border-white/8 bg-black/40 p-4 backdrop-blur-xl"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3
                                      className="text-white font-semibold max-w-[300px] sm:max-w-[420px] leading-snug break-words overflow-hidden"
                                      style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                      }}
                                      title={item.name}
                                    >
                                      {item.name}
                                    </h3>
                                    {badges.map((badge, bi) => (
                                      <span key={bi} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/8 border border-white/10 text-white/70 leading-none shrink-0">
                                        {badge}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-sm text-slate-400">{formatCartPrice(item.price)}</p>
                                </div>

                                {/* Right side: quantity + price + delete */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  {/* Quantity Controls */}
                                  <div className="flex items-center gap-1 bg-black/40 rounded-lg px-2 py-1">
                                    <button
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                      className="text-slate-400 hover:text-white transition-colors w-6 h-6 flex items-center justify-center"
                                    >
                                      -
                                    </button>
                                    <span className="text-white font-semibold w-6 text-center text-sm">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                      className="text-slate-400 hover:text-white transition-colors w-6 h-6 flex items-center justify-center"
                                    >
                                      +
                                    </button>
                                  </div>

                                  {/* Price + Delete grouped together */}
                                  <div className="flex items-center gap-2">
                                    <div className="text-white font-bold min-w-[70px] text-right text-sm">
                                      {formatCartPrice(Number(item.price) * Number(item.quantity))}
                                    </div>
                                    <button
                                      onClick={() => handleRemoveFromCart(item.id)}
                                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                                      aria-label="Usuń z koszyka"
                                    >
                                      <i className="fas fa-trash-alt" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Delivery Form & Total */}
                {cart.length > 0 && (
                  <form onSubmit={handleSubmit} className="border-t border-white/10 p-6 space-y-4">
                    {/* Delivery Info */}
                    <div className="space-y-3">
                      <h3 className="text-white font-semibold mb-3">Dane dostawy</h3>

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Imię i nazwisko"
                          value={deliveryInfo.name}
                          onChange={(e) => {
                            setDeliveryTouched(true);
                            setDeliveryConfirmed(false);
                            setDeliveryInfo({ ...deliveryInfo, name: e.target.value });
                          }}
                          required
                          className="rounded-lg bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                        />
                        <input
                          type="tel"
                          placeholder="Telefon"
                          value={deliveryInfo.phone}
                          onChange={(e) => {
                            setDeliveryTouched(true);
                            setDeliveryConfirmed(false);
                            setDeliveryInfo({ ...deliveryInfo, phone: e.target.value });
                          }}
                          required
                          className="rounded-lg bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                        />
                      </div>

                      <input
                        type="text"
                        placeholder="Adres dostawy"
                        value={deliveryInfo.address}
                        onChange={(e) => {
                          setDeliveryTouched(true);
                          setDeliveryConfirmed(false);
                          setDeliveryInfo({ ...deliveryInfo, address: e.target.value });
                        }}
                        required
                        className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                      />

                      <textarea
                        placeholder="Uwagi do zamówienia (opcjonalnie)"
                        value={deliveryInfo.notes}
                        onChange={(e) => setDeliveryInfo({ ...deliveryInfo, notes: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none resize-none"
                      />
                      <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={deliveryConfirmed}
                          onChange={(e) => setDeliveryConfirmed(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>Potwierdzam dane dostawy.</span>
                      </label>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <span className="text-lg text-slate-300">Łącznie:</span>
                      <span className="text-2xl font-bold text-white">{formatCartPrice(total)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleClearCart}
                        disabled={isSubmitting}
                        className="text-sm text-slate-500 hover:text-slate-400 underline underline-offset-2 decoration-slate-600/40 transition-colors disabled:opacity-50"
                      >
                        Wyczyść koszyk
                      </button>
                      <div className="flex-1" />
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          if (!deliveryInfo.name || !deliveryInfo.phone || !deliveryInfo.address) {
                            alert("Uzupełnij dane dostawy:\n- Imię i nazwisko\n- Telefon\n- Adres");
                            return;
                          }
                          if (!deliveryConfirmed) {
                            alert('Potwierdź dane dostawy przed złożeniem zamówienia.');
                            return;
                          }
                          handleSubmit({ preventDefault: () => { } });
                        }}
                        className="rounded-xl bg-[var(--ff-amber-500)] text-white px-6 py-3 font-bold shadow-[0_0_18px_rgba(255,122,28,0.22)] hover:bg-[var(--ff-amber-400)] hover:shadow-[0_0_24px_rgba(255,122,28,0.34)] transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? 'Składanie...' : 'Złóż zamówienie'}
                      </button>
                    </div>
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

