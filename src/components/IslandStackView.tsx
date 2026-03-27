import React from 'react';
import { IslandBackdrop } from './IslandBackdrop';

const STACK_CARD_HEIGHT = 96;

// No blur on non-focused cards — reduces GPU compositing cost.
function getDepthStyle(offset: number) {
    const abs = Math.abs(offset);
    if (abs === 0) return { scale: 1, opacity: 1, y: 0, z: 30 };
    if (abs === 1) return { scale: 0.92, opacity: 0.55, y: offset * 90, z: 20 };
    return { scale: 0.84, opacity: 0.25, y: offset * 150, z: 10 };
}

function formatPrice(item: any) {
    const value = Number(item?.price_pln ?? item?.price ?? 0);
    return Number.isFinite(value) && value > 0 ? `${value.toFixed(2)} zl` : null;
}

function getCuisine(item: any) {
    return item?.cuisine_type || item?.category || item?.section || 'Wybor dnia';
}

function getMetaLine(item: any) {
    return item?.description || item?.ingredients || item?.allergens || 'Kliknij, aby dodac do zamowienia';
}

interface StackCardProps {
    item: any;
    stackOffset: number;
    isRecommended: boolean;
    onClick: () => void;
}

function StackCard({ item, stackOffset, isRecommended, onClick }: StackCardProps) {
    const depth = getDepthStyle(stackOffset);
    const isFocused = stackOffset === 0;
    const price = formatPrice(item);

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full origin-center text-left"
            style={{
                gridArea: '1 / 1',
                alignSelf: 'center',
                height: `${STACK_CARD_HEIGHT}px`,
                transform: `translate3d(0, ${depth.y}px, 0) scale(${depth.scale})`,
                opacity: depth.opacity,
                zIndex: depth.z,
                // transition only on compositable properties (no filter)
                transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
                willChange: 'transform',
            }}
            aria-label={item?.name || 'Pozycja menu'}
        >
            <div
                className="relative h-full overflow-hidden rounded-[20px] px-3.5 py-2.5"
                style={{
                    background: isFocused
                        ? 'linear-gradient(140deg, rgba(34,211,238,0.24) 0%, rgba(8,12,20,0.97) 100%)'
                        : isRecommended
                            ? 'linear-gradient(140deg, rgba(255,184,77,0.16) 0%, rgba(8,16,28,0.92) 100%)'
                            : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(8,13,24,0.74))',
                    border: isFocused ? '1px solid rgba(34,211,238,0.58)' : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: isFocused
                        ? '0 0 0 1px rgba(34,211,238,0.3) inset, 0 12px 24px rgba(0,0,0,0.3)'
                        : '0 8px 16px rgba(0,0,0,0.18)',
                    // backdropFilter only on focused card — non-focused cards skip compositing layer
                    backdropFilter: isFocused ? 'blur(12px) saturate(1.08)' : 'none',
                    WebkitBackdropFilter: isFocused ? 'blur(12px) saturate(1.08)' : 'none',
                }}
            >
                {(isFocused || isRecommended) && (
                    <div
                        className="absolute inset-x-5 top-0 h-px"
                        style={{
                            background: `linear-gradient(90deg, transparent, ${isFocused ? 'rgba(34,211,238,0.9)' : 'rgba(255,184,77,0.56)'}, transparent)`,
                        }}
                    />
                )}

                <div className="flex h-full items-center gap-3">
                    <div className="min-w-0 flex-1">
                        {isFocused && (
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-cyan-400/16 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                                    {getCuisine(item)}
                                </span>
                                {price && <span className="text-[12px] font-semibold text-cyan-100">{price}</span>}
                            </div>
                        )}
                        <div className={`mt-2 truncate text-[15px] font-semibold ${isFocused ? 'text-white' : 'text-white/60'}`}>
                            {item?.name || 'Pozycja menu'}
                        </div>
                        {isFocused && (
                            <div className="mt-1 line-clamp-2 text-[12px] text-white/94">{getMetaLine(item)}</div>
                        )}
                    </div>
                    {isFocused && (
                        <span className="rounded-full bg-cyan-400/18 px-2 py-0.5 text-[10px] text-cyan-100">
                            Wybrane
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

export interface IslandStackViewProps {
    stackItems: Array<{ item: any; offset: number }>;
    stackHeight: number;
    stackAnchorTop: number;
    stackSafeBottom: string;
    ctaLabel: string;
    recommendedId?: string | null;
    onSwipeStart: (event: React.TouchEvent<HTMLElement>) => void;
    onSwipeEnd: (event: React.TouchEvent<HTMLElement>) => void;
    onWheel: (event: React.WheelEvent<HTMLElement>) => void;
    onItemClick: (item: any) => void;
    onCtaPress: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function IslandStackView({
    stackItems,
    stackHeight,
    stackAnchorTop,
    stackSafeBottom,
    ctaLabel,
    recommendedId,
    onSwipeStart,
    onSwipeEnd,
    onWheel,
    onItemClick,
    onCtaPress,
}: IslandStackViewProps) {
    return (
        <div
            className="relative z-10 flex min-h-0 flex-1 flex-col px-3"
            style={{ paddingBottom: stackSafeBottom }}
            onTouchStart={onSwipeStart}
            onTouchEnd={onSwipeEnd}
            onWheel={onWheel}
        >
            <div
                className="absolute inset-x-3 z-[55] island-stack"
                style={{
                    top: `${Math.round(stackAnchorTop)}px`,
                    willChange: 'transform',
                    contain: 'layout paint',
                }}
            >
                <div
                    className="relative overflow-visible"
                    style={{
                        height: `${stackHeight}px`,
                        // removed perspective + transformStyle — not needed for translate3d-only transforms
                        willChange: 'transform',
                        contain: 'layout paint',
                    }}
                >
                    <IslandBackdrop />

                    <div
                        className="relative h-full w-full z-[95]"
                        style={{ display: 'grid', alignItems: 'center' }}
                    >
                        {stackItems.map(({ item, offset }) => (
                            <StackCard
                                key={`${item._uiId}-${offset}`}
                                item={item}
                                stackOffset={offset}
                                isRecommended={item._uiId === recommendedId}
                                onClick={() => onItemClick(item)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="pointer-events-auto mt-auto flex justify-end pb-[calc(env(safe-area-inset-bottom)+96px)] pr-1">
                <button
                    type="button"
                    onClick={onCtaPress}
                    className="rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-medium text-white/78 backdrop-blur-md transition hover:bg-black/55 hover:text-white"
                >
                    {ctaLabel}
                </button>
            </div>
        </div>
    );
}
