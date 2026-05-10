import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/* ───────── types ───────── */

/** Normalized menu item – mirrors the shape coming from the conversation store / backend. */
export interface NormalizedDishItem {
  _uiId: string;
  id?: string;
  name: string;
  description?: string;
  ingredients?: string;
  category?: string;
  section_order?: number;
  price_pln?: number;
  price?: number;
  image_url?: string;
  photo_url?: string;
  img?: string;
  is_vege?: boolean;
  spicy?: boolean;
  item_tags?: string[];
  dietary_flags?: string[];
  [key: string]: unknown;
}

export interface DishMenuViewProps {
  items: NormalizedDishItem[];
  restaurant: { name: string; city?: string; photo_gallery?: string[] };
  initialFocusId?: string;
  onClose: () => void;
  onAddToCart: (item: NormalizedDishItem) => void;
}

/* ───────── helpers (ported from MenuFlowView) ───────── */

interface Section {
  key: string;
  label: string;
  order: number;
  items: NormalizedDishItem[];
}

function buildSections(items: NormalizedDishItem[]): Section[] {
  const map = new Map<string, { items: NormalizedDishItem[]; minOrder: number }>();

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

const formatPrice = (item: NormalizedDishItem): string | null => {
  const value = Number(item?.price_pln ?? item?.price ?? 0);
  return Number.isFinite(value) && value > 0 ? `${value.toFixed(2)} zł` : null;
};

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

function getBadges(item: NormalizedDishItem): string[] {
  const badges: string[] = [];
  if (item?.is_vege) badges.push('🌿 Vege');
  if (item?.spicy) badges.push('🌶 Pikantne');
  const rawTags = Array.isArray(item?.item_tags) ? item.item_tags : [];
  for (const tag of rawTags) {
    const t = String(tag || '').trim().toLowerCase();
    if (!t) continue;
    if ((t === 'vege' || t === 'wege' || t === 'wegetariańskie') && !badges.some(b => b.includes('Vege'))) badges.push('🌿 Vege');
    else if ((t === 'spicy' || t === 'ostre' || t === 'pikantne') && !badges.some(b => b.includes('Pikantne'))) badges.push('🌶 Pikantne');
    else if ((t === 'gluten_free' || t === 'bezglutenowe') && !badges.some(b => b.includes('glutenu'))) badges.push('🚫🌾 Bez glutenu');
    else if ((t === 'vegan' || t === 'wegańskie') && !badges.some(b => b.includes('Vegan'))) badges.push('🌱 Vegan');
    else if ((t === 'lactose_free' || t === 'bez laktozy') && !badges.some(b => b.includes('laktozy'))) badges.push('🥛✕ Bez laktozy');
    else if (t === 'halal' && !badges.some(b => b.includes('Halal'))) badges.push('☪️ Halal');
  }
  if (Array.isArray(item?.dietary_flags)) {
    for (const f of item.dietary_flags) {
      const t = String(f || '').trim().toLowerCase();
      if (t === 'gluten_free' && !badges.some(b => b.includes('glutenu'))) badges.push('🚫🌾 Bez glutenu');
      else if (t === 'vegan' && !badges.some(b => b.includes('Vegan'))) badges.push('🌱 Vegan');
      else if (t === 'lactose_free' && !badges.some(b => b.includes('laktozy'))) badges.push('🥛✕ Bez laktozy');
      else if (t === 'halal' && !badges.some(b => b.includes('Halal'))) badges.push('☪️ Halal');
    }
  }
  return badges;
}

function resolveImage(item: NormalizedDishItem, gallery?: string[]): string | null {
  let src: string | null = item.image_url || item.photo_url || item.img || null;
  if (!src) src = getLocalFallbackImage(item.category || '', item.name || '');
  if (!src && gallery?.length) {
    const hash = (item.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    src = gallery[hash % gallery.length];
  }
  return src;
}

/* ───────── animation variants ───────── */

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

const listContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
} as const;

/* ───────── component ───────── */

export default function DishMenuView({
  items,
  restaurant,
  initialFocusId,
  onClose,
  onAddToCart,
}: DishMenuViewProps) {
  /* ── state ── */
  const [focusedId, setFocusedId] = useState<string>(() => {
    if (initialFocusId) return initialFocusId;
    const secs = buildSections(items);
    return secs[0]?.items[0]?._uiId ?? items[0]?._uiId ?? '';
  });
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ── derived data ── */
  const sections = useMemo(() => buildSections(items), [items]);
  const chips = useMemo(() => sections.map(s => ({ key: s.key, label: s.label })), [sections]);

  const focusedItem = useMemo(
    () => items.find(i => i._uiId === focusedId) ?? items[0] ?? null,
    [items, focusedId],
  );

  const heroImage = useMemo(
    () => (focusedItem ? resolveImage(focusedItem, restaurant.photo_gallery) : null),
    [focusedItem, restaurant.photo_gallery],
  );

  /* ── chip click → scroll to section ── */
  const scrollToSection = useCallback((key: string) => {
    const el = sectionRefs.current.get(key);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveChip(key);
    }
  }, []);

  /* ── intersection observer for active chip ── */
  useEffect(() => {
    if (chips.length <= 1) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionKey = (entry.target as HTMLElement).dataset.section;
            if (sectionKey) setActiveChip(sectionKey);
          }
        }
      },
      { root: scrollRef.current, rootMargin: '-10% 0px -80% 0px', threshold: 0.1 },
    );
    sectionRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [chips, sections]);

  /* ── keyboard escape ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* ── render helpers ── */
  const heroPrice = focusedItem ? formatPrice(focusedItem) : null;
  const heroBadges = focusedItem ? getBadges(focusedItem) : [];
  const heroGradient = getCategoryGradient(focusedItem?.category || 'Inne');

  return (
    <AnimatePresence>
      {/* fullscreen overlay */}
      <motion.div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ backgroundColor: '#050810' }}
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className="flex h-full flex-col"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        >
          {/* ── Header ── */}
          <div className="sticky top-0 z-20 flex items-center px-4 py-3" style={{ backgroundColor: '#050810' }}>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-white truncate">{restaurant.name}</div>
              {restaurant.city && (
                <div className="text-xs text-white/50">{restaurant.city}</div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20"
              aria-label="Zamknij"
            >
              ✕
            </button>
          </div>

          {/* ── Hero Card ── */}
          <AnimatePresence mode="wait">
            {focusedItem && (
              <motion.div
                key={focusedId}
                layoutId={`dish-card-${focusedItem._uiId}`}
                className="relative h-[200px] w-full overflow-hidden shrink-0"
                style={{ background: heroGradient }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {heroImage && (
                  <img
                    src={heroImage}
                    alt={focusedItem.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                {/* gradient overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#050810] via-[#050810]/60 to-transparent" />

                {/* content overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-white leading-tight truncate">
                        {focusedItem.name}
                      </h2>
                      {(focusedItem.description || focusedItem.ingredients) && (
                        <p className="mt-0.5 text-sm text-white/70 line-clamp-2">
                          {focusedItem.description || focusedItem.ingredients}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {heroBadges.map(b => (
                          <span key={b} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/80">{b}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {heroPrice && (
                        <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-400">
                          {heroPrice}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onAddToCart(focusedItem)}
                        className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-transform active:scale-95"
                      >
                        + Dodaj
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Category Chips ── */}
          {chips.length > 1 && (
            <div className="sticky top-[52px] z-10 flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar" style={{ backgroundColor: '#050810' }}>
              {chips.map(chip => {
                const isActive = activeChip === chip.key;
                return (
                  <motion.button
                    type="button"
                    key={chip.key}
                    onClick={() => scrollToSection(chip.key)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-orange-500 border border-orange-500 text-white'
                        : 'border border-white/10 text-white/60 hover:bg-white/[0.06]'
                    }`}
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    {chip.label}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* ── Sectioned List ── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 pb-[env(safe-area-inset-bottom)]">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={listContainerVariants}
            >
              {sections.map(section => (
                <div key={section.key} className="mb-4">
                  {/* section header */}
                  <div
                    ref={el => { if (el) sectionRefs.current.set(section.key, el); }}
                    data-section={section.key}
                    className="sticky top-0 z-[5] py-2 text-xs font-bold uppercase tracking-wider text-white/40"
                    style={{ backgroundColor: '#050810' }}
                  >
                    {section.label}
                  </div>

                  {/* items */}
                  <div className="flex flex-col gap-1.5">
                    {section.items.map(item => {
                      const price = formatPrice(item);
                      const isFocused = item._uiId === focusedId;
                      const thumbSrc = resolveImage(item, restaurant.photo_gallery);
                      const gradient = getCategoryGradient(item.category || section.key);

                      return (
                        <motion.button
                          type="button"
                          key={item._uiId}
                          layoutId={`dish-card-${item._uiId}`}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          onClick={() => setFocusedId(item._uiId)}
                          className={`flex w-full gap-3 rounded-xl p-3 text-left transition-colors ${
                            isFocused
                              ? 'bg-white/[0.08] border border-orange-500/30'
                              : 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07]'
                          }`}
                        >
                          {/* thumbnail 56×56 */}
                          <div
                            className="h-14 w-14 shrink-0 overflow-hidden rounded-xl"
                            style={{ background: gradient }}
                          >
                            {thumbSrc && (
                              <img
                                src={thumbSrc}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                          </div>

                          {/* info */}
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <div className="text-sm font-medium text-white truncate">
                              {item.name || 'Pozycja menu'}
                            </div>
                            {(item.description || item.ingredients) && (
                              <div className="text-xs text-white/50 line-clamp-2 mt-0.5">
                                {item.description || item.ingredients}
                              </div>
                            )}
                          </div>

                          {/* price pill */}
                          {price && (
                            <div className="flex shrink-0 items-center">
                              <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400">
                                {price}
                              </span>
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
