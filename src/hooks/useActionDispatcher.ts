import { useCallback, useRef } from 'react';
import { useCart } from '../state/CartContext';
import { useToast } from '../components/Toast';
import { useConversationStore } from '../store/useConversationStore';

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
    tool?: string;
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

    const ADD_TO_CART_INTENTS = ['confirm_add_to_cart', 'add_to_cart', 'add_item_to_cart'];
    const EXPLICIT_CART_OPEN_INTENTS = ['show_cart', 'get_cart_state', 'open_checkout', 'proceed_to_checkout', 'confirm_order', 'create_order'];
    const EXPLICIT_CART_OPEN_TOOLS = ['open_checkout', 'open_cart', 'get_cart_state'];

    const dispatch = useCallback((actions: BrainAction[] | undefined, meta?: BrainMeta, responseKey?: string, events?: BrainEvent[]) => {
        const fnTag = '[ActionDispatcher]';
        const intent = String(meta?.intent || '').toLowerCase();
        const tool = String(meta?.tool || '').toLowerCase();

        if (actions && Array.isArray(actions)) {
            for (const action of actions) {
                console.log(`${fnTag} Executing action:`, action.type, action.payload);

                switch (action.type) {
                    case 'SHOW_CART': {
                        // UX contract: add-to-cart should not auto-open cart.
                        // Keep explicit cart open behavior for checkout/cart intents/tools.
                        const isAddToCartFlow = ADD_TO_CART_INTENTS.includes(intent) || tool === 'add_item_to_cart';
                        const explicitOpenRequested =
                            EXPLICIT_CART_OPEN_INTENTS.includes(intent) ||
                            EXPLICIT_CART_OPEN_TOOLS.includes(tool);
                        const checkoutConfirmationRequired = action.payload?.mode === 'checkout';

                        if (isAddToCartFlow && !explicitOpenRequested) {
                            console.log(`${fnTag} SHOW_CART skipped (add-to-cart flow, no explicit open request)`);
                            break;
                        }

                        if (!explicitOpenRequested && !checkoutConfirmationRequired) {
                            console.log(`${fnTag} SHOW_CART skipped (no explicit cart-open request)`);
                            break;
                        }

                        if (setIsOpen) {
                            setIsOpen(true);
                            console.log(`${fnTag} Cart drawer opened`);
                        }
                        break;
                    }

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
                            // Also clear conversation store cart to prevent sync re-population.
                            // Cart.jsx sync effect would otherwise detect cart.length=0,
                            // read stale storeCart items, and re-populate CartContext.
                            useConversationStore.setState((s) => ({
                                cart: null,
                                cartSyncKey: s.cartSyncKey + 1,
                                pendingOrder: null,
                            }));
                            console.log(`${fnTag} Cart cleared locally + store from backend action`);
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
        const isCartMutation =
            (meta?.intent && CART_MUTATION_INTENTS.includes(meta.intent))
            || tool === 'add_item_to_cart'
            || tool === 'open_checkout';

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
                if (evt.type === 'parser_chips') {
                    window.dispatchEvent(new CustomEvent('freeflow:parserChips', { detail: evt }));
                    console.log(`${fnTag} parser_chips dispatched:`, evt.chips?.length, 'chips, confidence:', evt.confidence);
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

