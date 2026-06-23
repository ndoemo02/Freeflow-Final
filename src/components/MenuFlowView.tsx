import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useBottomSheetContext } from './sheet/BottomSheetContainer';
import SheetScrollable from './sheet/SheetScrollable';
import { SheetSnap } from './sheet/sheetTypes';
import { useIslandGestures } from '../hooks/useIslandGestures';
import RestaurantAvatar from './RestaurantAvatar';
import { useUI } from '../state/ui';
import { useCart } from '../state/CartContext';
import { useConversationStore } from '../store/useConversationStore';
import { useIslandFullList } from '../hooks/useIslandFullList';

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
    autoRevealRequest?: { id: string; seq: number } | null;
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

const formatOpeningHours = (raw: any): string | null => {
    if (!raw) return null;

    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return null;
        return trimmed;
    }

    if (Array.isArray(raw)) {
        const first = raw.map((entry) => String(entry || '').trim()).find(Boolean);
        return first || null;
    }

    if (typeof raw === 'object') {
        const direct = [
            raw.today,
            raw.current_day,
            raw.currentDay,
            raw.display,
            raw.hours,
            raw.text,
        ]
            .map((entry) => String(entry || '').trim())
            .find(Boolean);
        if (direct) return direct;

        if (raw.open_now === true || raw.openNow === true) {
            const closeAt = String(raw.close_at || raw.closeAt || '').trim();
            return closeAt ? `otwarte do ${closeAt}` : 'otwarte';
        }

        if (raw.open_now === false || raw.openNow === false) {
            return 'zamknięte';
        }
    }

    return null;
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
    // Top-level boolean flags
    if (item?.is_vege) badges.push('🌿 Vege');
    if (item?.spicy) badges.push('Pikantne');
    // item_tags array: freeform tags from DB (e.g. "VEGE", "spicy", "gluten_free")
    const rawTags = Array.isArray(item?.item_tags) ? item.item_tags : [];
    for (const tag of rawTags) {
        const t = String(tag || '').trim().toLowerCase();
        if (!t) continue;
        if (t === 'vege' || t === 'wege' || t === 'wegetariańskie') {
            if (!badges.some((b) => b.toLowerCase().includes('vege'))) badges.push('🌿 Vege');
        } else if (t === 'spicy' || t === 'ostre' || t === 'pikantne') {
            if (!badges.some((b) => b.toLowerCase().includes('pikantne'))) badges.push('Pikantne');
        } else if (t === 'gluten_free' || t === 'bezglutenowe') {
            if (!badges.some((b) => b.toLowerCase().includes('glutenu'))) badges.push('🚫🌾 Bez glutenu');
        } else if (t === 'vegan' || t === 'wegańskie') {
            if (!badges.some((b) => b.toLowerCase().includes('vegan'))) badges.push('🌱 Vegan');
        } else if (t === 'lactose_free' || t === 'bez laktozy') {
            if (!badges.some((b) => b.toLowerCase().includes('laktozy'))) badges.push('🥛✕ Bez laktozy');
        } else if (t === 'halal') {
            if (!badges.some((b) => b.toLowerCase().includes('halal'))) badges.push('☪️ Halal');
        }
    }
    // dietary_flags array: structured dietary metadata
    if (Array.isArray(item?.dietary_flags)) {
        for (const f of item.dietary_flags) {
            const t = String(f || '').trim().toLowerCase();
            if (!t) continue;
            if (t === 'gluten_free') badges.push('🚫🌾 Bez glutenu');
            else if (t === 'vegan') badges.push('🌱 Vegan');
            else if (t === 'lactose_free') badges.push('🥛✕ Bez laktozy');
            else if (t === 'halal') badges.push('☪️ Halal');
        }
    }
    return badges;
}

