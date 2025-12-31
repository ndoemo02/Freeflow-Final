// src/lib/cart.ts
export type CartItem = { id: string; name: string; qty: number; price: number };
const KEY = 'cart';

export function getCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function setCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addToCart(item: CartItem) {
  console.log("🛒 Adding to cart:", item);
  const c = getCart();
  const idx = c.findIndex(x => x.id === item.id);
  if (idx >= 0) {
    console.log("🔄 Item exists, updating quantity:", c[idx].qty, "+", item.qty);
    c[idx].qty += item.qty;
  } else {
    console.log("➕ New item, adding to cart");
    c.push(item);
  }
  setCart(c);
  console.log("🛒 Cart after add:", c);
}

export function clearCart() { 
  setCart([]); 
}

export function total() { 
  return getCart().reduce((s, x) => s + x.qty * x.price, 0); 
}