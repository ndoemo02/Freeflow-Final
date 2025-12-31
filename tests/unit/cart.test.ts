/**
 * Testy jednostkowe dla funkcji koszyka (cart.ts)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCart, setCart, addToCart, clearCart, total, type CartItem } from '../../src/lib/cart';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Cart Functions', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return empty array when cart is empty', () => {
      const cart = getCart();
      expect(cart).toEqual([]);
    });

    it('should return cart items from localStorage', () => {
      const items: CartItem[] = [
        { id: '1', name: 'Pizza', qty: 2, price: 25.00 },
        { id: '2', name: 'Burger', qty: 1, price: 20.00 },
      ];
      localStorage.setItem('cart', JSON.stringify(items));
      
      const cart = getCart();
      expect(cart).toEqual(items);
    });

    it('should return empty array on invalid JSON', () => {
      localStorage.setItem('cart', 'invalid json');
      
      const cart = getCart();
      expect(cart).toEqual([]);
    });
  });

  describe('setCart', () => {
    it('should save cart items to localStorage', () => {
      const items: CartItem[] = [
        { id: '1', name: 'Pizza', qty: 1, price: 25.00 },
      ];
      
      setCart(items);
      
      const saved = JSON.parse(localStorage.getItem('cart') || '[]');
      expect(saved).toEqual(items);
    });

    it('should overwrite existing cart', () => {
      const oldItems: CartItem[] = [{ id: '1', name: 'Pizza', qty: 1, price: 25.00 }];
      const newItems: CartItem[] = [{ id: '2', name: 'Burger', qty: 2, price: 20.00 }];
      
      setCart(oldItems);
      setCart(newItems);
      
      const saved = JSON.parse(localStorage.getItem('cart') || '[]');
      expect(saved).toEqual(newItems);
    });
  });

  describe('addToCart', () => {
    it('should add new item to empty cart', () => {
      const item: CartItem = { id: '1', name: 'Pizza', qty: 1, price: 25.00 };
      
      addToCart(item);
      
      const cart = getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0]).toEqual(item);
    });

    it('should update quantity when item already exists', () => {
      const item: CartItem = { id: '1', name: 'Pizza', qty: 1, price: 25.00 };
      
      addToCart(item);
      addToCart({ ...item, qty: 2 });
      
      const cart = getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0].qty).toBe(3);
    });

    it('should add multiple different items', () => {
      const item1: CartItem = { id: '1', name: 'Pizza', qty: 1, price: 25.00 };
      const item2: CartItem = { id: '2', name: 'Burger', qty: 1, price: 20.00 };
      
      addToCart(item1);
      addToCart(item2);
      
      const cart = getCart();
      expect(cart).toHaveLength(2);
    });

    it('should handle adding zero quantity', () => {
      const item: CartItem = { id: '1', name: 'Pizza', qty: 0, price: 25.00 };
      
      addToCart(item);
      
      const cart = getCart();
      expect(cart[0].qty).toBe(0);
    });
  });

  describe('clearCart', () => {
    it('should remove all items from cart', () => {
      const items: CartItem[] = [
        { id: '1', name: 'Pizza', qty: 1, price: 25.00 },
        { id: '2', name: 'Burger', qty: 1, price: 20.00 },
      ];
      
      setCart(items);
      clearCart();
      
      const cart = getCart();
      expect(cart).toEqual([]);
    });

    it('should work on empty cart', () => {
      clearCart();
      
      const cart = getCart();
      expect(cart).toEqual([]);
    });
  });

  describe('total', () => {
    it('should return 0 for empty cart', () => {
      expect(total()).toBe(0);
    });

    it('should calculate total for single item', () => {
      const item: CartItem = { id: '1', name: 'Pizza', qty: 2, price: 25.00 };
      addToCart(item);
      
      expect(total()).toBe(50.00);
    });

    it('should calculate total for multiple items', () => {
      addToCart({ id: '1', name: 'Pizza', qty: 2, price: 25.00 });
      addToCart({ id: '2', name: 'Burger', qty: 1, price: 20.00 });
      
      expect(total()).toBe(70.00);
    });

    it('should handle items with quantity 0', () => {
      addToCart({ id: '1', name: 'Pizza', qty: 0, price: 25.00 });
      addToCart({ id: '2', name: 'Burger', qty: 1, price: 20.00 });
      
      expect(total()).toBe(20.00);
    });

    it('should handle decimal prices correctly', () => {
      addToCart({ id: '1', name: 'Pizza', qty: 3, price: 12.50 });
      
      expect(total()).toBe(37.50);
    });
  });
});





