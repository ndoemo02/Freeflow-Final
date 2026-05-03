import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../state/CartContext';

export default function CartButton() {
  const { itemCount, setIsOpen } = useCart();

  const prevCountRef = useRef(itemCount);
  const [bumpKey, setBumpKey] = useState(0);
  useEffect(() => {
    if (itemCount > prevCountRef.current) {
      setBumpKey(k => k + 1);
    }
    prevCountRef.current = itemCount;
  }, [itemCount]);

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
            key={bumpKey}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg"
          >
            {itemCount}
          </motion.span>
        )}
      </div>
    </motion.button>
  );
}

