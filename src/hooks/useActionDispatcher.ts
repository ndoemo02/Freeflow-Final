/**
 * useActionDispatcher.ts
 * ═══════════════════════════════════════════════════════════════════════════
 * DISPATCHER AKCJI Z BACKENDU
 *
 * Wykonuje akcje przesłane przez backend w response.actions[].
 * 
 * SINGLE SOURCE OF TRUTH: Backend session.cart is authoritative.
 * Frontend ONLY syncs from meta.cart — never creates items locally.
 *
 * Obsługiwane akcje:
 * - SHOW_CART: Otwiera drawer koszyka
 * - SYNC_CART: Synchronizuje cały koszyk (replace)
 * - CLEAR_CART: Czyści koszyk
 * - CONFIRM_ORDER / RESET_UI / order_confirmed: UI event only (cart reset via usePostOrderReset)
 *
 * REMOVED (Path A eliminated):
 * - add_to_cart: Removed — frontend no longer creates cart items locally
 * - meta.addedToCart: Removed — replaced by unconditional meta.cart sync
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useRef } from 'react';
import { useCart } from '../state/CartContext';
import { useToast } from '../components/Toast';

interface BrainAction {
    type: string;
    payload?: {
        items?: any[];
        mode?: string;
        restaurant?: {
            id?: string;
            name: string;
        } | string;
    };
}

interface BrainMeta {
    cart?: {
        items: any[];
        total?: number;
    };
    restaurant?: any;
    source?: string;
    conversationClosed?: boolean;
}

export function useActionDispatcher() {
    const cart = useCart() as any;
    const toast = useToast() as any;
    const lastSyncKeyRef = useRef<string | null>(null);

    // Safely extract functions with fallbacks
    const syncCart = cart?.syncCart;
    const setIsOpen = cart?.setIsOpen;
    const clearCart = cart?.clearCart;
    const push = toast?.push;

    const dispatch = useCallback((actions: BrainAction[] | undefined, meta?: BrainMeta, responseKey?: string) => {
        const fnTag = '[ActionDispatcher]';

        // 1. Process explicit actions array (UI-only actions)
        if (actions && Array.isArray(actions)) {
            for (const action of actions) {
                console.log(`${fnTag} Executing action:`, action.type, action.payload);

                switch (action.type) {
                    case 'SHOW_CART':
                        if (setIsOpen) {
                            setIsOpen(true);
                            console.log(`${fnTag} ✅ Cart drawer opened`);
                        }
                        break;

                    case 'SYNC_CART':
                        if (action.payload?.items && syncCart) {
                            const restaurant = action.payload.restaurant;
                            syncCart(action.payload.items, restaurant);

                            if (push) {
                                push('Koszyk zsynchronizowany', 'info');
                            }
                            console.log(`${fnTag} ✅ Cart synced with ${action.payload.items.length} items`);
                        }
                        break;

                    case 'CLEAR_CART':
                        if (clearCart) {
                            clearCart();
                            console.log(`${fnTag} ✅ Cart cleared`);
                        }
                        break;

                    // ─── RESET UI po potwierdzeniu zamówienia ───────────────────
                    // NOTE: No clearCart here — usePostOrderReset is the sole cart reset mechanism
                    case 'CONFIRM_ORDER':
                    case 'RESET_UI':
                    case 'order_confirmed':
                        if (setIsOpen) setIsOpen(false);
                        // Powiadom inne hooki (np. usePostOrderReset)
                        window.dispatchEvent(new CustomEvent('freeflow:orderConfirmed', { detail: action }));
                        console.log(`${fnTag} ✅ UI reset triggered by action: ${action.type}`);
                        break;

                    default:
                        console.log(`${fnTag} ⚠️ Unknown action type: ${action.type}`);
                }
            }
        }

        // 2. Single cart sync path: meta.cart is the backend's authoritative cart state
        //    No conditional on meta.addedToCart — if backend sends cart, we sync it
        if (meta?.cart?.items && syncCart) {
            console.log(`${fnTag} 🛒 Syncing cart from meta.cart (${meta.cart.items.length} items)`);

            const restaurantData = meta.restaurant || null;
            syncCart(meta.cart.items, restaurantData);

            if (setIsOpen && meta.cart.items.length > 0) {
                setIsOpen(true);
            }

            const syncKey = responseKey || null;
            const shouldToast = !syncKey || lastSyncKeyRef.current !== syncKey;

            if (shouldToast && push) {
                push('Koszyk zsynchronizowany', 'success');
                lastSyncKeyRef.current = syncKey;
            }
            console.log(`${fnTag} ✅ Cart synced from meta.cart`);
        }

        // 3. Log conversation closure for debugging
        if (meta?.conversationClosed) {
            console.log(`${fnTag} 🔒 Conversation closed. Source: ${meta.source || 'unknown'}`);
        }

    }, [syncCart, setIsOpen, clearCart, push]);

    return { dispatch };
}
