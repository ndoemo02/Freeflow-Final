/**
 * Testy jednostkowe dla funkcji API (api.ts)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import api, { createOrder, getUserOrders, getRestaurants, getRestaurantMenu, type CreateOrderRequest } from '../../src/lib/api';

// Mock fetch
global.fetch = vi.fn();

describe('API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  describe('api', () => {
    it('should return JSON data on successful request', async () => {
      const mockData = { success: true, data: 'test' };
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify(mockData),
      });

      const result = await api('/api/test');
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/api/test', undefined);
    });

    it('should throw error on failed request', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: () => 'text/plain',
        },
        text: async () => 'Not Found',
      });

      await expect(api('/api/test')).rejects.toThrow('API 404: Not Found');
    });

    it('should return empty object for non-JSON response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'text/html',
        },
        text: async () => '<html>...</html>',
      });

      const result = await api('/api/test');
      expect(result).toEqual({});
    });

    it('should handle invalid JSON gracefully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => 'invalid json {',
      });

      const result = await api('/api/test');
      expect(result).toEqual({});
    });

    it('should handle empty response body', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => '',
      });

      const result = await api('/api/test');
      expect(result).toEqual({});
    });

    it('should pass request options to fetch', async () => {
      const mockData = { success: true };
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify(mockData),
      });

      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      };

      await api('/api/test', options);
      expect(fetch).toHaveBeenCalledWith('/api/test', options);
    });
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      const orderData: CreateOrderRequest = {
        restaurant_id: 'rest-1',
        items: [
          { menu_item_id: 'item-1', name: 'Pizza', unit_price_cents: 2500, qty: 2 },
        ],
      };

      const mockResponse = {
        order_id: 'order-123',
        eta: '30 min',
        total_cents: 5000,
        status: 'pending',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await createOrder(orderData);
      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        '/api/orders',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include optional fields in order', async () => {
      const orderData: CreateOrderRequest = {
        restaurant_id: 'rest-1',
        items: [],
        customer_name: 'John Doe',
        customer_phone: '+48123456789',
        delivery_address: '123 Main St',
        notes: 'Extra spicy',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify({ order_id: 'order-123' }),
      });

      await createOrder(orderData);
      const callArgs = (fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body).toMatchObject(orderData);
    });
  });

  describe('getUserOrders', () => {
    it('should fetch orders without user ID', async () => {
      const mockOrders = [
        { id: 'order-1', status: 'pending' },
        { id: 'order-2', status: 'completed' },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify({ orders: mockOrders }),
      });

      const result = await getUserOrders();
      expect(result).toEqual(mockOrders);
      expect(fetch).toHaveBeenCalledWith('/api/orders', { method: 'GET' });
    });

    it('should fetch orders with user ID', async () => {
      const mockOrders = [{ id: 'order-1', status: 'pending' }];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify({ orders: mockOrders }),
      });

      const result = await getUserOrders('user-123');
      expect(result).toEqual(mockOrders);
      expect(fetch).toHaveBeenCalledWith('/api/orders?user_id=user-123', { method: 'GET' });
    });

    it('should return empty array when orders field is missing', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify({}),
      });

      const result = await getUserOrders();
      expect(result).toEqual([]);
    });
  });

  describe('getRestaurants', () => {
    it('should fetch restaurants without city filter', async () => {
      const mockRestaurants = [
        { id: 'rest-1', name: 'Restaurant 1' },
        { id: 'rest-2', name: 'Restaurant 2' },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify({ restaurants: mockRestaurants }),
      });

      const result = await getRestaurants();
      expect(result).toEqual(mockRestaurants);
      expect(fetch).toHaveBeenCalledWith('/api/restaurants', { method: 'GET' });
    });

    it('should fetch restaurants with city filter', async () => {
      const mockRestaurants = [{ id: 'rest-1', name: 'Restaurant 1' }];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify({ restaurants: mockRestaurants }),
      });

      const result = await getRestaurants('Warsaw');
      expect(result).toEqual(mockRestaurants);
      expect(fetch).toHaveBeenCalledWith('/api/restaurants?city=Warsaw', { method: 'GET' });
    });

    it('should encode city name in URL', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify({ restaurants: [] }),
      });

      await getRestaurants('Kraków');
      expect(fetch).toHaveBeenCalledWith('/api/restaurants?city=Krak%C3%B3w', { method: 'GET' });
    });
  });

  describe('getRestaurantMenu', () => {
    it('should fetch menu without dish filter', async () => {
      const mockMenu = [
        { id: 'item-1', name: 'Pizza', price: 25.00 },
        { id: 'item-2', name: 'Burger', price: 20.00 },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify({ menu: mockMenu }),
      });

      const result = await getRestaurantMenu('rest-1');
      expect(result).toEqual(mockMenu);
      expect(fetch).toHaveBeenCalledWith('/api/menu?restaurant_id=rest-1', { method: 'GET' });
    });

    it('should fetch menu with dish filter', async () => {
      const mockMenu = [{ id: 'item-1', name: 'Pizza', price: 25.00 }];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify({ menu: mockMenu }),
      });

      const result = await getRestaurantMenu('rest-1', 'pizza');
      expect(result).toEqual(mockMenu);
      expect(fetch).toHaveBeenCalledWith('/api/menu?restaurant_id=rest-1&dish=pizza', { method: 'GET' });
    });

    it('should encode dish name in URL', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify({ menu: [] }),
      });

      await getRestaurantMenu('rest-1', 'pizza margherita');
      expect(fetch).toHaveBeenCalledWith('/api/menu?restaurant_id=rest-1&dish=pizza%20margherita', { method: 'GET' });
    });
  });
});





