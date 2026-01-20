/**
 * BusinessPanelNew - Kitchen Display System (KDS)
 * 
 * CONSTRAINTS:
 * - KDS does NOT decide logic
 * - Backend FSM is authoritative
 * - ALL actions call backend (no local mutations)
 * - Status = backend truth
 * - Polling (5s) with abort on blur
 * 
 * Uses:
 * - useKDSPolling hook for data fetching and actions
 * - kdsApi for status mapping and display helpers
 */

import React, { useState, useMemo } from 'react';
import { useKDSPolling } from '../hooks/useKDSPolling';
import {
    KDSOrder,
    BackendOrderStatus,
    mapStatusToKDS,
    getTimerClass,
    getStatusBadge,
    getChannelDisplay,
    getElapsedSeconds,
    getElapsedMinutes,
    formatTime,
} from '../lib/kdsApi';

// ============================================================================
// KDS Settings
// ============================================================================
const DEFAULT_WARNING_TIME = 10;  // minutes
const DEFAULT_CRITICAL_TIME = 20; // minutes

// ============================================================================
// Types
// ============================================================================
type StationFilter = 'all' | 'kuchnia' | 'grill' | 'zimne' | 'bar' | 'desery' | 'wydawka';

// ============================================================================
// Component
// ============================================================================
export default function BusinessPanelNew() {
    // Local UI state only (no order mutations)
    const [activeStation, setActiveStation] = useState<StationFilter>('all');
    const [warningTime] = useState(DEFAULT_WARNING_TIME);
    const [criticalTime] = useState(DEFAULT_CRITICAL_TIME);

    // KDS polling hook - all data and actions from backend
    const {
        orders,
        stats,
        isLoading,
        error,
        isPolling,
        refresh,
        startOrder,
        markOrderReady,
        toggleItem,
        completeOrder,
        bumpOrder,
        recallLastOrder,
    } = useKDSPolling({ pollInterval: 5000 });

    // Filter orders by station
    const filteredOrders = useMemo(() => {
        let filtered = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');

        if (activeStation === 'wydawka') {
            // Wydawka = orders with all items done (ready for pickup)
            filtered = filtered.filter(o => o.items.every(i => i.done));
        } else if (activeStation !== 'all') {
            // Filter by station - show orders that have items for this station
            filtered = filtered.filter(o =>
                o.items.some(item => item.station === activeStation && !item.done)
            );
        }

        // Sort: priority first, then new, then by time
        return filtered.sort((a, b) => {
            if (a.priority && !b.priority) return -1;
            if (!a.priority && b.priority) return 1;
            if ((a.status === 'pending' || a.status === 'new') &&
                (b.status !== 'pending' && b.status !== 'new')) return -1;
            if ((b.status === 'pending' || b.status === 'new') &&
                (a.status !== 'pending' && a.status !== 'new')) return 1;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
    }, [orders, activeStation]);

    // Station counts
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

    // Handle order actions (all call backend - no local mutations)
    const handleStartOrder = async (orderId: string) => {
        await startOrder(orderId);
    };

    const handleCompleteOrder = async (orderId: string) => {
        await completeOrder(orderId);
    };

    const handleBumpOrder = async (orderId: string) => {
        await bumpOrder(orderId);
    };

    const handleToggleItem = async (orderId: string, itemIndex: number) => {
        await toggleItem(orderId, itemIndex);
    };

    const handleRecallLast = async () => {
        await recallLastOrder();
    };

    // Render order card
    const renderOrderCard = (order: KDSOrder) => {
        const elapsedSecs = getElapsedSeconds(order.created_at);
        const elapsedMins = getElapsedMinutes(order.created_at);
        const kdsStatus = mapStatusToKDS(order.status, elapsedMins, warningTime, criticalTime);
        const timerClass = getTimerClass(elapsedMins, warningTime, criticalTime);
        const channel = getChannelDisplay(order.channel);
        const doneCount = order.items.filter(i => i.done).length;
        const progress = Math.round((doneCount / order.items.length) * 100);
        const allDone = order.items.every(i => i.done);
        const isNew = order.status === 'pending' || order.status === 'new';

        // Filter items by active station
        const displayItems = activeStation === 'all' || activeStation === 'wydawka'
            ? order.items
            : order.items.filter(i => i.station === activeStation);

        return (
            <div
                key={order.id}
                className={`order-card ${kdsStatus || ''} rounded-xl overflow-hidden`}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-2xl font-black">#{order.order_number}</span>
                            {order.priority && (
                                <span className="priority-high px-2 py-0.5 rounded text-xs font-bold uppercase">
                                    PILNE
                                </span>
                            )}
                        </div>
                        <div className={`font-mono text-2xl font-black ${timerClass}`}>
                            {formatTime(elapsedSecs)}
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`px-2 py-1 ${channel.cssClass} rounded text-xs font-bold uppercase`}>
                                <i className={`fas ${channel.icon} mr-1`} />
                                {channel.short}
                            </span>
                            <span className="text-sm text-gray-400 truncate">
                                📍 {order.location}
                            </span>
                        </div>
                        {isNew && (
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-bold animate-pulse">
                                NOWE
                            </span>
                        )}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{doneCount}/{order.items.length}</span>
                    </div>
                </div>

                {/* Items */}
                <div className="p-3 space-y-1 max-h-60 overflow-y-auto">
                    {displayItems.map((item, idx) => {
                        const itemIndex = order.items.indexOf(item);
                        return (
                            <div
                                key={idx}
                                onClick={() => handleToggleItem(order.id, itemIndex)}
                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all active:scale-[0.98] 
                  ${item.done ? 'bg-emerald-500/15 opacity-50 line-through' : 'bg-white/5 hover:bg-white/10'}`}
                            >
                                <div className={`w-9 h-9 flex items-center justify-center rounded-lg ${item.done ? 'bg-emerald-500 text-white' : 'bg-white/10'} font-bold text-sm`}>
                                    {item.done ? '✓' : item.quantity}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{item.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {item.station && (
                                            <span className={`px-1.5 py-0.5 station-${item.station} rounded text-[10px] font-bold uppercase`}>
                                                {item.station}
                                            </span>
                                        )}
                                        {item.prep_time && (
                                            <span className="text-xs text-gray-500">{item.prep_time} min</span>
                                        )}
                                    </div>
                                </div>
                                {item.quantity > 1 && (
                                    <span className="text-lg font-bold text-gray-500">×{item.quantity}</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Note */}
                {order.notes && (
                    <div className="px-3 pb-2">
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-xs text-amber-300">
                                ⚠️ {order.notes}
                            </p>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="p-3 pt-0 border-t border-white/5 mt-1">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => {/* Print functionality */ }}
                            className="p-3 bg-white/5 hover:bg-white/15 rounded-xl transition-all"
                            title="Drukuj"
                        >
                            🖨️
                        </button>
                        <button
                            onClick={() => {/* Details modal */ }}
                            className="p-3 bg-white/5 hover:bg-white/15 rounded-xl transition-all"
                            title="Szczegóły"
                        >
                            🔍
                        </button>
                        {isNew ? (
                            <button
                                onClick={() => handleStartOrder(order.id)}
                                className="p-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-90 rounded-xl transition-all text-white"
                                title="Rozpocznij"
                            >
                                ▶️
                            </button>
                        ) : allDone ? (
                            <button
                                onClick={() => handleCompleteOrder(order.id)}
                                className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 rounded-xl transition-all text-white"
                                title="Gotowe"
                            >
                                ✅
                            </button>
                        ) : (
                            <button
                                onClick={() => handleBumpOrder(order.id)}
                                className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 rounded-xl transition-all text-white"
                                title="Bump"
                            >
                                ➡️
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Render
    return (
        <div className="min-h-screen bg-[#05060a] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        {/* Logo & Clock */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                                🍳
                            </div>
                            <div>
                                <h1 className="text-xl font-black bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
                                    KDS
                                </h1>
                                <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">
                                    Kitchen Display
                                </p>
                            </div>

                            {/* Live indicator */}
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-xl border border-white/10">
                                <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                                <span className="font-mono text-lg font-bold">
                                    {new Date().toLocaleTimeString('pl-PL')}
                                </span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="hidden lg:flex items-center gap-6 px-5 py-2.5 bg-white/5 rounded-xl border border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                                <span className="text-gray-400 text-sm">Nowe</span>
                                <span className="font-mono font-bold text-amber-400 text-lg">{stats.newCount}</span>
                            </div>
                            <div className="w-px h-5 bg-white/10" />
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-sky-400 rounded-full" />
                                <span className="text-gray-400 text-sm">Realizacja</span>
                                <span className="font-mono font-bold text-sky-400 text-lg">{stats.preparingCount}</span>
                            </div>
                            <div className="w-px h-5 bg-white/10" />
                            <div className="flex items-center gap-2">
                                ⏱️
                                <span className="text-gray-400 text-sm">Średnio</span>
                                <span className="font-mono font-bold text-white text-lg">{stats.avgTimeMinutes}:00</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRecallLast}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
                                title="Przywróć ostatnie"
                            >
                                ↩️
                            </button>
                            <button
                                onClick={refresh}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
                                title="Odśwież"
                            >
                                🔄
                            </button>
                        </div>
                    </div>
                </div>

                {/* Station Tabs */}
                <div className="px-4 py-2 border-t border-white/5">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {(['all', 'kuchnia', 'grill', 'zimne', 'bar', 'desery', 'wydawka'] as StationFilter[]).map(station => (
                            <button
                                key={station}
                                onClick={() => setActiveStation(station)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
                  ${activeStation === station
                                        ? 'bg-white text-gray-900'
                                        : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
                            >
                                {station === 'all' && '📋'}
                                {station === 'kuchnia' && '🍳'}
                                {station === 'grill' && '🔥'}
                                {station === 'zimne' && '❄️'}
                                {station === 'bar' && '🍸'}
                                {station === 'desery' && '🍰'}
                                {station === 'wydawka' && '🔔'}
                                <span className="capitalize">{station === 'all' ? 'Wszystkie' : station}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                  ${activeStation === station ? 'bg-gray-900 text-white' : 'bg-white/10'}`}>
                                    {stationCounts[station]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-xl text-gray-400">Ładowanie zamówień...</div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-xl text-red-400">{error}</div>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500/30 mb-8">
                            ✅
                        </div>
                        <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                            Wszystko gotowe!
                        </h3>
                        <p className="text-gray-500 text-center">
                            Brak aktywnych zamówień.<br />Czas na przerwę ☕
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {filteredOrders.map(renderOrderCard)}
                    </div>
                )}
            </main>

            {/* CSS for KDS styles */}
            <style>{`
        .order-card {
          background: #13151c;
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.3s ease;
        }
        .order-card:hover {
          background: #1a1d26;
          border-color: rgba(255,255,255,0.1);
        }
        .status-new {
          border-left: 4px solid #fbbf24;
          animation: glow-yellow 2s ease-in-out infinite;
        }
        .status-warning {
          border-left: 4px solid #f97316;
          animation: glow-orange 1.8s ease-in-out infinite;
        }
        .status-urgent {
          border-left: 4px solid #ef4444;
          background: linear-gradient(135deg, rgba(239,68,68,0.12) 0%, #13151c 60%);
          animation: glow-red 1.2s ease-in-out infinite;
        }
        @keyframes glow-yellow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
          50% { box-shadow: 0 0 25px 3px rgba(251, 191, 36, 0.15); }
        }
        @keyframes glow-orange {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
          50% { box-shadow: 0 0 30px 5px rgba(249, 115, 22, 0.2); }
        }
        @keyframes glow-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          50% { box-shadow: 0 0 40px 8px rgba(239, 68, 68, 0.25); }
        }
        .timer-ok { color: #4ade80; }
        .timer-warning { color: #fb923c; }
        .timer-critical { 
          color: #f87171; 
          text-shadow: 0 0 20px rgba(248, 113, 113, 0.5);
        }
        .priority-high {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          animation: pulse 1s ease-in-out infinite;
        }
        .channel-restaurant { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .channel-hotel { background: linear-gradient(135deg, #a855f7, #9333ea); }
        .channel-delivery { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .station-kuchnia { background: linear-gradient(135deg, #f97316, #ea580c); }
        .station-bar { background: linear-gradient(135deg, #a855f7, #7c3aed); }
        .station-grill { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .station-zimne { background: linear-gradient(135deg, #22d3ee, #06b6d4); }
        .station-desery { background: linear-gradient(135deg, #f472b6, #ec4899); }
      `}</style>
        </div>
    );
}
