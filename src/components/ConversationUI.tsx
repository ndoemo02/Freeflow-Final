import React, { useEffect, useMemo } from 'react';
import { useConversationUIState } from '../hooks/useConversationUIState';
import { useConversationStore } from '../store/useConversationStore';
import { motion, AnimatePresence } from 'framer-motion';
import CinematicRestaurantCarousel from './CinematicRestaurantCarousel';
import FreeFlowWordmark, { FreeFlowWordmarkVariant } from './FreeFlowWordmark';

// Available variants: 'clean-premium' | 'neon-soft-glow' | 'closest-to-logo'
const MENU_WORDMARK_VARIANT: FreeFlowWordmarkVariant = 'closest-to-logo';

function normalizeText(value: string = '') {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeId(value: unknown): string {
    return String(value ?? '');
}

function pickRecommendedRestaurantId(items: any[], response: any, currentRestaurant: any) {
    if (!items?.length) return null;
    const activeRestaurantId = normalizeId(currentRestaurant?.id);
    if (activeRestaurantId && items.some((item: any) => normalizeId(item.id) === activeRestaurantId)) {
        return activeRestaurantId;
    }

    const replyText = normalizeText(response?.reply || response?.text || response?.tts?.text || '');
    for (const item of items) {
        const name = normalizeText(item.display_name || item.name || '');
        if (name && replyText.includes(name)) {
            return normalizeId(item.id);
        }
    }

    return items[0]?.id != null ? normalizeId(items[0].id) : null;
}

export function StateIsland() {
    const { isIdle, isOrdering, isConfirmingOrder, isChoosingRestaurant, isClarifyingOrder, isRestaurantSelected } = useConversationUIState();

    let label: React.ReactNode = 'Wybierz rejon';
    let color = 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    let useWordmark = false;

    if (isClarifyingOrder) {
        label = 'Precyzowanie...';
        color = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]';
    } else if (isConfirmingOrder) {
        label = 'Potwierdzenie zamowienia';
        color = 'bg-green-500/20 text-green-300 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]';
    } else if (isOrdering) {
        label = 'Tworzenie zamowienia';
        color = 'bg-orange-500/20 text-orange-300 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]';
    } else if (isRestaurantSelected) {
        useWordmark = true;
        label = <FreeFlowWordmark variant={MENU_WORDMARK_VARIANT} />;
        color = 'bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]';
    } else if (isChoosingRestaurant) {
        label = 'Wybor restauracji';
        color = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    } else if (isIdle) {
        label = 'Odkrywanie';
        color = 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }

    return (
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`px-4 py-1.5 rounded-full border backdrop-blur-md transition-colors duration-300 ${useWordmark ? 'text-[11px] font-medium tracking-normal' : 'text-xs font-semibold tracking-wide'} ${color}`}
        >
            {label}
        </motion.div>
    );
}

export function RestaurantCard({ restaurant, isActive = true, isCarousel = false }: { restaurant?: any, isActive?: boolean, isCarousel?: boolean }) {
    const currentRestaurant = useConversationStore(state => state.currentRestaurant);
    const data = restaurant || currentRestaurant;

    if (!data) return null;

    if (isCarousel) {
        return (
            <motion.div
                animate={{ scale: isActive ? 1 : 0.92, filter: isActive ? 'blur(0px)' : 'blur(2px)', opacity: isActive ? 1 : 0.6 }}
                transition={{ duration: 0.3 }}
                className={`flex-none w-[300px] snap-center rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,12,18,0.9),rgba(16,22,32,0.78))] p-5 shadow-2xl ${isActive ? 'ring-1 ring-amber-200/30' : ''}`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Restauracja</div>
                        <h3 className="mt-2 text-lg font-semibold leading-tight text-white">{data.name}</h3>
                        <p className="mt-1 text-sm text-amber-200/90">{data.cuisine_type || data.city || 'Restauracja'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Ocena</div>
                        <div className="mt-1 text-sm font-semibold text-white">{data.rating || '4.8'}</div>
                    </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/55">
                    {data.distance ? <span>{typeof data.distance === 'number' ? `${data.distance.toFixed(1)} km` : data.distance}</span> : null}
                    {data.delivery_time ? <span>{data.delivery_time}</span> : null}
                    {data.address ? <span className="truncate">{data.address}</span> : null}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            className="fixed top-20 right-4 z-40 w-[22rem] rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,18,0.84),rgba(12,18,27,0.74))] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl"
        >
            <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-2xl">
                    ??
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Obecna restauracja</p>
                    <p className="mt-2 text-lg font-semibold leading-tight text-white">{data.name}</p>
                    <p className="mt-1 text-sm text-cyan-100/75">{data.city || data.address || data.cuisine_type || ''}</p>
                </div>
            </div>
        </motion.div>
    );
}

export function SuggestedRestaurantsCarousel() {
    const suggestedRestaurants = useConversationStore(state => state.suggestedRestaurants);
    const selectedRestaurantPreviewId = useConversationStore(state => state.selectedRestaurantPreviewId);
    const setSelectedRestaurantPreviewId = useConversationStore(state => state.setSelectedRestaurantPreviewId);
    const currentRestaurant = useConversationStore(state => state.currentRestaurant);
    const lastFullResponse = useConversationStore(state => state.lastFullResponse);

    const recommendedId = useMemo(
        () => pickRecommendedRestaurantId(suggestedRestaurants || [], lastFullResponse, currentRestaurant),
        [suggestedRestaurants, lastFullResponse, currentRestaurant]
    );

    useEffect(() => {
        if (!suggestedRestaurants?.length) return;

        const hasCurrentSelection = selectedRestaurantPreviewId
            ? suggestedRestaurants.some((item) => normalizeId(item.id) === normalizeId(selectedRestaurantPreviewId))
            : false;

        if (hasCurrentSelection) return;

        if (recommendedId && suggestedRestaurants.some((item) => normalizeId(item.id) === normalizeId(recommendedId))) {
            setSelectedRestaurantPreviewId(recommendedId);
            return;
        }

        setSelectedRestaurantPreviewId(normalizeId(suggestedRestaurants[0].id));
    }, [suggestedRestaurants, recommendedId, selectedRestaurantPreviewId, setSelectedRestaurantPreviewId]);

    if (!suggestedRestaurants || suggestedRestaurants.length === 0) return null;

    return (
        <CinematicRestaurantCarousel
            items={suggestedRestaurants}
            selectedId={selectedRestaurantPreviewId}
            recommendedId={recommendedId}
            onPreviewChange={(item) => setSelectedRestaurantPreviewId(normalizeId(item.id))}
            onSelect={(item) => {
                setSelectedRestaurantPreviewId(normalizeId(item.id));
                window.dispatchEvent(new CustomEvent('freeflow:selectRestaurant', { detail: item }));
            }}
        />
    );
}

export function ExpectedContextPrompts() {
    const { isDisambiguatingMenu, isConfirmingOrder, isChoosingRestaurant } = useConversationUIState();

    let prompt = null;

    if (isConfirmingOrder) {
        prompt = "Powiedz 'Potwierdzam' lub 'Popraw z...'";
    } else if (isDisambiguatingMenu) {
        prompt = 'Podaj dokladniejsza nazwe dania...';
    } else if (isChoosingRestaurant) {
        prompt = "Np. 'Wybieram pierwsza' albo 'Z numeru 2'";
    }

    if (!prompt) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-1 text-center text-xs text-white/60"
            >
                {prompt}
            </motion.div>
        </AnimatePresence>
    );
}


