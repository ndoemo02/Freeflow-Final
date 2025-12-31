import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUI } from '../state/ui';
import IslandWrapper from './IslandWrapper';

interface ContextualIslandProps {
    onSelect: (item: any) => void;
}

export default function ContextualIsland({ onSelect }: ContextualIslandProps) {
    const { mode, presentationItems, highlightedCardId, setHighlightedCardId, setMode } = useUI();
    const [expanded, setExpanded] = useState(false);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    // Sync scroll when highlightedCardId changes in expanded mode
    React.useEffect(() => {
        if (expanded && highlightedCardId && scrollContainerRef.current) {
            const activeElement = scrollContainerRef.current.querySelector(`[data-id="${highlightedCardId}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedCardId, expanded]);

    // 🛑 Render only if presentation active and items exist
    // Unified to support both restaurant and menu modes in the same layout
    const isVisible = ['restaurant_presentation', 'menu_presentation'].includes(mode);
    if (!isVisible || (presentationItems?.length || 0) === 0) {
        return null;
    }

    const activeIndex = presentationItems.findIndex((i: any) => (i.id === highlightedCardId || i.menuItemId === highlightedCardId));
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;
    const currentItem = presentationItems[currentIndex];

    const next = () => {
        if (currentIndex < presentationItems.length - 1) {
            setHighlightedCardId(presentationItems[currentIndex + 1].id);
        }
    };

    const prev = () => {
        if (currentIndex > 0) {
            setHighlightedCardId(presentationItems[currentIndex - 1].id);
        }
    };

    const close = () => {
        setMode('standard_chat');
    };

    return (
        <IslandWrapper
            expanded={expanded}
            setExpanded={setExpanded}
            onSwipeNext={next}
            onSwipePrev={prev}
            onClose={close}
            position={mode === 'menu_presentation' ? 'right' : 'left'}
            className={mode === 'menu_presentation' ? 'z-[60]' : 'z-40'}
        >
            {/* Content Container */}
            <div className={`relative flex flex-col h-full ${expanded ? 'max-h-[60vh]' : ''}`}>

                {/* Collapsed State: Single Item Info */}
                {!expanded && (
                    <div className="p-4 flex flex-col h-full justify-between">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <motion.h3 layout="position" className="font-bold text-white text-base truncate leading-tight">
                                    {currentItem.name}
                                </motion.h3>
                                <motion.p layout="position" className="text-xs text-amber-400 font-medium truncate">
                                    {currentItem.cuisine_type || currentItem.category || (mode === 'restaurant_presentation' ? 'Restauracja' : 'Danie')}
                                </motion.p>
                            </div>
                            {(currentItem.rating || mode === 'restaurant_presentation') && (
                                <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-white/80 shrink-0">
                                    <span>★</span> {currentItem.rating || '5.0'}
                                </div>
                            )}
                        </div>

                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                            {currentItem.distance && <span>📍 {currentItem.distance.toFixed(1)} km</span>}
                            {(currentItem.price_pln || currentItem.price) && <span>💰 {Number(currentItem.price_pln || currentItem.price).toFixed(2)} zł</span>}
                            <span className="ml-auto opacity-50">Swipe →</span>
                        </motion.div>
                    </div>
                )}

                {/* Expanded State: Full List */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-col"
                        >
                            {/* Header in Expanded State */}
                            <div className="p-4 border-b border-white/10 sticky top-0 bg-black/20 backdrop-blur-md z-10 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-white">
                                    {mode === 'restaurant_presentation' ? 'Polecane Miejsca' : 'Karta Menu'}
                                </h3>
                                <button onClick={(e) => { e.stopPropagation(); setExpanded(false); }} className="text-white/40 hover:text-white transition-colors text-xs">
                                    Pomniejsz
                                </button>
                            </div>

                            {/* Scrollable List */}
                            <div ref={scrollContainerRef} className="overflow-y-auto p-2 space-y-2 max-h-[40vh] tiny-scroll">
                                {presentationItems.map((item: any, idx: number) => (
                                    <motion.div
                                        key={item.id || item.menuItemId || idx}
                                        data-id={item.id || item.menuItemId}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className={`
                                            group p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center gap-3
                                            ${(item.id === highlightedCardId || item.menuItemId === highlightedCardId)
                                                ? 'bg-amber-500/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                                : 'bg-white/5 border-white/5 hover:bg-white/10'}
                                        `}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setHighlightedCardId(item.id || item.menuItemId);
                                        }}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-white truncate">{item.name}</div>
                                            <div className="text-[10px] text-white/50 truncate">
                                                {item.cuisine_type || item.category || (mode === 'restaurant_presentation' ? item.address : item.description)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="text-xs font-mono font-bold text-amber-400">
                                                {(item.price_pln || item.price) ? `${Number(item.price_pln || item.price).toFixed(0)} zł` : (item.rating ? `★ ${item.rating}` : '')}
                                            </div>
                                            <button
                                                className="opacity-0 group-hover:opacity-100 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded-full transition-all"
                                                onClick={(e) => { e.stopPropagation(); onSelect(item); }}
                                            >
                                                Wybierz
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Scroll Indicator Dots (only when collapsed) */}
            {presentationItems.length > 1 && !expanded && (
                <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1 p-1">
                    {presentationItems.map((_: any, idx: number) => (
                        <div
                            key={idx}
                            className={`w-1 h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-amber-400 w-3' : 'bg-white/20'}`}
                        />
                    ))}
                </div>
            )}
        </IslandWrapper>
    );
}
