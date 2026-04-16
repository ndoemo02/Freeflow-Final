import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useBottomSheetContext } from './sheet/BottomSheetContainer';
import SheetScrollable from './sheet/SheetScrollable';
import { SheetSnap } from './sheet/sheetTypes';
import { useIslandGestures } from '../hooks/useIslandGestures';
import RestaurantAvatar from './RestaurantAvatar';

/* ───────── types ───────── */
interface Section {
    key: string;
    label: string;
    order: number;
    items: any[];
}

interface MenuFlowViewProps {
    normalizedItems: any[];
    highlightedId: string | null;
    setHighlightedId: (id: string | null) => void;
    recommendedId?: string | null;
    headerTitle: string;
    resultSummary: string | null;
    currentIndex: number;
    onSelect: (item: any) => void;
    goTo: (targetIndex: number) => void;
    snap: SheetSnap;
    setSnap: (next: SheetSnap) => void;
    restaurantDistance?: number | null;
    restaurant?: any;
}

/* ───────── helpers ───────── */
const formatPrice = (item: any) => {
    const value = Number(item?.price_pln ?? item?.price ?? 0);
    return Number.isFinite(value) && value > 0 ? `${value.toFixed(2)} zł` : null;
};

const formatDistance = (distKm: number | null | undefined) => {
    if (distKm == null || !Number.isFinite(distKm) || distKm <= 0) return null;
    return distKm < 1
        ? `${Math.round(distKm * 1000)} m`
        : `${distKm.toFixed(1)} km`;
};

/* deterministic gradient from category string */
const CATEGORY_GRADIENTS: Record<string, string> = {};
function getCategoryGradient(category: string): string {
    if (CATEGORY_GRADIENTS[category]) return CATEGORY_GRADIENTS[category];
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = ((hash << 5) - hash + category.charCodeAt(i)) | 0;
    }
    const h1 = ((hash & 0xff) * 1.41) % 360;
    const h2 = (h1 + 40) % 360;
    const g = `linear-gradient(135deg, hsl(${h1},55%,8%), hsl(${h2},60%,18%))`;
    CATEGORY_GRADIENTS[category] = g;
    return g;
}

function buildSections(items: any[]): Section[] {
    const map = new Map<string, { items: any[]; minOrder: number }>();

    for (const item of items) {
        const key = item.category || 'Inne';
        if (!map.has(key)) {
            map.set(key, { items: [], minOrder: Number(item.section_order ?? 999) });
        }
        const entry = map.get(key)!;
        entry.items.push(item);
        entry.minOrder = Math.min(entry.minOrder, Number(item.section_order ?? 999));
    }

    return Array.from(map.entries())
        .map(([key, { items: sectionItems, minOrder }]) => ({
            key,
            label: key,
            order: minOrder,
            items: sectionItems,
        }))
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'pl'));
}

function getBadges(item: any): string[] {
    const badges: string[] = [];
    if (item?.is_vege) badges.push('🌿 Vege');
    if (item?.spicy) badges.push('🌶️ Ostre');
    if (Array.isArray(item?.dietary_flags)) {
        for (const f of item.dietary_flags) {
            if (f === 'gluten_free') badges.push('🚫🌾 Bez glutenu');
            if (f === 'vegan') badges.push('🌱 Vegan');
            if (f === 'lactose_free') badges.push('🥛✕ Bez laktozy');
            if (f === 'halal') badges.push('☪️ Halal');
        }
    }
    return badges;
}

