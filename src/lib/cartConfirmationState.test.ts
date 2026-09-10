import { describe, expect, it } from 'vitest';

import { resolveCartConfirmationState } from './cartConfirmationState';

const RESTAURANT = { id: 'restaurant-1', name: 'Testowa' };
const MENU = [{ id: 'dish-1', restaurant_id: RESTAURANT.id, name: 'Rollo' }];
const PENDING_ORDER = { items: [{ id: 'dish-1', quantity: 1 }] };
const CART = { items: [{ id: 'existing', quantity: 1 }], total: 12 };

const previous = {
  currentRestaurant: RESTAURANT,
  selectedRestaurantPreviewId: RESTAURANT.id,
  menuItems: MENU,
  pendingOrder: null,
  expectedContext: null,
  cart: CART,
  conversationPhase: 'ordering',
  uiMode: 'restaurant' as const,
};

describe('cart confirmation state contract', () => {
  it('keeps the menu context and cart when a draft arrives with anomalous idle/open_checkout state', () => {
    const result = resolveCartConfirmationState({
      previous,
      incoming: {
        currentRestaurant: null,
        selectedRestaurantPreviewId: null,
        menuItems: null,
        pendingOrder: PENDING_ORDER,
        expectedContext: 'confirm_add_to_cart',
        cart: { items: [{ id: 'dish-1', quantity: 1 }], total: 25 },
        conversationPhase: 'idle',
        uiMode: 'checkout',
      },
      intent: 'open_checkout',
      toolName: 'add_item_to_cart',
    });

    expect(result).toMatchObject({
      currentRestaurant: RESTAURANT,
      selectedRestaurantPreviewId: RESTAURANT.id,
      menuItems: MENU,
      pendingOrder: PENDING_ORDER,
      expectedContext: 'confirm_add_to_cart',
      cart: CART,
      conversationPhase: 'ordering',
      uiMode: 'restaurant',
      isAwaitingCartConfirmation: true,
    });
  });

  it('continues preserving an existing draft when a later response omits its context', () => {
    const result = resolveCartConfirmationState({
      previous: {
        ...previous,
        pendingOrder: PENDING_ORDER,
        expectedContext: 'confirm_add_to_cart',
      },
      incoming: {
        ...previous,
        currentRestaurant: null,
        menuItems: null,
        pendingOrder: null,
        expectedContext: null,
        cart: { items: [{ id: 'dish-1', quantity: 1 }], total: 25 },
        conversationPhase: 'idle',
        uiMode: 'checkout',
      },
      intent: 'open_checkout',
    });

    expect(result.pendingOrder).toBe(PENDING_ORDER);
    expect(result.expectedContext).toBe('confirm_add_to_cart');
    expect(result.cart).toBe(CART);
    expect(result.isAwaitingCartConfirmation).toBe(true);
  });

  it('restores the explicit context for a legacy add-item draft that only carries pendingOrder', () => {
    const result = resolveCartConfirmationState({
      previous,
      incoming: {
        ...previous,
        pendingOrder: PENDING_ORDER,
        expectedContext: null,
        conversationPhase: 'idle',
        uiMode: 'checkout',
      },
      intent: 'open_checkout',
      toolName: 'add_item_to_cart',
    });

    expect(result.expectedContext).toBe('confirm_add_to_cart');
    expect(result.pendingOrder).toBe(PENDING_ORDER);
    expect(result.isAwaitingCartConfirmation).toBe(true);
  });

  it('releases the draft and accepts the cart on explicit confirmation', () => {
    const confirmedCart = { items: [{ id: 'dish-1', quantity: 1 }], total: 25 };
    const result = resolveCartConfirmationState({
      previous: {
        ...previous,
        pendingOrder: PENDING_ORDER,
        expectedContext: 'confirm_add_to_cart',
      },
      incoming: {
        ...previous,
        pendingOrder: null,
        expectedContext: null,
        cart: confirmedCart,
        conversationPhase: 'ordering',
        uiMode: 'restaurant',
      },
      intent: 'confirm_add_to_cart',
    });

    expect(result.pendingOrder).toBeNull();
    expect(result.expectedContext).toBeNull();
    expect(result.cart).toBe(confirmedCart);
    expect(result.isAwaitingCartConfirmation).toBe(false);
  });

  it('keeps the draft when an explicit confirmation fails to change the cart', () => {
    const result = resolveCartConfirmationState({
      previous: {
        ...previous,
        pendingOrder: PENDING_ORDER,
        expectedContext: 'confirm_add_to_cart',
      },
      incoming: {
        ...previous,
        pendingOrder: null,
        expectedContext: null,
      },
      intent: 'confirm_add_to_cart',
    });

    expect(result.pendingOrder).toBe(PENDING_ORDER);
    expect(result.expectedContext).toBe('confirm_add_to_cart');
    expect(result.cart).toBe(CART);
    expect(result.isAwaitingCartConfirmation).toBe(true);
  });
});
