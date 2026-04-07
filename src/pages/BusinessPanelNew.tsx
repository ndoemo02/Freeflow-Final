import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKDSPolling } from '../hooks/useKDSPolling';
import { KDSOrder } from '../lib/kdsApi';
import '../components/panels/KitchenDisplay.css'; // Dodany CSS prototypu

type StationFilter = 'all' | 'kuchnia' | 'grill' | 'zimne' | 'bar' | 'desery' | 'wydawka';

function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 1000 / 60);
    const seconds = Math.floor((ms / 1000) % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function OrderCard({
    order,
    handleStartOrder,
    handleCompleteOrder,
    handleBumpOrder,
    handleToggleItem,
    activeStation
}: {
    order: KDSOrder;
    handleStartOrder: (id: string) => void;
    handleCompleteOrder: (id: string) => void;
    handleBumpOrder: (id: string) => void;
    handleToggleItem: (id: string, index: number) => void;
    activeStation: string;
}) {
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedTime(Date.now() - new Date(order.created_at).getTime());
        }, 1000);
        return () => clearInterval(interval);
    }, [order.created_at]);

    // Map the status locally for KDS rendering logic
    const mappedStatus = (order.status === 'pending' || order.status === 'new') ? 'new'
        : order.status === 'preparing' ? 'preparing'
            : order.status === 'ready' ? 'ready'
                : 'completed';

    const allDone = order.items.every(i => i.done);
    const displayItems = activeStation === 'all' || activeStation === 'wydawka'
        ? order.items
        : order.items.filter(i => i.station === activeStation);

    const isNew = mappedStatus === 'new';
    const cardStatusClass =
        mappedStatus === 'new'
            ? 'kds-order-card--new'
            : mappedStatus === 'preparing'
                ? 'kds-order-card--preparing'
                : mappedStatus === 'ready'
                    ? 'kds-order-card--ready'
                    : 'kds-order-card--completed';

    return (
        <div className={`kds-order-card ${cardStatusClass}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold text-xs shadow-lg p-1 text-center leading-tight overflow-hidden whitespace-normal">
                        {order.location || 'ST.'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-sm font-mono font-bold text-slate-200 truncate">#{order.order_number || order.id.substring(0, 4)}</span>
                            <span className="text-xs text-slate-500">{new Date(order.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {order.priority && (
                                <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-red-500 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                    </svg>
                                    <span className="text-[10px] font-bold text-red-500">PILNE</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className={`kds-order-card__timer ${cardStatusClass}`}>
                    {formatDuration(elapsedTime)}
                </div>
            </div>

            <div className="space-y-1 mb-3">
                {displayItems.map((item, idx) => {
                    const originalIdx = order.items.indexOf(item);
                    return (
                        <div
                            key={idx}
                            onClick={() => handleToggleItem(order.id, originalIdx)}
                            className={`flex items-start gap-2 text-xs p-2 rounded cursor-pointer transition-colors ${item.done ? 'bg-emerald-500/10 opacity-60' : 'hover:bg-slate-700/50'}`}
                        >
                            <span className={`font-bold flex-shrink-0 ${item.done ? 'text-emerald-500' : 'text-orange-400'}`}>
                                {item.done ? '✓' : `${item.quantity}x`}
                            </span>
                            <div className={`flex-1 min-w-0 ${item.done ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                                <p className="truncate text-sm">{item.name}</p>
                                {item.station && (
                                    <p className="text-[10px] text-slate-500 uppercase">{item.station}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {order.notes && (
                <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">
                    ⚠️ {order.notes}
                </div>
            )}

            <button
                onClick={() => {
                    if (isNew) handleStartOrder(order.id);
                    else if (allDone) handleCompleteOrder(order.id);
                    else handleBumpOrder(order.id);
                }}
                className={`kds-button w-full py-2.5 px-3 rounded-lg text-white font-bold text-xs transition-all duration-300 shadow-lg active:scale-95
                    ${isNew ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700' :
                        allDone ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700' :
                            'bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700'}`}
            >
                {isNew ? 'PRZYJMIJ' : allDone ? 'WYŚLIJ / ZAKOŃCZ' : 'CZEKAJ / ZWOLNIJ (BUMP)'}
            </button>
        </div>
    );
}

function StatusColumn({
    title,
    orders,
    color,
    isActive,
    ...actions
}: any) {
    return (
        <div className={`flex-1 min-w-[320px] w-full ${isActive ? 'opacity-100' : 'opacity-30'} flex flex-col h-full transition-opacity duration-300`}>
            <div className="flex items-center gap-2 mb-3 px-1 flex-shrink-0">
                <div className={`h-1 flex-1 min-w-[20px] rounded-full bg-gradient-to-r ${color}`}></div>
                <h2 className="text-sm lg:text-lg font-bold text-slate-200 whitespace-nowrap">{title} ({orders.length})</h2>
                <div className="h-1 flex-1 min-w-[20px] rounded-full bg-slate-700"></div>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 pb-10 px-1 custom-scrollbar">
                {orders.length === 0 ? (
                    <div className="flex items-center justify-center h-32 rounded-xl border-2 border-dashed border-slate-700/50 text-slate-500">
                        <p className="text-sm">Brak zamówień</p>
                    </div>
                ) : (
                    orders.map((order: any) => (
                        <OrderCard key={order.id} order={order} {...actions} />
                    ))
                )}
            </div>
        </div>
    );
}

export default function BusinessPanelNew() {
    const navigate = useNavigate();
    const [activeStation, setActiveStation] = useState<StationFilter>('all');
    const [isMobile, setIsMobile] = useState(false);
    const [activeColumn, setActiveColumn] = useState(0);
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);

    const {
        orders,
        stats,
        isPolling,
        refresh,
        startOrder,
        toggleItem,
        completeOrder,
        bumpOrder,
        recallLastOrder,
    } = useKDSPolling({ pollInterval: 5000 });

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!isMobile) return;
        const swipeThreshold = 50;
        const diff = touchStartX.current - touchEndX.current;
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                setActiveColumn((prev) => Math.min(prev + 1, 3));
            } else {
                setActiveColumn((prev) => Math.max(prev - 1, 0));
            }
        }
    };

    // Filter and sort mechanism
    const filteredOrders = useMemo(() => {
        let filtered = orders.filter(o => o.status !== 'cancelled');

        if (activeStation === 'wydawka') {
            filtered = filtered.filter(o => o.items.every(i => i.done));
        } else if (activeStation !== 'all') {
            filtered = filtered.filter(o =>
                o.items.some(item => item.station === activeStation && !item.done)
            );
        }

        return filtered.sort((a, b) => {
            if (a.priority && !b.priority) return -1;
            if (!a.priority && b.priority) return 1;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
    }, [orders, activeStation]);

    // Data distribution for kanban columns
    const columnsData = useMemo(() => {
        return [
            {
                title: 'NOWE',
                orders: filteredOrders.filter(o => o.status === 'new' || o.status === 'pending'),
                color: 'from-orange-500 to-orange-600'
            },
            {
                title: 'W PRZYGOTOWANIU',
                orders: filteredOrders.filter(o => o.status === 'preparing'),
                color: 'from-blue-500 to-blue-600'
            },
            {
                title: 'GOTOWE',
                orders: filteredOrders.filter(o => o.status === 'ready'),
                color: 'from-green-500 to-green-600'
            },
            {
                title: 'WYKONANE (HISTORIA)',
                orders: filteredOrders.filter(o => o.status === 'delivered'),
                color: 'from-gray-500 to-gray-600'
            },
        ];
    }, [filteredOrders]);

    const stationCounts = useMemo(() => {
        const active = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
        return {
            all: active.length,
            kuchnia: active.filter(o => o.items.some(i => i.station === 'kuchnia' && !i.done)).length,
            grill: active.filter(o => o.items.some(i => i.station === 'grill' && !i.done)).length,
            zimne: active.filter(o => o.items.some(i => i.station === 'zimne' && !i.done)).length,
            bar: active.filter(o => o.items.some(i => i.station === 'bar' && !i.done)).length,
            desery: active.filter(o => o.items.some(i => i.station === 'desery' && !i.done)).length,
            wydawka: active.filter(o => o.items.every(i => i.done)).length,
        };
    }, [orders]);

    return (
        <div className="kds-min-h-screen bg-[#05060a] w-full h-screen font-sans flex flex-col overflow-hidden">
            {/* Header Prototype style */}
            <header className="bg-[#05060a]/90 backdrop-blur-xl border-b border-slate-800 z-10 flex-shrink-0">
                <div className="w-full px-3 md:px-6 py-2 md:py-3">
                    <div className="flex items-center justify-between gap-2 md:gap-4">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <svg className="w-5 h-5 md:w-7 md:h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                                    <path d="M7 2v20" />
                                    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg md:text-2xl font-bold text-white truncate">Free Flow</h1>
                                <p className="text-xs md:text-sm text-slate-400 truncate">Kitchen Display V2</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                            {/* Return — always first, labeled */}
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors text-xs md:text-sm font-medium"
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                                aria-label="Wróć na stronę główną"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <line x1="19" y1="12" x2="5" y2="12" />
                                    <polyline points="12 19 5 12 12 5" />
                                </svg>
                                <span>Strona główna</span>
                            </button>

                            {/* Clock + polling indicator */}
                            <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-slate-900 rounded-xl border border-slate-800">
                                <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                                <span className="font-mono text-sm md:text-lg text-slate-200">
                                    {new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            </div>
                            <button onClick={recallLastOrder} className="p-2 md:p-3 bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800 text-slate-300">
                                ↺ <span className="hidden lg:inline ml-1 text-xs">Cofnij</span>
                            </button>
                            <button onClick={refresh} className="p-2 md:p-3 bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800 text-slate-300">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                                    <polyline points="23 4 23 10 17 10" />
                                    <polyline points="1 20 1 14 7 14" />
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Station Tabs */}
            <div className="bg-slate-900/50 border-b border-slate-800/80 flex-shrink-0">
                <div className="w-full px-3 md:px-6 py-2">
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {(['all', 'kuchnia', 'grill', 'zimne', 'bar', 'desery', 'wydawka'] as StationFilter[]).map(station => (
                            <button
                                key={station}
                                onClick={() => setActiveStation(station)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all border
                                ${activeStation === station
                                        ? 'bg-slate-100 text-slate-900 border-transparent shadow-lg shadow-white/10'
                                        : 'bg-slate-900/80 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'}`}
                            >
                                {station === 'all' && '📋'}
                                {station === 'kuchnia' && '🍳'}
                                {station === 'grill' && '🔥'}
                                {station === 'zimne' && '❄️'}
                                {station === 'bar' && '🍸'}
                                {station === 'desery' && '🍰'}
                                {station === 'wydawka' && '🔔'}
                                <span className="capitalize">{station === 'all' ? 'Wszystkie' : station}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ml-1
                                    ${activeStation === station ? 'bg-slate-800 text-white' : 'bg-slate-800/80 text-slate-400'}`}>
                                    {stationCounts[station]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content (Kanban columns) */}
            <main
                className="kds-main w-full flex-1 relative overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className={`p-4 h-full ${isMobile ? 'flex flex-row overflow-hidden' : 'flex flex-row gap-6 overflow-x-auto custom-scrollbar px-6'}`}>
                    {isMobile ? (
                        <div
                            className="flex transition-transform duration-300 ease-out h-full whitespace-nowrap w-full"
                            style={{ transform: `translateX(-${activeColumn * 100}%)` }}
                        >
                            {columnsData.map((col, index) => (
                                <div key={index} className="w-full flex-shrink-0 h-full inline-block align-top box-border px-1">
                                    <StatusColumn
                                        title={col.title}
                                        orders={col.orders}
                                        color={col.color}
                                        isActive={index === activeColumn}
                                        handleStartOrder={startOrder}
                                        handleCompleteOrder={completeOrder}
                                        handleBumpOrder={bumpOrder}
                                        handleToggleItem={toggleItem}
                                        activeStation={activeStation}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        columnsData.map((col, index) => (
                            <StatusColumn
                                key={index}
                                title={col.title}
                                orders={col.orders}
                                color={col.color}
                                isActive={true}
                                handleStartOrder={startOrder}
                                handleCompleteOrder={completeOrder}
                                handleBumpOrder={bumpOrder}
                                handleToggleItem={toggleItem}
                                activeStation={activeStation}
                            />
                        ))
                    )}
                </div>
            </main>

            {/* Mobile Indicators */}
            {isMobile && (
                <div className="flex justify-center items-center gap-2 py-3 bg-slate-900/50 flex-shrink-0 border-t border-slate-800">
                    {columnsData.map((col, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveColumn(index)}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === activeColumn
                                ? `bg-gradient-to-r ${col.color} w-8`
                                : 'bg-slate-700 hover:bg-slate-600'
                                }`}
                            aria-label={`Przejdź do ${col.title}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
