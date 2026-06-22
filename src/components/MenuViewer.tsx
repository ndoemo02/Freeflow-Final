import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../state/ui';

export default function MenuViewer() {
    const { mode, presentationItems, setMode } = useUI();

    // Obsługa zarówno menu jak i listy restauracji
    const isMenu = mode === 'menu_presentation';
    const isRestaurants = mode === 'restaurant_presentation';
    const isVisible = (isMenu || isRestaurants) && presentationItems && presentationItems.length > 0;

    if (!isVisible) return null;

    const close = () => setMode('standard_chat');

    const title = isMenu ? 'Karta Menu' : 'Znalezione Restauracje';
    const subtitle = isMenu ? 'Restauracja' : 'Wyniki wyszukiwania';
    const icon = isMenu ? '🍽️' : '📍';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: -400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -400, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-24 bottom-24 left-6 z-[60] w-[360px] flex flex-col pointer-events-none"
            >
                <div
                    className="glass-strong w-full h-full overflow-hidden rounded-2xl border border-[var(--ff-stroke)] flex flex-col shadow-2xl pointer-events-auto relative"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md sticky top-0 z-10">
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                <span className="text-[var(--ff-amber-500)]">{icon}</span> {title}
                            </h2>
                            <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium">{subtitle}</p>
                        </div>
                        <button
                            onClick={close}
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 tiny-scroll bg-gradient-to-b from-[#0F0F16] to-[#0a0a0f]">
                        {presentationItems.map((item: any, i: number) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex justify-between items-start p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[var(--ff-amber-500)] hover:neon-ring transition-all cursor-pointer group"
                                onClick={() => {
                                    // Opcjonalnie: obsługa kliknięcia (np. wybór restauracji)
                                    // Na razie tylko wizualizacja
                                }}
                            >
                                <div className="flex-1 min-w-0 pr-3">
                                    <div className="font-semibold text-sm text-[var(--ff-text-1)] group-hover:text-[var(--ff-amber-500)] transition-colors truncate">
                                        {item.name}
                                    </div>

                                    {/* Renderowanie dla MENU */}
                                    {isMenu && (
                                        <>
                                            {item.category && (
                                                <div className="text-[10px] text-[var(--ff-text-2)] uppercase tracking-wider mt-0.5 bg-white/5 inline-block px-1.5 py-0.5 rounded">
                                                    {item.category}
                                                </div>
                                            )}
                                            {item.description && (
                                                <div className="text-xs text-[var(--ff-text-2)] mt-1 line-clamp-2 leading-relaxed opacity-80">
                                                    {item.description}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Renderowanie dla RESTAURACJI */}
                                    {isRestaurants && (
                                        <>
                                            {item.cuisine_type && (
                                                <div className="text-[10px] text-[var(--ff-amber-500)] uppercase tracking-wider mt-0.5 bg-[var(--ff-amber-500)]/10 inline-block px-1.5 py-0.5 rounded border border-[var(--ff-amber-500)]/20">
                                                    {item.cuisine_type}
                                                </div>
                                            )}
                                            <div className="text-xs text-[var(--ff-text-2)] mt-1 opacity-80 flex flex-col gap-0.5">
                                                {item.city && <span>🏙️ {item.city}</span>}
                                                {item.street && <span>📍 {item.street}</span>}
                                                {item.opening_hours && <span className="text-[10px] text-white/40">🕒 {item.opening_hours}</span>}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    {/* Cena tylko dla Menu */}
                                    {isMenu && (
                                        <div className="font-mono text-[var(--ff-amber-500)] font-bold whitespace-nowrap text-sm bg-[var(--ff-amber-500)]/10 px-2 py-1 rounded-lg border border-[var(--ff-amber-500)]/20">
                                            {Number(item.price_pln || item.price || 0).toFixed(2)} zł
                                        </div>
                                    )}

                                    {/* Ocena dla Restauracji */}
                                    {isRestaurants && item.rating && (
                                        <div className="font-mono text-yellow-400 font-bold text-xs bg-yellow-400/10 px-2 py-1 rounded-lg border border-yellow-400/20">
                                            ⭐ {item.rating}
                                        </div>
                                    )}

                                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[var(--ff-amber-500)] opacity-0 group-hover:opacity-100 transition-opacity">
                                        →
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        <div className="h-10"></div> {/* Spacer for bottom safe area */}
                    </div>

                    {/* Footer Action */}
                    <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md">
                        <button onClick={close} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-white/70 hover:text-white transition-colors border border-white/5">
                            Zamknij widok
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence >
    );
}
