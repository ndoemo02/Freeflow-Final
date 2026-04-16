import { describe, expect, it } from 'vitest';
import { mapLiveToolResultToUiState } from './liveUiSessionAdapter';

describe('mapLiveToolResultToUiState', () => {
  it('maps find results to results_ready', () => {
    const mapped = mapLiveToolResultToUiState({
      toolName: 'find_nearby',
      response: {
        intent: 'find_nearby',
        reply: 'Mam kilka restauracji w poblizu.',
      },
    });

    expect(mapped.state).toBe('results_ready');
    expect(mapped.statusText).toContain('restauracji');
  });

  it('maps menu and cart flows to selected states', () => {
    const restaurantMapped = mapLiveToolResultToUiState({
      toolName: 'show_menu',
      response: {
        intent: 'show_menu',
        context: { currentRestaurant: { name: 'Rollo House' } },
      },
    });
    expect(restaurantMapped.state).toBe('restaurant_selected');
    expect(restaurantMapped.selectedRestaurantName).toBe('Rollo House');

    const itemMapped = mapLiveToolResultToUiState({
      toolName: 'add_item_to_cart',
      response: {
        context: { pendingOrder: { items: [{ name: 'Rollo', quantity: 2 }] } },
      },
    });
    expect(itemMapped.state).toBe('item_selected');
    expect(itemMapped.selectedItemSummary).toBe('2 x Rollo');

    const cartMapped = mapLiveToolResultToUiState({
      toolName: 'open_checkout',
      response: { cart: { items: [{ id: 1 }] } },
    });
    expect(cartMapped.state).toBe('cart_ready');
    expect(cartMapped.cartSummary).toContain('Koszyk');
  });
});
