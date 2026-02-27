/**
 * MenuIsland.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 * PRAWA STREFA LAYOUTU — Menu restauracji
 *
 * Renderowana jest tylko gdy conversationPhase === 'restaurant_selected'
 * lub conversationPhase === 'ordering'.
 *
 * ZASADY:
 * - Pozycja: fixed, prawa strona (right-4), środek ekranu (top-1/2)
 * - Nie przykrywa całego ekranu
 * - Nie resetuje slidera po lewej stronie
 * - Nie blokuje drag lewej wyspy
 * - Logika menu bez zmian (dane z useConversationStore)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore } from '../store/useConversationStore';
import { useActionDispatcher } from '../hooks/useActionDispatcher';

const MENU_PHASES = ['restaurant_selected', 'ordering'];

export default function MenuIsland() {
    const conversationPhase = useConversationStore(s => s.conversationPhase);
    const menuItems = useConversationStore(s => s.menuItems);
    const currentRestaurant = useConversationStore(s => s.currentRestaurant);
    const { dispatch } = useActionDispatcher();

    const isVisible = MENU_PHASES.includes(conversationPhase);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    key="menu-island"
                    initial={{ opacity: 0, x: 40, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 40, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                    className="fixed right-4 z-40 pointer-events-auto"
                    style={{
                        top: 'calc(80px + 25vh)',  // obniżona o 25%
                        width: '260px',
                        maxHeight: '80vh',
                    }}
                >
                    {/* Frosted glass card */}
                    <div
                        className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                        style={{ maxHeight: '80vh' }}
                    >
                        {/* Header */}
                        <div className="px-4 pt-4 pb-3 border-b border-white/8 flex-shrink-0">
                            <p className="text-orange-400 font-medium text-[11px] uppercase tracking-widest mb-0.5">
                                {currentRestaurant?.name || 'Menu'}
                            </p>
                            <h2 className="text-white font-bold text-sm leading-snug">
                                Wybierz z menu
                            </h2>
                        </div>

                        {/* Scrollable list */}
                        <div
                            className="overflow-y-auto flex-1 px-3 py-2 space-y-1.5"
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgba(255,255,255,0.15) transparent',
                            }}
                        >
                            {(menuItems ?? []).map((item: any, i: number) => (
                                <motion.button
                                    key={item.id || i}
                                    whileHover={{ scale: 1.015, backgroundColor: 'rgba(255,255,255,0.07)' }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full text-left flex justify-between items-center p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] transition-colors pointer-events-auto"
                                    onClick={() => {
                                        // Wysyłamy zamówienie przez custom event (identycznie jak "Wybierz" w karuzeli)
                                        window.dispatchEvent(new CustomEvent('freeflow:orderItem', {
                                            detail: { item, restaurant: currentRestaurant }
                                        }));
                                    }}
                                    disabled={item.available === false}
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h4 className={`font-semibold text-xs leading-tight truncate ${item.available === false ? 'text-white/30' : 'text-white'}`}>
                                            {item.name}
                                        </h4>
                                        {item.description && (
                                            <p className="text-[10px] text-white/35 mt-0.5 line-clamp-1">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        {item.price != null && (
                                            <span className={`block font-mono font-bold text-xs ${item.available === false ? 'text-white/25' : 'text-amber-400'}`}>
                                                {item.price} zł
                                            </span>
                                        )}
                                        {item.available === false && (
                                            <span className="text-[9px] text-red-400/70">Niedost.</span>
                                        )}
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* Footer hint */}
                        <div className="px-4 py-2.5 border-t border-white/[0.06] flex-shrink-0">
                            <p className="text-[10px] text-white/25 font-medium text-center">
                                Kliknij pozycję lub powiedz co chcesz zamówić
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
