import { describe, expect, it } from 'vitest';
import { CART_STATE_HASH_VERSION, hashCartItems } from './ActiveSessionMap';

describe('cart state hash contract', () => {
  it('matches the backend cart-fnv1a-v1 golden fixture', () => {
    const items = [
      { id: 'b', name: 'B', quantity: 2, price: 12.5 },
      { id: 'a', name: 'A', quantity: 1, price: 10 },
    ];
    expect(CART_STATE_HASH_VERSION).toBe('cart-fnv1a-v1');
    expect(hashCartItems(items)).toBe('1b275cda');
    expect(hashCartItems([...items].reverse())).toBe('1b275cda');
  });

  it('normalizes aliases, numeric strings, zeroes and missing values', () => {
    const edgeItems = [
      { id: 'ignored', menu_item_id: 'a', quantity: 0, price_pln: '19.90' },
      { id: 'b', qty: undefined, price: undefined },
    ];
    expect(hashCartItems(edgeItems)).toBe(hashCartItems([
      { menu_item_id: 'a', qty: 0, price: 19.9 },
      { menu_item_id: 'b', qty: 1, price: 0 },
    ]));
  });
});