function getLocalFallbackImage(category: string, name: string): string | null {
    const text = (`${category} ${name}`).toLowerCase();
    if (text.includes('burger')) return '/images/assets/gen/burger.png';
    if (text.includes('pizza')) return '/images/assets/gen/pizza.png';
    if (text.includes('bowl')) return '/images/assets/gen/bowl.png';
    if (text.includes('schabow')) return '/images/assets/gen/schabowy.png';
    if (text.includes('rollo') || text.includes('kebab') || text.includes('wrap')) return '/images/assets/gen/rollo.png';
    if (text.includes('makaron') || text.includes('pasta') || text.includes('spaghetti')) return '/images/assets/gen/pasta.png';
    if (text.includes('sałatk') || text.includes('salatk')) return '/images/assets/gen/salad.png';
    if (text.includes('pomidorow') || text.includes('krem z pomidor')) return '/images/assets/gen/zupa_pomidorowa.png';
    if (text.includes('deser') || text.includes('lod') || text.includes('ciast') || text.includes('tiramisu')) return '/images/assets/gen/dessert.png';
    if (text.includes('kaw') || text.includes('coffee') || text.includes('latte') || text.includes('espresso')) return '/images/assets/gen/kawa.png';
    if (text.includes('sushi') || text.includes('maki') || text.includes('nigiri')) return '/images/assets/gen/sushi.png';
    if (text.includes('ryba') || text.includes('łoso') || text.includes('loso') || text.includes('pstrąg')) return '/images/assets/gen/ryba.png';
    if (text.includes('naleśnik') || text.includes('nalesnik') || text.includes('plack') || text.includes('pancake')) return '/images/assets/gen/nalesniki.png';
    if (text.includes('pierog') || text.includes('pielmien')) return '/images/assets/gen/pierogi.png';
    if (text.includes('śniadanie') || text.includes('sniadanie') || text.includes('jaj') || text.includes('omlet') || text.includes('tost')) return '/images/assets/gen/sniadanie.png';
    if (text.includes('stek') || text.includes('steak') || text.includes('wołow')) return '/images/assets/gen/stek.png';
    if (text.includes('napój') || text.includes('napoj') || text.includes('col') || text.includes('wod') || text.includes('herbata') || text.includes('sok')) return '/images/assets/gen/napoj.png';
    return null;
}

