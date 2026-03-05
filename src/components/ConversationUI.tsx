import React from 'react';
import { useConversationUIState } from '../hooks/useConversationUIState';
import { useConversationStore } from '../store/useConversationStore';
import { motion, AnimatePresence } from 'framer-motion';

export function StateIsland() {
    const { isIdle, isOrdering, isConfirmingOrder, isChoosingRestaurant, isClarifyingOrder, isRestaurantSelected } = useConversationUIState();

    let label = 'Wybierz rejon';
    let color = 'bg-gray-500/20 text-gray-300 border-gray-500/30';

    if (isClarifyingOrder) {
        label = 'Precyzowanie...';
        color = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]';
    } else if (isConfirmingOrder) {
        label = 'Potwierdzenie Zamówienia';
        color = 'bg-green-500/20 text-green-300 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]';
    } else if (isOrdering) {
        label = 'Tworzenie Zamówienia';
        color = 'bg-orange-500/20 text-orange-300 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]';
    } else if (isRestaurantSelected) {
        label = 'Menu Restauracji';
        color = 'bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]';
    } else if (isChoosingRestaurant) {
        label = 'Wybór Restauracji';
        color = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    } else if (isIdle) {
        label = 'Odkrywanie';
        color = 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }

    return (
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wide backdrop-blur-md transition-colors duration-300 ${color}`}
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
                className={`flex-none w-[280px] snap-center bg-black/80 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl relative ${isActive ? 'ring-1 ring-white/20' : ''}`}
            >
                <div className="mb-10">
                    <h3 className="text-white font-bold text-lg leading-tight">{data.name}</h3>
                    <p className="text-brand-500 font-medium text-sm mt-1">{data.cuisine_type || data.city || 'Restauracja'}</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            className="fixed top-20 right-4 z-40 bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4"
        >
            <div className="w-12 h-12 rounded-full border-2 border-orange-400 bg-black flex items-center justify-center text-xl">
                🍽️
            </div>
            <div>
                <p className="text-xs text-white/50 m-0 leading-tight">Obecna Restauracja</p>
                <p className="text-white font-bold leading-tight">{data.name}</p>
                <p className="text-xs text-orange-300 mt-1">{data.city || data.address || ''}</p>
            </div>
        </motion.div>
    );
}

import ContextualIsland from './ContextualIsland';

export function SuggestedRestaurantsCarousel() {
    const suggestedRestaurants = useConversationStore(state => state.suggestedRestaurants);
    const selectedRestaurantPreviewId = useConversationStore(state => state.selectedRestaurantPreviewId);
    const setSelectedRestaurantPreviewId = useConversationStore(state => state.setSelectedRestaurantPreviewId);

    if (!suggestedRestaurants || suggestedRestaurants.length === 0) return null;

    return (
        <ContextualIsland
            items={suggestedRestaurants}
            type="restaurant"
            position="left"
            highlightedId={selectedRestaurantPreviewId}
            setHighlightedId={(id) => setSelectedRestaurantPreviewId(id as string)}
            onSelect={(item) => {
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
        prompt = "Podaj dokładniejszą nazwę dania...";
    } else if (isChoosingRestaurant) {
        prompt = "Np. 'Wybieram pierwszą' albo 'Z numeru 2'";
    }

    if (!prompt) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xs text-white/60 text-center animate-pulse mt-1"
            >
                💡 {prompt}
            </motion.div>
        </AnimatePresence>
    );
}
