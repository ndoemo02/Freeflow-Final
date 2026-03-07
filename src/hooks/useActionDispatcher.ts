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
    } | any[];
    restaurant?: any;
    source?: string;
    conversationClosed?: boolean;
}

export function useActionDispatcher() {
    const cart = useCart() as any;
    const toast = useToast() as any;
    const lastSyncKeyRef = useRef<string | null>(null);

    const syncCart = cart?.syncCart;
    const setIsOpen = cart?.setIsOpen;
    const resetCartLocal = cart?.resetCartLocal;
    const push = toast?.push;

    const dispatch = useCallback((actions: BrainAction[] | undefined, meta?: BrainMeta, responseKey?: string) => {
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
                        if (setIsOpen) setIsOpen(false);
                        window.dispatchEvent(new CustomEvent('freeflow:orderConfirmed', { detail: action }));
                        console.log(`${fnTag} UI reset triggered by action: ${action.type}`);
                        break;

                    default:
                        console.log(`${fnTag} Unknown action type: ${action.type}`);
                }
            }
        }

        const cartItems = Array.isArray(meta?.cart) ? meta.cart : (meta?.cart?.items || null);

        if (cartItems && syncCart) {
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

        if (meta?.conversationClosed) {
            console.log(`${fnTag} Conversation closed. Source: ${meta.source || 'unknown'}`);
        }

    }, [syncCart, setIsOpen, resetCartLocal, push]);

    return { dispatch };
}

