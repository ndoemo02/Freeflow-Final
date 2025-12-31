import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCart, setCart, clearCart } from '../lib/cart';

export default function CartBadge() {
  const [open, setOpen] = useState(false);
  const [cart, setCartState] = useState({ items: getCart() });

  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'cart') setCartState({ items: getCart() }); };
    window.addEventListener('storage', onStorage);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    const id = setInterval(() => setCartState({ items: getCart() }), 800);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('keydown', onKey); clearInterval(id); };
  }, []);

  const totalQty = cart.items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.items.reduce((s, i) => s + (i.price * i.qty), 0);

  const updateQuantity = (itemId, change) => {
    const items = getCart();
    const updated = items.map(i => 
      i.id === itemId ? {...i, qty: Math.max(0, i.qty + change)} : i
    ).filter(i => i.qty > 0);
    setCart(updated); 
    setCartState({ items: updated }); 
  };

  return (
    <div className="relative">
      {/* Cart Button */}
      <button 
        type="button" 
        className="relative w-8 h-8 rounded-lg bg-black/20 border border-orange-400/20 text-orange-200 hover:bg-black/30 hover:border-orange-400/40 transition-all duration-200 flex items-center justify-center"
        aria-label="Koszyk" 
        onClick={() => setOpen(v => !v)}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM7.16 14.26l.03.01 10.59-.01c.83 0 1.55-.5 1.85-1.22l2.95-6.88A1 1 0 0 0 21.66 4H6.21L5.27 2H2v2h2l3.6 7.59-1.35 2.45C5.52 15.37 6.48 17 8 17h12v-2H8.42c-.14 0-.25-.11-.25-.25 0-.04.01-.08.03-.11l.96-1.74z"/>
        </svg>
        {totalQty > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-semibold animate-pulse">
            {totalQty}
          </span>
        )}
      </button>

      {/* Glassmorphism Cart Popup */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setOpen(false)}
            />
            
            {/* Cart Drawer */}
            <motion.div
              initial={{ opacity: 0, x: 300, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute top-12 right-0 z-50 w-80 max-h-96 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
              role="dialog" 
              aria-label="Koszyk"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛒</span>
                  <h3 className="text-white font-semibold">Koszyk</h3>
                  {totalQty > 0 && (
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-200 text-xs rounded-full">
                      {totalQty} przedmiot{totalQty > 1 ? 'y' : ''}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setOpen(false)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200 flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Cart Content */}
              <div className="max-h-64 overflow-y-auto">
                {cart.items.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-2">🛒</div>
                    <p className="text-white/60 text-sm">Koszyk jest pusty</p>
                    <p className="text-white/40 text-xs mt-1">Dodaj produkty aby rozpocząć zamówienie</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {cart.items.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium text-sm truncate">{item.name}</h4>
                          <p className="text-orange-300 text-xs">
                            {item.price?.toFixed(2)} zł × {item.qty}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/20 text-white/80 hover:text-red-300 transition-all duration-200 flex items-center justify-center text-sm"
                          >
                            −
                          </button>
                          <span className="text-white font-medium text-sm min-w-[20px] text-center">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded-full bg-white/10 hover:bg-green-500/20 text-white/80 hover:text-green-300 transition-all duration-200 flex items-center justify-center text-sm"
                          >
                            +
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {cart.items.length > 0 && (
                <div className="p-4 border-t border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80 font-medium">Razem:</span>
                    <span className="text-orange-300 font-bold text-lg">
                      {totalPrice.toFixed(2)} zł
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => { clearCart(); setCartState({ items: getCart() }); }}
                      className="flex-1 px-3 py-2 bg-white/10 border border-white/20 text-white/80 rounded-lg hover:bg-white/20 transition-all duration-200 text-sm font-medium"
                    >
                      Wyczyść
                    </button>
                    <button
                      onClick={() => {
                        setOpen(false);
                        // Tutaj można dodać nawigację do checkout
                      }}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 text-sm font-semibold"
                    >
                      Zamów
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


