/**
 * useActionDispatcher.ts
 * ═══════════════════════════════════════════════════════════════════════════
 * DISPATCHER AKCJI Z BACKENDU
 * 
 * Wykonuje akcje przesłane przez backend w response.actions[].
 * Rozwiązuje problem: "Frontend nie słucha Backendu"
 * 
 * Obsługiwane akcje:
 * - SHOW_CART: Otwiera drawer koszyka
 * - add_to_cart: Dodaje item do koszyka
 * - SYNC_CART: Synchronizuje cały koszyk
 * - CLEAR_CART: Czyści koszyk
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback } from 'react';
import { useCart } from '../state/CartContext';
import { useToast } from '../components/Toast';

interface BrainAction {
    type: string;
    payload?: {
        dish?: string;
        name?: string;
        price?: number;
        restaurant?: {
            id?: string;
            name: string;
        } | string;
        quantity?: number;
        items?: any[];
        mode?: string;
    };
}

interface BrainMeta {
    addedToCart?: boolean;
    cart?: {
        items: any[];
        total?: number;
    };
    restaurant?: any;
    source?: string;
    conversationClosed?: boolean;
}

export function useActionDispatcher() {
    const cart = useCart();
    const toast = useToast();

    // Safely extract functions with fallbacks
    const syncCart = cart?.syncCart;
    const setIsOpen = cart?.setIsOpen;
    const addToCart = cart?.addToCart;
    const clearCart = cart?.clearCart;
    const push = toast?.push;

    const dispatch = useCallback((actions: BrainAction[] | undefined, meta?: BrainMeta) => {
        const fnTag = '[ActionDispatcher]';

        // 1. Process explicit actions array
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

                    case 'add_to_cart':
                        if (action.payload && addToCart) {
                            const { dish, name, restaurant, quantity } = action.payload;
                            const itemName = dish || name || 'Pozycja';

                            // Normalize restaurant object
                            const restaurantData = typeof restaurant === 'string'
                                ? { name: restaurant, id: 'voice-order' }
                                : restaurant || { name: 'Nieznana', id: 'voice-order' };

                            // Create item with proper structure
                            const item = {
                                id: `voice-${Date.now()}`,
                                name: itemName,
                                price: action.payload.price || 0,
                                quantity: quantity || 1
                            };

                            addToCart(item, restaurantData);

                            if (push) {
                                push(`Dodano ${itemName} do koszyka 🛒`, 'success');
                            }
                            console.log(`${fnTag} ✅ Item added to cart:`, itemName);
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

                    default:
                        console.log(`${fnTag} ⚠️ Unknown action type: ${action.type}`);
                }
            }
        }

        // 2. Handle legacy meta.addedToCart pattern
        if (meta?.addedToCart && meta?.cart?.items && syncCart) {
            console.log(`${fnTag} Processing meta.addedToCart with ${meta.cart.items.length} items`);

            const restaurantData = meta.restaurant || { name: 'Restauracja', id: 'meta-sync' };
            syncCart(meta.cart.items, restaurantData);

            if (setIsOpen) {
                setIsOpen(true);
            }

            if (push) {
                push('Zaktualizowano koszyk z głosowej komendy', 'success');
            }
            console.log(`${fnTag} ✅ Cart synced from meta.cart`);
        }

        // 3. Log conversation closure for debugging
        if (meta?.conversationClosed) {
            console.log(`${fnTag} 🔒 Conversation closed. Source: ${meta.source || 'unknown'}`);
        }

    }, [syncCart, setIsOpen, addToCart, clearCart, push]);

    return { dispatch };
}
