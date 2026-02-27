import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUI } from '../state/ui';
import IslandWrapper from './IslandWrapper';

interface ContextualIslandProps {
    onSelect: (item: any) => void;
}

export default function ContextualIsland({ onSelect }: ContextualIslandProps) {
    const { mode, presentationItems, highlightedCardId, setHighlightedCardId, setMode } = useUI();
    const [expanded, setExpanded] = useState(false);

    // --- Slider state ---
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(256); // fallback to 256px
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Measure container width on mount + resize
    useEffect(() => {
        let retries = 0;
        const measure = () => {
            const w = containerRef.current?.offsetWidth || 0;
            if (w > 0) {
                console.log('[ContextualIsland] containerWidth measured:', w);
                setContainerWidth(w);
            } else if (retries < 10) {
                // Retry co 100ms jeśli ref jeszcze nie ma rozmiaru
                retries++;
                setTimeout(measure, 100);
            } else {
                // Ostateczny fallback: 256px (Tailwind w-64)
                const fallback = 256;
                console.log('[ContextualIsland] fallback containerWidth:', fallback);
                setContainerWidth(fallback);
            }
        };

        const timeout = setTimeout(measure, 50);
        const observer = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect.width || 0;
            if (w > 0) {
                console.log('[ContextualIsland] ResizeObserver width:', w);
                setContainerWidth(w);
            }
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => {
            clearTimeout(timeout);
            observer.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync scroll when highlightedCardId changes in expanded mode
    useEffect(() => {
        if (expanded && highlightedCardId && scrollContainerRef.current) {
            const activeElement = scrollContainerRef.current.querySelector(`[data-id="${highlightedCardId}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedCardId, expanded]);

    // 🛑 Render only if presentation active and items exist
    const isVisible = ['restaurant_presentation', 'menu_presentation'].includes(mode);
    if (!isVisible || (presentationItems?.length || 0) === 0) {
        return null;
    }

    const activeIndex = presentationItems.findIndex(
        (i: any) => i.id === highlightedCardId || i.menuItemId === highlightedCardId
    );
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;

    // DEBUG: log slider state
    console.log('[ContextualIsland] DEBUG →', {
        containerWidth,
        presentationItemsLength: presentationItems.length,
        currentIndex,
        trackWidth: containerWidth * presentationItems.length,
        highlightedCardId,
        translateX: -(currentIndex * containerWidth),
    });

    // Helper: get item ID (supports both restaurant and menu items)
    const getItemId = (item: any) => item.id || item.menuItemId;

    const goTo = useCallback((targetIndex: number) => {
        // Clamp: never jump more than ±1, never go out of bounds
        const clamped = Math.max(0, Math.min(presentationItems.length - 1, targetIndex));
        setHighlightedCardId(getItemId(presentationItems[clamped]));
    }, [currentIndex, presentationItems, setHighlightedCardId]);

    const next = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
    const prev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

    // ─── Drag handler with velocity + offset logic ───────────────────────────
    const handleDragEnd = useCallback((_event: any, info: any) => {
        const OFFSET_THRESHOLD = 50;
        const VELOCITY_THRESHOLD = 800;

        const vx = info.velocity.x;
        const ox = info.offset.x;

        // Velocity-based flick (takes priority over offset)
        if (vx < -VELOCITY_THRESHOLD) {
            goTo(currentIndex + 1);
            return;
        }
        if (vx > VELOCITY_THRESHOLD) {
            goTo(currentIndex - 1);
            return;
        }

        // Offset-based slow drag
        if (ox < -OFFSET_THRESHOLD) {
            goTo(currentIndex + 1);
        } else if (ox > OFFSET_THRESHOLD) {
            goTo(currentIndex - 1);
        }
        // Otherwise snap back — framer-motion animate handles it
    }, [currentIndex, goTo]);

    const close = () => {
        setMode('standard_chat');
    };

    const canDrag = presentationItems.length > 1;

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

                {/* Collapsed State: Draggable Carousel Slider */}
                {!expanded && (
                    // Viewport: clips the track to one card width
                    <div
                        ref={containerRef}
                        className="relative w-full h-full overflow-hidden flex items-center"
                    >
                        {/* Track: a single horizontal flex row */}
                        <motion.div
                            className="flex h-full"
                            style={{ width: `${containerWidth * presentationItems.length}px` }}
                            // Snap to currentIndex using pixel values (no percentages → no micro-glitch)
                            animate={{ x: -(currentIndex * containerWidth) }}
                            transition={{ type: 'spring', stiffness: 400, damping: 40, mass: 0.8 }}
                            // ── Drag config ──────────────────────────────────────────
                            drag={canDrag ? 'x' : false}
                            dragDirectionLock           // prevent diagonal drift
                            dragMomentum={false}        // no inertia after release → deterministic snap
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.15}
                            onDragEnd={handleDragEnd}
                        >
                            {presentationItems.map((item: any, idx: number) => (
                                <div
                                    key={getItemId(item) || idx}
                                    className="flex flex-col h-full justify-between shrink-0 select-none pointer-events-none p-4"
                                    style={{ width: `${containerWidth}px` }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white text-base truncate leading-tight">
                                                {item.name}
                                            </h3>
                                            <p className="text-xs text-amber-400 font-medium truncate">
                                                {item.cuisine_type || item.category || (mode === 'restaurant_presentation' ? 'Restauracja' : 'Danie')}
                                            </p>
                                        </div>
                                        {(item.rating || mode === 'restaurant_presentation') && (
                                            <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-white/80 shrink-0">
                                                <span>★</span> {item.rating || '5.0'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                                        {item.distance && <span>📍 {item.distance.toFixed(1)} km</span>}
                                        {(item.price_pln || item.price) && (
                                            <span>💰 {Number(item.price_pln || item.price).toFixed(2)} zł</span>
                                        )}
                                        {canDrag && <span className="ml-auto opacity-50">Swipe →</span>}
                                    </div>
                                </div>
                            ))}
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
                                <button
                                    onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                                    className="text-white/40 hover:text-white transition-colors text-xs"
                                >
                                    Pomniejsz
                                </button>
                            </div>

                            {/* Scrollable List */}
                            <div ref={scrollContainerRef} className="overflow-y-auto p-2 space-y-2 max-h-[40vh] tiny-scroll">
                                {presentationItems.map((item: any, idx: number) => (
                                    <motion.div
                                        key={getItemId(item) || idx}
                                        data-id={getItemId(item)}
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
                                            setHighlightedCardId(getItemId(item));
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
                                                {(item.price_pln || item.price)
                                                    ? `${Number(item.price_pln || item.price).toFixed(0)} zł`
                                                    : (item.rating ? `★ ${item.rating}` : '')}
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
                            className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-amber-400 w-3' : 'bg-white/20 w-1'}`}
                        />
                    ))}
                </div>
            )}
        </IslandWrapper>
    );
}