/* ───────── component ───────── */
export default function MenuFlowView({
    normalizedItems,
    highlightedId,
    setHighlightedId,
    recommendedId,
    autoRevealRequest,
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
    const openDrawer = useUI((s) => s.openDrawer);
    const { itemCount, setIsOpen, restaurant: cartRestaurant } = useCart();
    const storeCurrentRestaurant = useConversationStore((s) => s.currentRestaurant);
    const pendingOrder = useConversationStore((s) => s.pendingOrder);

    const cartRestaurantName: string | undefined =
        typeof cartRestaurant === 'string' ? cartRestaurant : (cartRestaurant as any)?.name;
    const restaurantDisplayName =
        restaurant?.name
        || pendingOrder?.restaurant_name
        || cartRestaurantName
        || storeCurrentRestaurant?.name
        || storeCurrentRestaurant?.display_name
        || 'Karta dań';
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
    const lastAutoRevealSeqRef = useRef<number | null>(null);

    /* ── fullscreen class toggle: hide header + hide hero logo ── */
    const isFullscreen = snap === 'fullscreen';
    const isExpandedOrFs = snap === 'expanded' || isFullscreen;
    useIslandFullList(isExpandedOrFs);
    useEffect(() => {
        const root = document.querySelector('.freeflow');
        if (!root) return;
        root.classList.toggle('island-fullscreen', isFullscreen);
        return () => {
            root.classList.remove('island-fullscreen');
        };
    }, [isFullscreen]);

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

    /* ── menu stays expanded or fullscreen — block snap collapse from swipe gesture ── */
    const menuSetSnap = useCallback((next: SheetSnap) => {
        if (next === 'fullscreen' || next === 'expanded') setSnap(next);
        // ignore peek/closed — menu stays at least expanded
    }, [setSnap]);

    const gestures = useIslandGestures({
        snap,
        setSnap: menuSetSnap,
        currentIndex,
        goTo,
        isExpanded: snap === 'expanded' || snap === 'fullscreen',
        atTop: boundary.atTop,
    });

    /* ── sections from data ── */
    const sections = useMemo(() => buildSections(normalizedItems), [normalizedItems]);

    /* ── chips list ── */
    const chips = useMemo(() => sections.map(s => ({ key: s.key, label: s.label })), [sections]);
    const showChips = chips.length > 1;

    const expandedSafeBottom = 'calc(env(safe-area-inset-bottom) + 120px)';

    /* ── topmost-visible focus picker ──
     *
     * Uses SheetScrollable's onScroll prop (React event) instead of native
     * addEventListener — guarantees the handler fires on every scroll.
     * The scroll container ref is captured from event.currentTarget.
     * ── */
    const scrollElRef = useRef<HTMLElement | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const commitFocus = useCallback(() => {
        const scrollEl = scrollElRef.current;
        if (!scrollEl) return;
        if (Date.now() - manualFocusAt.current < 300) return;

        const containerTop = scrollEl.getBoundingClientRect().top;
        let effectiveTop = containerTop + 4;
        sectionRefs.current.forEach((headerEl) => {
            const hr = headerEl.getBoundingClientRect();
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
    }, []);

    const revealMenuRow = useCallback((el: HTMLElement) => {
        const scrollEl = scrollElRef.current || (el.closest('.list-scroll') as HTMLElement | null);
        if (!scrollEl) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        const scrollRect = scrollEl.getBoundingClientRect();
        const rowRect = el.getBoundingClientRect();
        const stickyOffset = 36;
        const safeTop = scrollRect.top + stickyOffset;
        const safeBottom = scrollRect.bottom - 12;

        if (rowRect.top < safeTop) {
            scrollEl.scrollBy({ top: rowRect.top - safeTop, behavior: 'smooth' });
        } else if (rowRect.bottom > safeBottom) {
            scrollEl.scrollBy({ top: rowRect.bottom - safeBottom, behavior: 'smooth' });
        }
    }, []);

    const handleListScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        scrollElRef.current = event.currentTarget;
        if (debounceRef.current !== null) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(commitFocus, 60);
    }, [commitFocus]);

    /* initial focus + cleanup */
    useEffect(() => {
        const innerDiv = scrollContainerRef.current;
        if (innerDiv?.parentElement) {
            scrollElRef.current = innerDiv.parentElement as HTMLElement;
            commitFocus();
        }
        return () => {
            if (debounceRef.current !== null) clearTimeout(debounceRef.current);
        };
    }, [normalizedItems, commitFocus]);

    const resolveUiId = useCallback((rawId: string | null | undefined): string | null => {
        if (!rawId) return null;
        const exact = normalizedItems.find((i: any) => i._uiId === rawId);
        if (exact) return exact._uiId;
        const suffix = normalizedItems.find((i: any) => i._uiId.endsWith(`__${rawId}`));
        return suffix?._uiId || null;
    }, [normalizedItems]);

    /* ── voice-driven focus: highlight bez konfliktu ze scrollem ── */
    useEffect(() => {
        if (!highlightedId) return;
        // Assistant focus must move immediately so the focus panel follows spoken dishes.
        // highlightedId may come from MenuIsland using raw item.id (no index prefix),
        // while _uiId now has "index__" prefix. Try exact match first, then suffix match.
        const matchedUiId = resolveUiId(highlightedId);
        if (!matchedUiId) return;
        manualFocusAt.current = Date.now();
        setFocusedId((prev) => (prev === matchedUiId ? prev : matchedUiId));

        const shouldReveal = autoRevealRequest
            && autoRevealRequest.seq !== lastAutoRevealSeqRef.current
            && resolveUiId(autoRevealRequest.id) === matchedUiId;
        if (shouldReveal) {
            lastAutoRevealSeqRef.current = autoRevealRequest.seq;
            const el = itemRefs.current.get(matchedUiId);
            if (el) {
                revealMenuRow(el);
            }
        }
    }, [highlightedId, autoRevealRequest, revealMenuRow, resolveUiId]);

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
            
        // Use smart fallback if no direct image is available
        if (!imageSrc) {
            imageSrc = getLocalFallbackImage(focusedItem.category || '', focusedItem.name || '');
        }
            
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
    const cityLabel = String(restaurant?.city || '').trim() || null;
    const openingHoursLabel = formatOpeningHours(restaurant?.opening_hours);
    const finalSubtitle = cityLabel || resultSummary || null;
    const rightMetaParts = [openingHoursLabel, distanceLabel].filter(Boolean);
    const rightMeta = rightMetaParts.length > 0 ? rightMetaParts.join(' · ') : null;

    return (
        /* ── ALWAYS EXPANDED: sectioned list ── */
        <div className="flex h-full min-h-0 flex-1 flex-col text-white">
            {/* header */}
            <div className={`shrink-0 ${snap === 'fullscreen' ? 'menu-fullscreen-header px-4 pb-2' : 'px-3 pt-1 pb-1'}`}>
                {snap === 'fullscreen' ? (
                    /* Fullscreen: hamburger + restaurant name + cart + avatar */
                    <div className="flex items-center justify-between gap-3">
                        <button
                            onClick={openDrawer}
                            className="p-2 -ml-1 bg-white/10 rounded-full hover:bg-white/20 transition"
                            aria-label="Otwórz menu"
                        >
                            <i className="fas fa-bars text-white" />
                        </button>
                        <div className="min-w-0 flex-1 text-center">
                            <div className="text-[18px] sm:text-[20px] font-extrabold text-white leading-[1.15] truncate tracking-tight">
                                {restaurantDisplayName}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {itemCount > 0 && (
                                <button
                                    onClick={() => setIsOpen(true)}
                                    className="relative p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
                                    aria-label={`Otwórz koszyk (${itemCount})`}
                                >
                                    <i className="fas fa-shopping-cart text-white" />
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-[10px] leading-[18px] font-bold text-white text-center">
                                        {itemCount}
                                    </span>
                                </button>
                            )}
                            {restaurant && (
                                <div className="flex shrink-0 items-center justify-center overflow-hidden h-8 w-8 bg-white/5 rounded-lg border border-white/10">
                                    <RestaurantAvatar item={restaurant} size={32} />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Non-fullscreen: restaurant name + subtitle + avatar */
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-[26px] sm:text-[30px] font-extrabold text-white leading-[1.02] truncate tracking-tight drop-shadow-[0_1px_10px_rgba(255,255,255,0.14)]">
                                {restaurantDisplayName}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-white/62">
                                {finalSubtitle && <div className="truncate">{finalSubtitle}</div>}
                                {rightMeta && finalSubtitle && <span className="text-white/22">•</span>}
                                {rightMeta && <div className="truncate text-white/50">{rightMeta}</div>}
                            </div>
                        </div>
                        {restaurant && (
                            <div className="flex shrink-0 items-center justify-center overflow-hidden h-10 w-10 bg-white/5 rounded-xl border border-white/10">
                                <RestaurantAvatar item={restaurant} size={40} />
                            </div>
                        )}
                    </div>
                )}
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
                    <motion.div
                        className="mf-card__banner"
                        style={{ background: focusedDisplay.bannerGradient }}
                        key={focusedId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
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
                        {focusedItem._uiId === recommendedId && (
                            <div className="mf-card__status-chip" aria-label="Amber poleca to danie">
                                <span className="mf-card__status-dot" aria-hidden="true" />
                                Amber poleca
                            </div>
                        )}
                        {focusedDisplay.price && (
                            <span className="mf-card__price-pill">{focusedDisplay.price}</span>
                        )}
                    </motion.div>
                    <motion.div
                        className="mf-card__body"
                        key={`body-${focusedId}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut', delay: 0.04 }}
                    >
                        <div className="mf-card__name">{focusedItem?.name || 'Pozycja menu'}</div>
                        {(focusedItem?.description || focusedItem?.ingredients) && (
                            <div className="mf-card__desc">
                                {focusedItem.description || focusedItem.ingredients}
                            </div>
                        )}
                    </motion.div>
                    <div className="mf-card__footer">
                        {/* badges: left side — diet flags */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {focusedDisplay.badges.map((badge: string) => (
                                <span key={badge} className="menu-flow-badge">{badge}</span>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="mf-card__add-btn shrink-0"
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
                className="list-scroll tiny-scroll min-h-0 flex-1 px-[10px]"
                style={{ paddingBottom: expandedSafeBottom }}
                onScroll={handleListScroll}
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
                                    setHighlightedId(item._uiId);
                                    const el = itemRefs.current.get(item._uiId);
                                    if (el) revealMenuRow(el);
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
                                        >
                                            {(() => {
                                                const thumbSrc = item.image_url || item.photo_url || item.img
                                                    || getLocalFallbackImage(item.category || '', item.name || '');
                                                return thumbSrc ? (
                                                    <img
                                                        src={thumbSrc}
                                                        alt=""
                                                        className="mf-row__thumb-img"
                                                        loading="lazy"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                ) : null;
                                            })()}
                                        </div>
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