/* ───────── component ───────── */
export default function MenuFlowView({
    normalizedItems,
    highlightedId,
    setHighlightedId,
    recommendedId,
    headerTitle,
    resultSummary,
    currentIndex,
    onSelect,
    goTo,
    snap,
    setSnap,
    restaurantDistance,
    restaurant,
}: MenuFlowViewProps) {
    const { boundary } = useBottomSheetContext();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [focusedId, setFocusedId] = useState<string | null>(() => {
        // Use display-order first item, not raw array order (backend order ≠ display order)
        const secs = buildSections(normalizedItems);
        return secs[0]?.items[0]?._uiId ?? normalizedItems[0]?._uiId ?? null;
    });
    const [activeChip, setActiveChip] = useState<string | null>(null);
    const manualFocusAt = useRef<number>(Date.now()); // grace period after click/voice/IO commit
    const menuEnteredAt = useRef<number>(Date.now()); // tracks last menu entry for highlightedId guard

    /* ── hero collapse: add island-full-list so hero shrinks to header on entry ── */
    useEffect(() => {
        const root = document.querySelector('.freeflow');
        if (!root) return;
        root.classList.add('island-full-list');
        return () => root.classList.remove('island-full-list');
    }, []);

    /* ── reset scroll + focus to first item when menu items change (new restaurant) ── */
    useEffect(() => {
        if (!normalizedItems.length) return;
        // Use display-sorted first item (buildSections sorts by section_order)
        const secs = buildSections(normalizedItems);
        const firstId = secs[0]?.items[0]?._uiId ?? normalizedItems[0]._uiId;
        menuEnteredAt.current = Date.now();
        manualFocusAt.current = Date.now();
        setFocusedId(firstId);
        setActiveChip(null);
        const scrollEl = scrollContainerRef.current?.closest('.list-scroll') as HTMLElement | null;
        if (scrollEl) scrollEl.scrollTop = 0;
    }, [normalizedItems]);

    /* ── menu stays expanded — block snap collapse from swipe gesture ── */
    const menuSetSnap = useCallback((next: SheetSnap) => {
        if (next === 'expanded') setSnap(next);
        // ignore peek/closed — menu is always full-screen
    }, [setSnap]);

    const gestures = useIslandGestures({
        snap,
        setSnap: menuSetSnap,
        currentIndex,
        goTo,
        isExpanded: true,
        atTop: boundary.atTop,
    });

    /* ── sections from data ── */
    const sections = useMemo(() => buildSections(normalizedItems), [normalizedItems]);

    /* ── chips list ── */
    const chips = useMemo(() => sections.map(s => ({ key: s.key, label: s.label })), [sections]);
    const showChips = chips.length > 1;

    const expandedSafeBottom = 'calc(env(safe-area-inset-bottom) + 500px)';

    /* ── topmost-visible focus picker ──
     *
     * Focus panel jest fixed nad listą. Focus = pierwszy item w DOM order
     * którego dolna krawędź jest poniżej górnej krawędzi scroll viewportu.
     * Bez scroll-snap, bez scroll-correction — czysty read-only scroll.
     * ── */
    useEffect(() => {
        const innerDiv = scrollContainerRef.current;
        if (!innerDiv) return;
        const scrollEl = innerDiv.closest('.list-scroll') as HTMLElement | null;
        if (!scrollEl) return;

        let debounceId: ReturnType<typeof setTimeout> | null = null;

        const commitFocus = () => {
            if (Date.now() - manualFocusAt.current < 300) return;
            const containerTop = scrollEl.getBoundingClientRect().top;
            // Sticky section header occludes ~34px at top. Find the currently pinned
            // header (rect.top pinned at containerTop) and use its bottom as threshold.
            let effectiveTop = containerTop + 4;
            sectionRefs.current.forEach((headerEl) => {
                const hr = headerEl.getBoundingClientRect();
                // A sticky header is "pinned" when its top sits at containerTop.
                if (Math.abs(hr.top - containerTop) < 1 && hr.bottom > effectiveTop) {
                    effectiveTop = hr.bottom;
                }
            });
            for (const [uid, el] of itemRefs.current) {
                const r = el.getBoundingClientRect();
                if (r.bottom > effectiveTop) {
                    setFocusedId((prev) => (prev === uid ? prev : uid));
                    return;
                }
            }
        };

        const onScroll = () => {
            if (debounceId !== null) clearTimeout(debounceId);
            debounceId = setTimeout(commitFocus, 60);
        };

        scrollEl.addEventListener('scroll', onScroll, { passive: true });
        commitFocus();

        return () => {
            scrollEl.removeEventListener('scroll', onScroll);
            if (debounceId !== null) clearTimeout(debounceId);
        };
    }, [normalizedItems]);

    /* ── voice-driven focus: highlight bez konfliktu ze scrollem ── */
    useEffect(() => {
        if (!highlightedId) return;
        // Blokujemy AI-recommendation przez 1000ms od wejścia w menu —
        // AI może wspomnieć produkt w opisie restauracji, to nie powinno przeskakiwać focusu.
        if (Date.now() - menuEnteredAt.current < 1000) return;
        manualFocusAt.current = Date.now();
        setFocusedId((prev) => (prev === highlightedId ? prev : highlightedId));
        const el = itemRefs.current.get(highlightedId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [highlightedId]);

    /* ── sticky header intersection for active chip ── */
    useEffect(() => {
        if (!showChips) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const sectionKey = (entry.target as HTMLElement).dataset.section;
                        if (sectionKey) setActiveChip(sectionKey);
                    }
                }
            },
            {
                root: scrollContainerRef.current?.closest('.list-scroll') || null,
                rootMargin: '-10% 0px -80% 0px',
                threshold: 0.1,
            },
        );

        sectionRefs.current.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [showChips, sections]);

    /* ── chip click → scroll to section ── */
    const scrollToSection = useCallback((key: string) => {
        const el = sectionRefs.current.get(key);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveChip(key);
        }
    }, []);

    /* ── focused item + display data (computed at component level for focus panel) ── */
    const focusedItem = useMemo(
        () => normalizedItems.find((i: any) => i._uiId === focusedId) || null,
        [normalizedItems, focusedId],
    );

    const focusedDisplay = useMemo(() => {
        if (!focusedItem) return null;
        const price = formatPrice(focusedItem);
        const badges = getBadges(focusedItem);
        const bannerGradient = getCategoryGradient(focusedItem.category || 'Inne');
        let imageSrc: string | null =
            focusedItem.image_url || focusedItem.photo_url || focusedItem.img || null;
        if (!imageSrc && restaurant?.photo_gallery?.length) {
            const hash = String(focusedItem.name || '')
                .split('')
                .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
            imageSrc = restaurant.photo_gallery[hash % restaurant.photo_gallery.length];
        }
        return { price, badges, bannerGradient, imageSrc };
    }, [focusedItem, restaurant]);

    /* ── distance label ── */
    const distanceLabel = formatDistance(restaurantDistance);

    /* ── subtitle builder ── */
    const subtitleParts: string[] = [];
    if (resultSummary) subtitleParts.push(resultSummary);
    if (distanceLabel) subtitleParts.push(distanceLabel);
    const finalSubtitle = subtitleParts.length > 0 ? subtitleParts.join(' · ') : null;

    return (
        /* ── ALWAYS EXPANDED: sectioned list ── */
        <div className="flex h-full min-h-0 flex-1 flex-col text-white">
            {/* header */}
            <div className="px-4 pt-3 pb-2 shrink-0">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/78 leading-none mb-1.5">{headerTitle}</div>
                        <div className="text-[15px] font-bold text-white/95 leading-tight truncate">
                            {restaurant?.name || 'Karta dań'}
                        </div>
                    </div>
                    {restaurant && (
                        <div className="flex shrink-0 items-center justify-center overflow-hidden h-9 w-9 bg-white/5 rounded-lg border border-white/10">
                            <RestaurantAvatar item={restaurant} size={36} />
                        </div>
                    )}
                </div>
                
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                    {restaurant?.rating && (
                        <div className="flex items-center gap-0.5 text-amber-300 font-semibold">
                            ★ {Number(restaurant.rating).toFixed(1)}
                            {restaurant.ratings_total > 0 && <span className="text-white/30 font-normal ml-0.5">({restaurant.ratings_total})</span>}
                        </div>
                    )}
                    {(restaurant?.rating && finalSubtitle) && <span className="text-white/15">·</span>}
                    {finalSubtitle && <div className="text-white/50">{finalSubtitle}</div>}
                </div>
            </div>

            {/* section chips */}
            {showChips && (
                <div className="menu-flow-chips">
                    {chips.map((chip) => (
                        <button
                            type="button"
                            key={chip.key}
                            className={`menu-flow-chip ${activeChip === chip.key ? 'menu-flow-chip--active' : ''}`}
                            onClick={() => scrollToSection(chip.key)}
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>
            )}

            {/* fixed focus panel — expanded view of currently focused item */}
            {focusedItem && focusedDisplay && (
                <div className="mf-focus-panel">
                    <div
                        className="mf-card__banner"
                        style={{ background: focusedDisplay.bannerGradient }}
                    >
                        {focusedDisplay.imageSrc && (
                            <img
                                src={focusedDisplay.imageSrc}
                                alt={focusedItem.name}
                                className="mf-card__banner-img"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        )}
                        <div className="mf-card__banner-overlay" />
                        {focusedDisplay.price && (
                            <span className="mf-card__price-pill">{focusedDisplay.price}</span>
                        )}
                    </div>
                    <div className="mf-card__body">
                        <div className="mf-card__name">{focusedItem?.name || 'Pozycja menu'}</div>
                        {(focusedItem?.description || focusedItem?.ingredients) && (
                            <div className="mf-card__desc">
                                {focusedItem.description || focusedItem.ingredients}
                            </div>
                        )}
                        {focusedDisplay.badges.length > 0 && (
                            <div className="menu-flow-badges">
                                {focusedDisplay.badges.map((badge: string) => (
                                    <span key={badge} className="menu-flow-badge">{badge}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="mf-card__footer">
                        <button
                            type="button"
                            className="mf-card__add-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setHighlightedId(focusedItem._uiId);
                                onSelect(focusedItem);
                            }}
                        >
                            + Dodaj
                        </button>
                    </div>
                </div>
            )}

            {/* sectioned list */}
            <SheetScrollable
                className="list-scroll tiny-scroll min-h-0 flex-1 px-3"
                style={{ paddingBottom: expandedSafeBottom }}
                onTouchStart={gestures.handleSwipeStart}
                onTouchEnd={gestures.handleSwipeEnd}
            >
                        <div ref={scrollContainerRef}>
                            {sections.map((section) => (
                                <div key={section.key}>
                                    {/* sticky section header */}
                                    <div
                                        ref={(el) => { if (el) sectionRefs.current.set(section.key, el); }}
                                        data-section={section.key}
                                        className="menu-flow-sticky-header"
                                    >
                                        <span className="menu-flow-sticky-header__label">{section.label}</span>
                                        <span className="menu-flow-sticky-header__count">{section.items.length}</span>
                                    </div>

                                    {/* items — compact rows only; focus panel renders expanded view above */}
                                    {section.items.map((item, itemIndex) => {
                                        const isFocused = item._uiId === focusedId;
                                        const isRecommended = item._uiId === recommendedId;
                                        const price = formatPrice(item);
                                        const bannerGradient = getCategoryGradient(item.category || section.key);

                                        const handleClick = (event: React.MouseEvent) => {
                                            event.stopPropagation();
                                            manualFocusAt.current = Date.now();
                                            setFocusedId(item._uiId);
                                            const el = itemRefs.current.get(item._uiId);
                                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        };

                                        const rowClasses = [
                                            'mf-row w-full text-left',
                                            isFocused ? 'mf-row--is-focused' : '',
                                            isRecommended ? 'mf-row--recommended' : '',
                                        ].filter(Boolean).join(' ');

                                        return (
                                            <motion.button
                                                type="button"
                                                key={item._uiId}
                                                ref={(el) => { if (el) itemRefs.current.set(item._uiId, el as unknown as HTMLDivElement); }}
                                                data-uid={item._uiId}
                                                animate={{ opacity: 1 }}
                                                initial={{ opacity: 0 }}
                                                transition={{ duration: 0.15, delay: Math.min(itemIndex * 0.01, 0.06) }}
                                                onClick={handleClick}
                                                className={rowClasses}
                                            >
                                                <div
                                                    className="mf-row__thumb"
                                                    style={{ background: bannerGradient }}
                                                />
                                                <div className="mf-row__info">
                                                    <div className="mf-row__name">{item?.name || 'Pozycja menu'}</div>
                                                    <div className="mf-row__meta">
                                                        {item?.description
                                                            ? item.description.slice(0, 55) + (item.description.length > 55 ? '…' : '')
                                                            : item?.ingredients || ''}
                                                    </div>
                                                </div>
                                                {price && (
                                                    <div className="mf-row__right">
                                                        <div className="mf-row__price">{price}</div>
                                                    </div>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
            </SheetScrollable>
        </div>
    );
}
