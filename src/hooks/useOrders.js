import { useState, useEffect, useCallback } from "react";
import { getApiUrl } from "../lib/config";
import { supabase } from "../lib/supabase";

export const useOrders = (options = {}) => {
  const {
    userId = null,
    restaurantId = null,
    onOrderUpdate = null,
    onError = null,
  } = options;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);

  const normalizeQuantity = (item) => {
    const raw = item?.quantity ?? item?.qty ?? 1;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  const normalizeOrderItems = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const quantity = normalizeQuantity(item);
      return {
        ...item,
        quantity,
        qty: quantity,
      };
    });
  };

  const normalizeOrder = (order) => {
    if (!order || typeof order !== "object") return order;
    return {
      ...order,
      items: normalizeOrderItems(order.items),
    };
  };

  const normalizeOrders = (payload) => {
    if (!payload) return [];
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.orders)
        ? payload.orders
        : [];
    return list.map(normalizeOrder);
  };

  const fetchFromApi = useCallback(async () => {
    if (!restaurantId && !userId) return [];

    const params = new URLSearchParams();
    if (restaurantId) params.set("restaurant_id", String(restaurantId));
    if (userId) params.set("user_id", String(userId));

    const endpoint = `${getApiUrl("/api/orders")}?${params.toString()}`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Orders API error: ${res.status}`);
    }

    const data = await res.json();
    return normalizeOrders(data);
  }, [restaurantId, userId]);

  const fetchFromSupabase = useCallback(async () => {
    if (!restaurantId && !userId) return [];

    let query = supabase.from("orders").select("*").order("created_at", { ascending: false });

    if (restaurantId) query = query.eq("restaurant_id", restaurantId);
    if (!restaurantId && userId) query = query.eq("user_id", userId);

    const { data, error: supabaseError } = await query;
    if (supabaseError) throw supabaseError;
    return normalizeOrders(data);
  }, [restaurantId, userId]);

  const fetchOrders = useCallback(async () => {
    if (!restaurantId && !userId) {
      setError(null);
      setLoading(false);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const apiOrders = await fetchFromApi();
      setOrders(apiOrders);

      if (onOrderUpdate) onOrderUpdate(apiOrders);
      return apiOrders;
    } catch (apiErr) {
      try {
        const fallbackOrders = await fetchFromSupabase();
        setOrders(fallbackOrders);

        if (onOrderUpdate) onOrderUpdate(fallbackOrders);
        return fallbackOrders;
      } catch (fallbackErr) {
        const finalMessage = fallbackErr?.message || apiErr?.message || "Failed to fetch orders";
        setError(finalMessage);
        if (onError) onError(fallbackErr || apiErr);
        return [];
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFromApi, fetchFromSupabase, onOrderUpdate, onError, restaurantId, userId]);

  const createOrder = useCallback(async (orderData) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(getApiUrl("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderData,
          user_id: userId || null,
          restaurant_id: restaurantId || orderData.restaurant_id,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const newOrder = normalizeOrder(data.order || data);

      setOrders((prev) => [newOrder, ...prev]);
      setCurrentOrder(newOrder);

      return newOrder;
    } catch (err) {
      setError(err?.message || "Failed to create order");
      if (onError) onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, restaurantId, onError]);

  const updateOrderStatus = useCallback(async (orderId, status) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(getApiUrl(`/api/orders/${orderId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const updatedOrder = normalizeOrder(data.order || data);

      setOrders((prev) => prev.map((order) => (order.id === orderId ? updatedOrder : order)));
      setCurrentOrder((prev) => (prev?.id === orderId ? updatedOrder : prev));

      return updatedOrder;
    } catch (err) {
      setError(err?.message || "Failed to update order");
      if (onError) onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const getOrderById = useCallback((orderId) => {
    return orders.find((order) => order.id === orderId);
  }, [orders]);

  const clearCurrentOrder = useCallback(() => {
    setCurrentOrder(null);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    currentOrder,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrderStatus,
    getOrderById,
    clearCurrentOrder,
  };
};
