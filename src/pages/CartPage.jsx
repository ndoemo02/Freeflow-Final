import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCart, setCart, total } from '../lib/cart';

export default function CartPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setCartItems(getCart());
  }, []);

  const updateQuantity = (id, newQty) => {
    if (newQty <= 0) {
      removeItem(id);
      return;
    }
    
    const updatedItems = cartItems.map(item => 
      item.id === id ? { ...item, qty: newQty } : item
    );
    setCartItems(updatedItems);
    setCart(updatedItems);
  };

  const removeItem = (id) => {
    const updatedItems = cartItems.filter(item => item.id !== id);
    setCartItems(updatedItems);
    setCart(updatedItems);
  };

  const clearCart = () => {
    setCartItems([]);
    setCart([]);
  };

  const cartTotal = total();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              🚗 CART SYSTEM
            </span>
          </h1>
          <p className="text-gray-400">Neural shopping interface</p>
        </div>

        {/* Cyberpunk Interface */}
        <motion.div 
          className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-cyan-500/30"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Cyberpunk Grid Background */}
          <div className="absolute inset-0 rounded-xl opacity-10" 
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300ffff' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-11.046-8.954-20-20-20v20h20z'/%3E%3C/g%3E%3C/svg%3E")`,
               }}
          />

          {/* Neon Corner Accents */}
          <div className="absolute top-4 left-4 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 animate-pulse"></div>
          <div className="absolute top-4 right-4 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 animate-pulse"></div>
          <div className="absolute bottom-4 left-4 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 animate-pulse"></div>
          <div className="absolute bottom-4 right-4 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 animate-pulse"></div>

          {/* Floating Neon Elements */}
          <div className="absolute top-8 right-1/3 w-2 h-2 bg-pink-400 rounded-full shadow-md shadow-pink-400/50 animate-ping"></div>
          <div className="absolute top-1/3 left-8 w-2 h-2 bg-green-400 rounded-full shadow-md shadow-green-400/50 animate-ping"></div>
          <div className="absolute bottom-1/3 right-8 w-2 h-2 bg-blue-400 rounded-full shadow-md shadow-blue-400/50 animate-ping"></div>

          {/* Cart Items as Cyberpunk Cards */}
          <div className="relative z-10">
            {cartItems.length === 0 ? (
              <motion.div 
                className="text-center py-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-6xl mb-4">⚡</div>
                <h3 className="text-2xl font-bold text-cyan-400 mb-2">NEURAL CART EMPTY</h3>
                <p className="text-gray-400 mb-6">Initialize shopping protocol to load items</p>
                <button 
                  onClick={() => navigate('/')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25"
                >
                  🚀 INITIATE SHOPPING
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {cartItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      className="relative"
                      initial={{ opacity: 0, y: 50, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -50, scale: 0.8 }}
                      transition={{ 
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 100
                      }}
                    >
                      {/* Cyberpunk Card */}
                      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-4 rounded-lg shadow-lg border border-cyan-500/30 relative min-h-[140px] backdrop-blur-sm">
                        {/* Neon Accent */}
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"></div>
                        
                        {/* Card Content */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-cyan-400 text-lg">{item.name}</h4>
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="w-6 h-6 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-xs hover:bg-red-500/30 transition-colors border border-red-500/30"
                              title="Remove from cart"
                            >
                              ✕
                            </button>
                          </div>
                          
                          {item.note && (
                            <p className="text-sm text-gray-400 italic border-l-2 border-cyan-500/50 pl-2">
                              "{item.note}"
                            </p>
                          )}
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 mt-4">
                            <button 
                              onClick={() => updateQuantity(item.id, item.qty - 1)}
                              className="w-8 h-8 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center text-sm hover:bg-red-500/30 transition-colors border border-red-500/30"
                            >
                              -
                            </button>
                            <span className="font-semibold text-white min-w-[3rem] text-center bg-slate-700/50 px-3 py-1 rounded border border-cyan-500/30">
                              {item.qty}×
                            </span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.qty + 1)}
                              className="w-8 h-8 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center text-sm hover:bg-green-500/30 transition-colors border border-green-500/30"
                            >
                              +
                            </button>
                          </div>
                          
                          {/* Price */}
                          <div className="text-right">
                            <span className="text-xl font-bold text-green-400">
                              {(item.qty * item.price).toFixed(2)} zł
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Cyberpunk Summary Panel */}
          {cartItems.length > 0 && (
            <motion.div 
              className="mt-8 bg-gradient-to-r from-slate-800/90 to-slate-900/90 p-6 rounded-lg shadow-lg border border-cyan-500/30 relative backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"></div>
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-cyan-400">⚡ NEURAL SUMMARY</h3>
                  <p className="text-gray-400">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} loaded</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-400">
                    {cartTotal.toFixed(2)} zł
                  </div>
                  <div className="text-sm text-gray-400">TOTAL VALUE</div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={clearCart}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 py-3 px-4 rounded-lg font-semibold transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
                >
                  🗑️ CLEAR CART
                </button>
                <button 
                  onClick={() => navigate('/')}
                  className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-3 px-4 rounded-lg font-semibold transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50"
                >
                  🛒 CONTINUE SHOPPING
                </button>
                <button 
                  className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-400 py-3 px-4 rounded-lg font-semibold transition-all duration-200 border border-green-500/30 hover:border-green-500/50 shadow-lg shadow-green-500/10"
                >
                  ✅ EXECUTE ORDER
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}


