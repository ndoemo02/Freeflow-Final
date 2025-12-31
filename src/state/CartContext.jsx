import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/config';
import { useToast } from '../components/Toast';

const CartContext = createContext();

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { push } = useToast();
  const [cart, setCart] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('freeflow_cart');
    const savedRestaurant = localStorage.getItem('freeflow_cart_restaurant');

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart from localStorage', e);
      }
    }

    if (savedRestaurant) {
      try {
        setRestaurant(JSON.parse(savedRestaurant));
      } catch (e) {
        console.error('Failed to parse restaurant from localStorage', e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('freeflow_cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('freeflow_cart');
    }
  }, [cart]);

  // Save restaurant to localStorage whenever it changes
  useEffect(() => {
    if (restaurant) {
      localStorage.setItem('freeflow_cart_restaurant', JSON.stringify(restaurant));
    } else {
      localStorage.removeItem('freeflow_cart_restaurant');
    }
  }, [restaurant]);

  // Add item to cart
  const addToCart = (item, restaurantData) => {
    // Check if cart is from different restaurant
    if (restaurant && restaurant.id !== restaurantData.id) {
      const confirm = window.confirm(
        `Masz już pozycje z ${restaurant.name} w koszyku. Czy chcesz wyczyścić koszyk i dodać pozycję z ${restaurantData.name}?`
      );
      if (!confirm) return;

      // Clear cart and set new restaurant
      setCart([]);
      setRestaurant(restaurantData);
    } else if (!restaurant) {
      setRestaurant(restaurantData);
    }

    // Pobierz ilość z item.quantity (domyślnie 1 jeśli nie podano)
    const quantityToAdd = item.quantity || 1;

    // Check if item already exists in cart
    const existingIndex = cart.findIndex(cartItem => cartItem.id === item.id);

    if (existingIndex >= 0) {
      // Update quantity - dodaj ilość z item.quantity (nie zawsze +1!)
      const newCart = [...cart];
      newCart[existingIndex].quantity += quantityToAdd;
      setCart(newCart);
      console.log(`✅ Updated quantity for ${item.name}: +${quantityToAdd} (total: ${newCart[existingIndex].quantity})`);
      push(`Zwiększono ilość: ${item.name} (+${quantityToAdd})`, 'success');
    } else {
      // Add new item - użyj item.quantity z backendu (nie nadpisuj na 1!)
      setCart([...cart, { ...item, quantity: quantityToAdd }]);
      console.log(`✅ Added new item to cart: ${item.name} (quantity: ${quantityToAdd})`);
      push(`Dodano do koszyka: ${item.name} (${quantityToAdd}x)`, 'success');
    }

    console.log('Item added to cart', { item, restaurant: restaurantData, quantityAdded: quantityToAdd });
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    const newCart = cart.filter(item => item.id !== itemId);
    setCart(newCart);

    // Clear restaurant if cart is empty
    if (newCart.length === 0) {
      setRestaurant(null);
    }

    push('Usunięto z koszyka', 'info');
    console.log('Item removed from cart', { itemId });
  };

  // Update item quantity
  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const newCart = cart.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    );
    setCart(newCart);
    console.log('Cart quantity updated', { itemId, quantity });
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setRestaurant(null);
    push('Koszyk wyczyszczony', 'info');
    console.log('Cart cleared');
  };

  // Sync cart with backend state (e.g. from Voice AI)
  const syncCart = (backendItems, restaurantData) => {
    console.log("🛒 Syncing cart from Backend:", backendItems, restaurantData);
    if (!backendItems || !Array.isArray(backendItems)) return;

    const mappedItems = backendItems.map(item => ({
      id: item.id || item.menu_item_id, // Fallback
      name: item.name,
      price: Number(item.price_pln ?? item.price ?? 0),
      quantity: Number(item.qty ?? item.quantity ?? 1)
    }));

    setCart(mappedItems);

    if (restaurantData) {
      // If restaurantData is string, wrap it
      const rData = typeof restaurantData === 'string' ? { name: restaurantData, id: 'unknown-sync' } : restaurantData;

      // Try to preserve ID if we have it in current state and names match
      if (restaurant && restaurant.name === rData.name) {
        // Keep existing restaurant object with ID
      } else {
        setRestaurant(rData);
      }
    }

    // Opcjonalnie otwórz koszyk jeśli są elementy
    if (mappedItems.length > 0) {
      // setIsOpen(true); // Decyzja UX: czy otwierać automatycznie? User complain "nie pokazuje", więc może tak.
    }
  };

  // Calculate total
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Submit order
  const submitOrder = async (deliveryInfo) => {
    console.log('🛒 submitOrder called with user:', user);

    if (!user) {
      push('Musisz być zalogowany, aby złożyć zamówienie', 'error');
      return false;
    }

    if (cart.length === 0) {
      push('Koszyk jest pusty', 'error');
      return false;
    }

    if (!restaurant) {
      push('Nie wybrano restauracji', 'error');
      return false;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        user_id: user?.id || null,
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        items: cart.map(item => ({
          menu_item_id: item.id,
          name: item.name,
          unit_price_cents: Math.round(item.price * 100),
          qty: item.quantity
        })),
        total_price: Math.round(total * 100),
        status: 'pending',
        customer_name: deliveryInfo.name || user?.user_metadata?.first_name || user?.email || 'Gość',
        customer_phone: deliveryInfo.phone || user?.user_metadata?.phone || '',
        delivery_address: deliveryInfo.address || user?.user_metadata?.address || '',
        notes: deliveryInfo.notes || '',
        created_at: new Date().toISOString()
      };

      console.log('🛒 Submitting order', orderData);
      const response = await fetch(getApiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const data = await response.json();
      push('Zamówienie złożone pomyślnie! 🎉', 'success');
      clearCart();
      setIsOpen(false);
      return data;
    } catch (error) {
      console.error('Failed to submit order', error);
      push('Błąd podczas składania zamówienia', 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const value = {
    cart,
    restaurant,
    total,
    isOpen,
    isSubmitting,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    syncCart, // Export this
    submitOrder,
    setIsOpen,
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
  };



  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

