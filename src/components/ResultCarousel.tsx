import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResultCarouselProps {
  items: any[];
  type: 'restaurant' | 'menu';
  onItemClick?: (item: any) => void;
}

export default function ResultCarousel({ items, type, onItemClick }: ResultCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // If no items, don't render anything
  if (!items || items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="w-full mt-4 overflow-hidden relative z-10"
    >
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-8 pt-2 px-1 snap-x snap-mandatory 
                         scrollbar-hide mask-gradient"
        style={{
          // Gradient mask for fading edges
          maskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)',
        }}
      >
        <AnimatePresence>
          {items.map((item, index) => (
            <motion.div
              key={item.id || index}
              className="flex-none snap-center w-[260px] md:w-[280px] cursor-pointer group"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }
              }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
              onClick={() => onItemClick?.(item)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`
                                h-full flex flex-col justify-between overflow-hidden relative
                                rounded-[32px] backdrop-blur-2xl bg-[#0F0F16]/80 border border-white/10 
                                transition-all duration-300 shadow-xl
                                ${type === 'restaurant'
                  ? 'hover:shadow-[0_0_30px_rgba(0,240,255,0.2)] hover:border-cyan-500/30'
                  : 'hover:shadow-[0_0_30px_rgba(255,0,170,0.2)] hover:border-fuchsia-500/30'}
                            `}>
                {/* Top Image Area (Placeholder Gradient) */}
                <div className={`
                                    h-40 w-full relative p-4 flex flex-col justify-between
                                    bg-gradient-to-br 
                                    ${type === 'restaurant' ? 'from-cyan-900/40 via-[#0a0a1a] to-[#0a0a1a]' : 'from-fuchsia-900/40 via-[#0a0a1a] to-[#0a0a1a]'}
                                `}>
                  {/* Rating Badge */}
                  <div className="self-end px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1">
                    <span className="text-yellow-400 text-xs">★</span>
                    <span className="text-white text-xs font-bold">4.8</span>
                  </div>

                  {/* Icon if no image */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                    <span className="text-6xl filter blur-sm">
                      {type === 'restaurant' ? '🍽️' : '🍕'}
                    </span>
                  </div>
                </div>

                {/* Content Content */}
                <div className="p-5 pt-2 flex flex-col flex-1 gap-2">
                  {/* Category / Subtitle */}
                  <div className={`text-[10px] font-bold tracking-wider uppercase
                                        ${type === 'restaurant' ? 'text-cyan-400' : 'text-fuchsia-400'}
                                    `}>
                    {type === 'restaurant' ? (item.cuisine_type || 'RESTAURACJA') : (item.category || 'DANIE')}
                  </div>

                  {/* Title */}
                  <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">
                    {item.name}
                  </h3>

                  {/* Description (Mock) */}
                  <p className="text-white/50 text-xs line-clamp-2 mb-2">
                    {item.description || "Autentyczne smaki i wyjątkowa atmosfera w sercu miasta."}
                  </p>

                  {/* Meta Row */}
                  <div className="flex items-center gap-3 text-white/40 text-[10px] mb-3 mt-auto">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span>{item.distance || "1.2 km"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>{item.delivery_time || "15-25 min"}</span>
                    </div>
                  </div>

                  {/* Select Button */}
                  <button className={`
                                        w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-95
                                        ${type === 'restaurant'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-lg shadow-fuchsia-900/30'}
                                    `}>
                    Wybierz
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
