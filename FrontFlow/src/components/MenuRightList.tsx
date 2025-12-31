import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../state/ui';

export default function MenuRightList() {
    const { mode, presentationItems } = useUI();
    const isVisible = mode === 'menu_presentation' && presentationItems && presentationItems.length > 0;

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                key="menu-right-list"
                className="fixed bottom-[180px] right-4 md:right-8 z-[60] flex flex-col items-end"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                <div className="pointer-events-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] w-80 max-h-[50vh] flex flex-col overflow-hidden relative">
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-bl from-[var(--neon)]/5 to-transparent pointer-events-none" />

                    {/* Header */}
                    <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-wide">Karta Menu</h3>
                            <p className="text-[10px] text-[var(--neon)] uppercase tracking-wider font-medium">Lista Dań</p>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[var(--neon)] text-xs">
                            🍽️
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="overflow-y-auto p-2 tiny-scroll space-y-2">
                        {presentationItems.map((item: any, i: number) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="group p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[var(--neon)]/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all cursor-pointer flex flex-col gap-1 relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors line-clamp-2">
                                        {item.name}
                                    </span>
                                    <span className="font-mono text-xs font-bold text-[var(--neon)] bg-[var(--neon)]/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                                        {Number(item.price_pln || item.price || 0).toFixed(0)} zł
                                    </span>
                                </div>
                                {item.description && (
                                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                        {item.description}
                                    </p>
                                )}
                                {/* Add Button Overlay */}
                                <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-6 h-6 rounded-full bg-[var(--neon)] text-black flex items-center justify-center text-lg leading-none shadow-lg transform active:scale-90 transition-transform">
                                        +
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Footer Gradient Fade */}
                    <div className="h-4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none mt-auto" />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
