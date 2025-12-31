import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useUI } from '../state/ui';

interface ContextualIslandProps {
    onSelect: (item: any) => void;
}

export default function ContextualIsland({ onSelect }: ContextualIslandProps) {
    const { mode, presentationItems, highlightedCardId, setHighlightedCardId } = useUI();
    const [expanded, setExpanded] = useState(false);

    // 🛑 Render only if presentation active and items exist
    const isPresentationMode = ['restaurant_presentation'].includes(mode);
    if (!isPresentationMode || (presentationItems?.length || 0) === 0) {
        return null;
    }

    // Determine Active Item
    const activeIndex = presentationItems.findIndex((i: any) => i.id === highlightedCardId);
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;
    const currentItem = presentationItems[currentIndex];

    // Auto-update highlight if index changed via gestures (handled via setHighlightedCardId)
    // No need for extra effect, just render currentItem.

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const SWIPE_THRESHOLD = 50;
        const VELOCITY_THRESHOLD = 400;

        const { offset, velocity } = info;

        // Horizontal Swipe (Change Item)
        if (Math.abs(offset.x) > Math.abs(offset.y)) {
            if (offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) {
                // Next
                if (currentIndex < presentationItems.length - 1) {
                    setHighlightedCardId(presentationItems[currentIndex + 1].id);
                }
            } else if (offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) {
                // Prev
                if (currentIndex > 0) {
                    setHighlightedCardId(presentationItems[currentIndex - 1].id);
                }
            }
        }
        // Vertical Swipe (Expand/Collapse)
        else {
            if (offset.y < -SWIPE_THRESHOLD || velocity.y < -VELOCITY_THRESHOLD) {
                // Swipe Up -> Expand
                setExpanded(true);
            } else if (offset.y > SWIPE_THRESHOLD || velocity.y > VELOCITY_THRESHOLD) {
                // Swipe Down -> Collapse
                setExpanded(false);
            }
        }
    };

    return (
        <motion.div
            className="fixed bottom-[180px] left-4 md:left-8 z-40"
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            <motion.div
                className={`
                    relative bg-black/40 backdrop-blur-xl border border-white/10 
                    rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.3)]
                    overflow-hidden cursor-grab active:cursor-grabbing
                    ${expanded ? 'w-80 h-auto' : 'w-64 h-24'}
                `}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                layout
                onClick={() => !expanded && setExpanded(true)} // Tap expands first, select requires button? Or just tap -> focus
            >
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />

                {/* Content Container */}
                <div className="relative p-4 flex flex-col h-full justify-between">

                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <motion.h3
                                layout="position"
                                className="font-bold text-white text-base truncate leading-tight"
                            >
                                {currentItem.name}
                            </motion.h3>
                            <motion.p
                                layout="position"
                                className="text-xs text-amber-400 font-medium truncate"
                            >
                                {currentItem.cuisine_type || currentItem.category}
                            </motion.p>
                        </div>
                        {currentItem.rating && (
                            <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-white/80 shrink-0">
                                <span>★</span> {currentItem.rating}
                            </div>
                        )}
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 text-sm text-gray-300 space-y-2"
                            >
                                <p className="line-clamp-3 leading-relaxed">
                                    {currentItem.description || (mode === 'restaurant_presentation' ? `${currentItem.address || 'Lokalizacja w centrum'}. Dostępne stoliki na wieczór.` : "Pyszne danie polecane przez szefa kuchni.")}
                                </p>
                                <div className="pt-2 flex justify-between items-center border-t border-white/10">
                                    <span className="text-white font-mono">
                                        {currentItem.price || (currentItem.price_range ? '$$$' : '')}
                                        {(currentItem.price_pln || currentItem.price) ? `${Number(currentItem.price_pln || currentItem.price).toFixed(2)} zł` : ''}
                                    </span>
                                    <button
                                        className="bg-amber-500 text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-amber-400 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); onSelect(currentItem); }}
                                    >
                                        Wybierz
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Collapsed Hints (Price/Distance) */}
                    {!expanded && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            className="flex items-center gap-3 text-[10px] text-gray-400 mt-1"
                        >
                            {currentItem.distance && <span>📍 {currentItem.distance.toFixed(1)} km</span>}
                            {(currentItem.price_pln || currentItem.price) && <span>💰 {Number(currentItem.price_pln || currentItem.price).toFixed(2)} zł</span>}
                            <span className="ml-auto opacity-50">Swipe →</span>
                        </motion.div>
                    )}
                </div>

                {/* Scroll Indicator Dots */}
                {presentationItems.length > 1 && (
                    <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1 p-1">
                        {presentationItems.map((_: any, idx: number) => (
                            <div
                                key={idx}
                                className={`w-1 h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-amber-400 w-3' : 'bg-white/20'}`}
                            />
                        ))}
                    </div>
                )}

            </motion.div>
        </motion.div>
    );
}
