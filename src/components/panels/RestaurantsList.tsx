import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface RestaurantData {
    id: string;
    name: string;
    rating?: number;
    cuisine_type?: string;
    delivery_time?: string;
    price_range?: string;
    img?: string;
    image_url?: string;
    city?: string; // Added based on screenshot ("Polska" or city name)
}

interface Props {
    data: RestaurantData[];
}

const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1555992336-fb9d2918d300?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop',
];

function getFallbackImage(id: string, index: number) {
    const hash = id ? id.charCodeAt(0) + id.charCodeAt(id.length - 1) : index;
    return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
}

export default function RestaurantsList({ data }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!data || data.length === 0) {
        return <div className="p-4 text-center text-gray-400">Brak restauracji do wyświetlenia.</div>;
    }

    // Carousel View (Initial)
    const renderCarousel = () => (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="w-full max-w-md mx-auto"
        >
            <div className="relative">
                {/* Scrollable Container */}
                <div className="flex overflow-x-auto gap-4 pb-8 pt-4 px-4 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing">
                    {data.map((r, i) => {
                        const imageSrc = r.img || r.image_url || getFallbackImage(r.id, i);
                        return (
                            <div
                                key={r.id || i}
                                className="flex-none w-[280px] snap-center bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                                onClick={() => setIsExpanded(true)}
                            >
                                <div className="h-32 relative">
                                    <img
                                        src={imageSrc}
                                        alt={r.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.target as HTMLImageElement).src = FALLBACK_IMAGES[0]}
                                    />
                                    {r.rating && (
                                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1 border border-white/10">
                                            <span className="text-white text-xs font-bold">★ {r.rating}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="text-white font-bold text-lg mb-1 truncate">{r.name}</h3>
                                    <p className="text-brand-500 text-xs font-medium mb-4">{r.city || 'Polska'}</p>

                                    {/* Pagination Dots (Visual Only) */}
                                    <div className="flex gap-1.5 mb-2">
                                        {[...Array(5)].map((_, idx) => (
                                            <div key={idx} className={`h-1 rounded-full ${idx === 0 ? 'w-6 bg-brand-500' : 'w-1.5 bg-gray-600'}`} />
                                        ))}
                                    </div>

                                    <div className="flex justify-end items-center text-xs text-gray-500 gap-1">
                                        <span>Swipe</span>
                                        <i className="fas fa-arrow-right" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Swipe Up Hint */}
                <motion.div
                    className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer w-full p-4"
                    onClick={() => setIsExpanded(true)}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                >
                    <div className="w-12 h-1 bg-white/20 rounded-full" />
                </motion.div>
            </div>
        </motion.div>
    );

    // Grid View (Expanded)
    const renderGrid = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full"
        >
            <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-xl font-bold text-white">Restauracje</h2>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                    <i className="fas fa-compress-alt text-white/80" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
                {data.map((r, i) => {
                    const imageSrc = r.img || r.image_url || getFallbackImage(r.id, i);
                    return (
                        <div key={r.id || i} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all cursor-pointer group">
                            <div className="h-48 relative overflow-hidden">
                                <img
                                    src={imageSrc}
                                    alt={r.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    onError={(e) => (e.target as HTMLImageElement).src = FALLBACK_IMAGES[0]}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-4">
                                    <h3 className="text-white font-bold text-xl">{r.name}</h3>
                                    <p className="text-gray-300 text-sm">{r.cuisine_type || 'Kuchnia międzynarodowa'}</p>
                                </div>
                                {r.rating && (
                                    <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-amber-400 font-bold text-xs px-2.5 py-1 rounded-full">
                                        ★ {r.rating}
                                    </span>
                                )}
                            </div>
                            <div className="p-3 flex justify-between items-center text-sm text-gray-400 border-t border-white/5">
                                <span className="flex items-center gap-1"><i className="far fa-clock" /> {r.delivery_time || '30-40 min'}</span>
                                <span className="text-brand-500 font-medium">Dostawa gratis</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );

    return (
        <AnimatePresence mode="wait">
            {!isExpanded ? renderCarousel() : renderGrid()}
        </AnimatePresence>
    );
}

