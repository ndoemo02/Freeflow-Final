import React from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../state/CartContext';

export default function CartButton() {
  const { itemCount, setIsOpen } = useCart();

  return (
    <motion.button
      onClick={() => setIsOpen(true)}
      className="relative rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 px-4 py-2 text-white hover:shadow-[0_0_20px_rgba(0,234,255,0.4)] transition-all"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">🛒</span>
        <span className="font-semibold">Koszyk</span>
        {itemCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg"
          >
            {itemCount}
          </motion.span>
        )}
      </div>
    </motion.button>
  );
}

