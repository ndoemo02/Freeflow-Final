import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUI } from '../state/ui';
import IslandWrapper from './IslandWrapper';

interface ContextualIslandProps {
    items: any[];
    type: 'restaurant' | 'menu';
    position: 'left' | 'right';
    onSelect: (item: any) => void;
    highlightedId: string | null;
    setHighlightedId: (id: string | null) => void;
    onClose?: () => void;
}

export default function ContextualIsland({
    items,
    type,
    position,
    onSelect,
    highlightedId,
    setHighlightedId,
    onClose
}: ContextualIslandProps) {
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
                console.log(`[ContextualIsland ${type}] containerWidth measured:`, w);
                setContainerWidth(w);
            } else if (retries < 10) {
                retries++;
                setTimeout(measure, 100);
            } else {
                const fallback = 256;
                console.log(`[ContextualIsland ${type}] fallback containerWidth:`, fallback);
                setContainerWidth(fallback);
            }
        };

        const timeout = setTimeout(measure, 50);
        const observer = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect.width || 0;
            if (w > 0) {
                console.log(`[ContextualIsland ${type}] ResizeObserver width:`, w);
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

    // Sync scroll when highlightedId changes in expanded mode
    useEffect(() => {
        if (expanded && highlightedId && scrollContainerRef.current) {
            const activeElement = scrollContainerRef.current.querySelector(`[data-id="${highlightedId}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedId, expanded]);

    if (!items || items.length === 0) {
        return null;
    }

    // Helper: get item ID (supports both restaurant and menu items)
    const getItemId = (item: any) => item.id || item.menuItemId || String(Math.random());

    const activeIndex = items.findIndex(
        (i: any) => getItemId(i) === highlightedId
    );
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;

    const goTo = useCallback((targetIndex: number) => {
        // Clamp: never jump more than ±1, never go out of bounds
        const clamped = Math.max(0, Math.min(items.length - 1, targetIndex));
        setHighlightedId(getItemId(items[clamped]));
    }, [currentIndex, items, setHighlightedId]);

    const next = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
    const prev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

    // ─── Drag handler with velocity + offset logic ───────────────────────────
    const handleDragEnd = useCallback((_event: any, info: any) => {
        const OFFSET_THRESHOLD = 50;
        const VELOCITY_THRESHOLD = 800;

        const vx = info.velocity.x;
        const ox = info.offset.x;

        console.log(`[ContextualIsland] onDragEnd fired for ${type}: vx=${vx}, ox=${ox}`);

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
    }, [currentIndex, goTo, type]);

    const canDrag = items.length > 1;

    return (
        <IslandWrapper
            expanded={expanded}
            setExpanded={setExpanded}
            onSwipeNext={next}
            onSwipePrev={prev}
            onClose={onClose}
            position={position}
            className={type === 'menu' ? 'z-[60]' : 'z-40'}
        >
            {/* Content Container */}
            <div className={`relative flex flex-col h-full ${expanded ? 'max-h-[60vh]' : ''}`}>

                {/* DEV Overlay (Requested by User) */}
                <div className="absolute top-0 right-0 p-1 text-[8px] font-mono text-cyan-400 bg-black/60 rounded-bl-md z-50 pointer-events-none border-b border-l border-white/20">
                    type: {type}<br />
                    items: {items.length}<br />
                    currIdx: {currentIndex}<br />
                    id: {String(highlightedId).slice(0, 8)}...
                </div>

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
                            style={{ width: `${containerWidth * items.length}px` }}
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
                            {items.map((item: any, idx: number) => (
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
                                                {item.cuisine_type || item.category || (type === 'restaurant' ? 'Restauracja' : 'Danie')}
                                            </p>
                                        </div>
                                        {(item.rating || type === 'restaurant') && (
                                            <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-white/80 shrink-0">
                                                <span>★</span> {item.rating || '5.0'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                                        {item.distance && <span>📍 {typeof item.distance === 'number' ? item.distance.toFixed(1) : item.distance} km</span>}
                                        {(item.price_pln || item.price) && (
                                            <span>💰 {Number(item.price_pln || item.price).toFixed(2)} zł</span>
                                        )}
                                        {canDrag && <span className="ml-auto opacity-50">Swipe →</span>}
                                    </div>

                                    {/* Wybierz button (optional visual cue when not dragging, or we can just rely on onSelect) */}
                                    {idx === currentIndex && (
                                        <motion.button
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-3 w-full bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold py-2 rounded-xl transition-colors pointer-events-auto"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect(item);
                                            }}
                                        >
                                            {type === 'restaurant' ? 'Wybierz' : 'Dodaj do zamówienia'}
                                        </motion.button>
                                    )}

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
                                    {type === 'restaurant' ? 'Wszystkie Restauracje' : 'Karta Menu'}
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
                                {items.map((item: any, idx: number) => (
                                    <motion.div
                                        key={getItemId(item)}
                                        data-id={getItemId(item)}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                                        className={`
                                            group p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center gap-3
                                            ${(getItemId(item) === highlightedId)
                                                ? 'bg-amber-500/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                                : 'bg-white/5 border-white/5 hover:bg-white/10'}
                                        `}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setHighlightedId(getItemId(item));
                                            onSelect(item);
                                        }}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-semibold truncate ${item.available === false ? 'text-white/30' : 'text-white'}`}>{item.name}</div>
                                            <div className="text-[10px] text-white/50 truncate">
                                                {item.cuisine_type || item.category || (type === 'restaurant' ? (item.city || item.address) : item.description)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className={`text-xs font-mono font-bold ${item.available === false ? 'text-white/20' : 'text-amber-400'}`}>
                                                {(item.price_pln || item.price)
                                                    ? `${Number(item.price_pln || item.price).toFixed(2)} zł`
                                                    : (item.rating ? `★ ${item.rating}` : '')}
                                            </div>
                                            {item.available === false ? (
                                                <span className="text-[9px] text-red-500/70 border border-red-500/20 px-1 py-0.5 rounded-sm">Brak</span>
                                            ) : (
                                                <button
                                                    className="opacity-0 group-hover:opacity-100 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded-full transition-all"
                                                    onClick={(e) => { e.stopPropagation(); onSelect(item); }}
                                                >
                                                    {type === 'restaurant' ? 'Wybierz' : 'Wybierz'}
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Scroll Indicator Dots (only when collapsed) */}
            {items.length > 1 && !expanded && (
                <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1 p-1">
                    {items.map((_: any, idx: number) => (
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
