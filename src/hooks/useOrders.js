import { useState, useEffect, useCallback } from "react";

export const useOrders = (options = {}) => {
  const {
    userId = "demo-user-001",
    restaurantId = null,
    onOrderUpdate = null,
    onError = null,
  } = options;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);

  // Fetch orders from backend
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = restaurantId 
        ? `/api/orders/restaurant/${restaurantId}`
        : `/api/orders/user/${userId}`;
      
      const res = await fetch(endpoint, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setOrders(data.orders || []);
      
      if (onOrderUpdate) {
        onOrderUpdate(data.orders || []);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err.message);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, restaurantId, onOrderUpdate, onError]);

  // Create new order
  const createOrder = useCallback(async (orderData) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderData,
          user_id: userId,
          restaurant_id: restaurantId,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const newOrder = data.order;
      
      setOrders(prev => [newOrder, ...prev]);
      setCurrentOrder(newOrder);
      
      if (onOrderUpdate) {
        onOrderUpdate([newOrder, ...orders]);
      }
      
      return newOrder;
    } catch (err) {
      console.error("Error creating order:", err);
      setError(err.message);
      if (onError) {
        onError(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, restaurantId, orders, onOrderUpdate, onError]);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId, status) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const updatedOrder = data.order;
      
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId ? updatedOrder : order
        )
      );
      
      if (currentOrder && currentOrder.id === orderId) {
        setCurrentOrder(updatedOrder);
      }
      
      if (onOrderUpdate) {
        onOrderUpdate(orders.map(order => 
          order.id === orderId ? updatedOrder : order
        ));
      }
      
      return updatedOrder;
    } catch (err) {
      console.error("Error updating order:", err);
      setError(err.message);
      if (onError) {
        onError(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orders, currentOrder, onOrderUpdate, onError]);

  // Get order by ID
  const getOrderById = useCallback((orderId) => {
    return orders.find(order => order.id === orderId);
  }, [orders]);

  // Clear current order
  const clearCurrentOrder = useCallback(() => {
    setCurrentOrder(null);
  }, []);

  // Auto-fetch orders on mount
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


