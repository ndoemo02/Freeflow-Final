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

interface BrainEvent {
    type: string;
    channel?: string;
    payload?: Record<string, any>;
}

interface BrainMeta {
    cart?: {
        items: any[];
        total?: number;
    } | any[];
    restaurant?: any;
    source?: string;
    intent?: string;
    conversationClosed?: boolean;
    menuBehavior?: 'preserve' | 'softClose' | 'forceClose' | 'switchContext';
}

export function useActionDispatcher() {
    const cart = useCart() as any;
    const toast = useToast() as any;
    const lastSyncKeyRef = useRef<string | null>(null);

    const syncCart = cart?.syncCart;
    const setIsOpen = cart?.setIsOpen;
    const resetCartLocal = cart?.resetCartLocal;
    const push = toast?.push;

    const dispatch = useCallback((actions: BrainAction[] | undefined, meta?: BrainMeta, responseKey?: string, events?: BrainEvent[]) => {
        const fnTag = '[ActionDispatcher]';

        if (actions && Array.isArray(actions)) {
            for (const action of actions) {
                console.log(`${fnTag} Executing action:`, action.type, action.payload);

                switch (action.type) {
                    case 'SHOW_CART':
                        if (setIsOpen) {
                            setIsOpen(true);
                            console.log(`${fnTag} Cart drawer opened`);
                        }
                        break;

                    case 'SYNC_CART':
                        if (action.payload?.items && syncCart) {
                            const restaurant = action.payload.restaurant;
                            syncCart(action.payload.items, restaurant);

                            if (push) {
                                push('Koszyk zsynchronizowany', 'info');
                            }
                            console.log(`${fnTag} Cart synced with ${action.payload.items.length} items`);
                        }
                        break;

                    case 'CLEAR_CART':
                        if (resetCartLocal) {
                            resetCartLocal({ clearRestaurant: false, closeDrawer: false, silent: true });
                            console.log(`${fnTag} Cart cleared locally from backend action`);
                        }
                        break;

                    case 'CONFIRM_ORDER':
                    case 'RESET_UI':
                    case 'order_confirmed':
                        if (meta?.menuBehavior !== 'preserve' && setIsOpen) setIsOpen(false);
                        window.dispatchEvent(new CustomEvent('freeflow:orderConfirmed', { detail: action }));
                        console.log(`${fnTag} UI reset triggered by action: ${action.type}`);
                        break;

                    default:
                        console.log(`${fnTag} Unknown action type: ${action.type}`);
                }
            }
        }

        const cartItems = Array.isArray(meta?.cart) ? meta.cart : (meta?.cart?.items || null);

        // Guard: only auto-sync cart on intents that explicitly mutated it.
        // Prevents silent session restore on page reload (BUG NEW-3).
        const CART_MUTATION_INTENTS = ['confirm_add_to_cart', 'confirm_order', 'create_order', 'add_to_cart', 'modify_order', 'cancel_order'];
        const isCartMutation = meta?.intent && CART_MUTATION_INTENTS.includes(meta.intent);

        if (cartItems && cartItems.length > 0 && syncCart && isCartMutation) {
            console.log(`${fnTag} Syncing cart from meta.cart (${cartItems.length} items)`);

            const restaurantData = meta?.restaurant || null;
            syncCart(cartItems, restaurantData);

            const syncKey = responseKey || null;
            const shouldToast = !syncKey || lastSyncKeyRef.current !== syncKey;

            if (shouldToast && push) {
                push('Koszyk zsynchronizowany', 'success');
                lastSyncKeyRef.current = syncKey;
            }
            console.log(`${fnTag} Cart synced from meta.cart`);
        }

        // ── Event Processing ──────────────────────────────────────────
        if (events && Array.isArray(events)) {
            for (const evt of events) {
                if (evt.type === 'EVENT_CART_UPDATED') {
                    window.dispatchEvent(new CustomEvent('freeflow:cartUpdated', { detail: evt.payload }));
                    console.log(`${fnTag} EVENT_CART_UPDATED dispatched:`, evt.payload);
                }
                if (evt.type === 'EVENT_ORDER_COMPLETED') {
                    window.dispatchEvent(new CustomEvent('freeflow:orderCompleted', { detail: evt.payload }));
                    if (resetCartLocal) {
                        resetCartLocal({ clearRestaurant: true, closeDrawer: true, silent: false });
                    }
                    console.log(`${fnTag} EVENT_ORDER_COMPLETED dispatched:`, evt.payload);
                }
            }
        }
        // ──────────────────────────────────────────────────────────────

        // ── menuBehavior: softClose (3s delay) ───────────────────────
        if (meta?.menuBehavior === 'softClose' && setIsOpen) {
            setTimeout(() => setIsOpen(false), 3000);
        } else if (meta?.menuBehavior === 'forceClose' && setIsOpen) {
            setIsOpen(false);
        }
        // ──────────────────────────────────────────────────────────────

        if (meta?.conversationClosed) {
            console.log(`${fnTag} Conversation closed. Source: ${meta.source || 'unknown'}`);
        }

    }, [syncCart, setIsOpen, resetCartLocal, push]);

    return { dispatch };
}

