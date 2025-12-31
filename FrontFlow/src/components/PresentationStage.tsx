import React, { useEffect, useRef } from 'react';
import { useUI } from '../state/ui';

interface PresentationStageProps {
    onSelect: (item: any) => void;
    recording: boolean;
}

export default function PresentationStage({ onSelect, recording }: PresentationStageProps) {
    const { mode, presentationItems, highlightedCardId } = useUI();
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // 🔄 Auto-scroll to highlighted card
    useEffect(() => {
        if (highlightedCardId && cardRefs.current.has(highlightedCardId)) {
            const cardNode = cardRefs.current.get(highlightedCardId);
            if (cardNode) {
                cardNode.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [highlightedCardId]);

    // 🛑 RECORDING = MINIMAL MODE
    if (recording) {
        return null; // Ukryj karty podczas nagrywania
    }

    // 🛑 Render nothing if mode is not a presentation mode
    const isPresentationMode = ['restaurant_presentation', 'menu_presentation', 'cart_summary', 'confirmation'].includes(mode);
    if (!isPresentationMode || (presentationItems?.length || 0) === 0) {
        return null;
    }

    const renderCard = (item: any) => {
        const isActive = highlightedCardId === item.id;

        return (
            <div
                key={item.id}
                ref={(el) => { if (el) cardRefs.current.set(item.id, el); else cardRefs.current.delete(item.id); }}
                onClick={() => onSelect(item)}
                className={`
                    relative flex-shrink-0 
                    w-[280px] md:w-[340px] 
                    p-6 m-4 rounded-3xl cursor-pointer 
                    transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                    border
                    ${isActive
                        ? 'opacity-100 scale-105 border-amber-400/80 bg-[#0f0f11] shadow-[0_10px_40px_-10px_rgba(251,191,36,0.5)] z-30'
                        : 'opacity-60 scale-95 border-white/10 bg-[#000000] hover:opacity-100 hover:border-white/30 z-20'
                    }
                    backdrop-blur-xl
                `}
                style={{
                    scrollSnapAlign: "center",
                }}
            >
                {isActive && (
                    <div className="absolute inset-0 rounded-3xl bg-amber-400/5 blur-xl pointer-events-none" />
                )}

                {/* Content based on Mode */}
                {mode === 'restaurant_presentation' && (
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-medium text-amber-400 tracking-wider uppercase">Restauracja</span>
                                {item.rating && <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">★ {item.rating}</span>}
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2 leading-tight">{item.name}</h3>
                            <p className="text-sm text-gray-300">{item.cuisine_type || item.cuisine || 'Kuchnia międzynarodowa'}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center text-xs text-gray-400">
                            <span className="truncate">{item.address || item.city || 'Lokalizacja nieznana'}</span>
                            {item.distance && <span className="ml-auto whitespace-nowrap opacity-70">~{item.distance < 1 ? Math.round(item.distance * 1000) + 'm' : item.distance.toFixed(1) + 'km'}</span>}
                        </div>
                    </div>
                )}

                {mode === 'menu_presentation' && (
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="text-xl font-bold text-white leading-tight pr-4">{item.name}</h3>
                            <span className="text-amber-400 font-mono font-bold whitespace-nowrap text-lg">
                                {item.price_pln ? `${Number(item.price_pln).toFixed(0)} zł` : ''}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 italic mb-2">{item.category}</p>
                        <p className="text-sm text-gray-300 line-clamp-2 mt-auto">
                            {item.description || "Pyszna pozycja z menu, warto spróbować."}
                        </p>
                    </div>
                )}

                {mode === 'cart_summary' && (
                    <div className="flex flex-col h-full">
                        <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                        <div className="flex justify-between mt-auto">
                            <span className="text-sm text-gray-300">{item.quantity}x</span>
                            <span className="text-amber-400">{item.price ? `${(item.price * item.quantity).toFixed(2)}` : ''} zł</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-x-0 bottom-[180px] md:bottom-[160px] z-30 flex flex-col items-center pointer-events-none">
            <div
                className="w-full overflow-x-auto flex items-center py-8 no-scrollbar pointer-events-auto snap-x snap-mandatory"
                style={{
                    maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)'
                }}
            >
                <div className="flex flex-nowrap items-center px-[50vw] space-x-0">
                    {presentationItems.map(renderCard)}
                </div>
            </div>
        </div>
    );
}
