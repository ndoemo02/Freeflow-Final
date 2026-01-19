/**
 * useKDSPolling - Hook for KDS order polling with focus-aware abort
 * 
 * CONSTRAINTS:
 * - KDS does NOT decide logic
 * - Backend FSM is authoritative
 * - Polling pauses when window loses focus (abort on blur)
 * - Resumes on focus
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    fetchKDSOrders,
    KDSOrder,
    KDSDashboardResponse,
    startOrder as apiStartOrder,
    markOrderReady as apiMarkOrderReady,
    toggleOrderItem as apiToggleOrderItem,
    completeOrder as apiCompleteOrder,
    bumpOrder as apiBumpOrder,
    recallLastOrder as apiRecallLastOrder,
} from '../lib/kdsApi';

const DEFAULT_POLL_INTERVAL = 5000; // 5 seconds

export interface UseKDSPollingOptions {
    pollInterval?: number;
    enabled?: boolean;
}

export interface UseKDSPollingReturn {
    orders: KDSOrder[];
    stats: {
        newCount: number;
        preparingCount: number;
        readyCount: number;
        avgTimeMinutes: number;
    };
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date | null;
    isPolling: boolean;

    // Actions (all call backend - no local mutations)
    refresh: () => Promise<void>;
    startOrder: (orderId: string) => Promise<boolean>;
    markOrderReady: (orderId: string) => Promise<boolean>;
    toggleItem: (orderId: string, itemIndex: number) => Promise<boolean>;
    completeOrder: (orderId: string) => Promise<boolean>;
    bumpOrder: (orderId: string) => Promise<boolean>;
    recallLastOrder: () => Promise<boolean>;
}

export function useKDSPolling(options: UseKDSPollingOptions = {}): UseKDSPollingReturn {
    const { pollInterval = DEFAULT_POLL_INTERVAL, enabled = true } = options;

    // State
    const [orders, setOrders] = useState<KDSOrder[]>([]);
    const [stats, setStats] = useState({
        newCount: 0,
        preparingCount: 0,
        readyCount: 0,
        avgTimeMinutes: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isPolling, setIsPolling] = useState(true);

    // Refs for cleanup
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Fetch orders from backend
     */
    const fetchData = useCallback(async () => {
        // Create new abort controller for this request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            setError(null);
            const response: KDSDashboardResponse = await fetchKDSOrders();

            if (response.ok) {
                setOrders(response.orders);
                setStats({
                    newCount: response.stats.new_count,
                    preparingCount: response.stats.preparing_count,
                    readyCount: response.stats.ready_count,
                    avgTimeMinutes: response.stats.avg_time_minutes,
                });
                setLastUpdated(new Date(response.last_updated));
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                // Request was aborted, ignore
                return;
            }
            console.error('[useKDSPolling] Fetch error:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch orders');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Manual refresh
     */
    const refresh = useCallback(async () => {
        setIsLoading(true);
        await fetchData();
    }, [fetchData]);

    /**
     * Start polling
     */
    const startPolling = useCallback(() => {
        if (pollIntervalRef.current) return; // Already polling

        setIsPolling(true);
        pollIntervalRef.current = setInterval(fetchData, pollInterval);
    }, [fetchData, pollInterval]);

    /**
     * Stop polling (on blur)
     */
    const stopPolling = useCallback(() => {
        setIsPolling(false);

        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        // Abort any in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    // ============== Actions (ALL call backend, NO local mutations) ==============

    const startOrder = useCallback(async (orderId: string): Promise<boolean> => {
        const result = await apiStartOrder(orderId);
        if (result.ok) {
            await refresh(); // Refresh from backend - single source of truth
        }
        return result.ok;
    }, [refresh]);

    const markOrderReady = useCallback(async (orderId: string): Promise<boolean> => {
        const result = await apiMarkOrderReady(orderId);
        if (result.ok) {
            await refresh();
        }
        return result.ok;
    }, [refresh]);

    const toggleItem = useCallback(async (orderId: string, itemIndex: number): Promise<boolean> => {
        const result = await apiToggleOrderItem(orderId, itemIndex);
        if (result.ok) {
            await refresh();
        }
        return result.ok;
    }, [refresh]);

    const completeOrder = useCallback(async (orderId: string): Promise<boolean> => {
        const result = await apiCompleteOrder(orderId);
        if (result.ok) {
            await refresh();
        }
        return result.ok;
    }, [refresh]);

    const bumpOrder = useCallback(async (orderId: string): Promise<boolean> => {
        const result = await apiBumpOrder(orderId);
        if (result.ok) {
            await refresh();
        }
        return result.ok;
    }, [refresh]);

    const recallLastOrder = useCallback(async (): Promise<boolean> => {
        const result = await apiRecallLastOrder();
        if (result.ok) {
            await refresh();
        }
        return result.ok;
    }, [refresh]);

    // ============== Effects ==============

    // Initial fetch and polling setup
    useEffect(() => {
        if (!enabled) return;

        // Initial fetch
        fetchData();

        // Start polling
        startPolling();

        // Cleanup
        return () => {
            stopPolling();
        };
    }, [enabled, fetchData, startPolling, stopPolling]);

    // Focus/blur handlers - abort polling on blur, resume on focus
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Page is hidden - stop polling
                stopPolling();
            } else {
                // Page is visible - resume polling and fetch fresh data
                fetchData();
                startPolling();
            }
        };

        const handleFocus = () => {
            // Window gained focus - resume polling and fetch fresh data
            fetchData();
            startPolling();
        };

        const handleBlur = () => {
            // Window lost focus - stop polling
            stopPolling();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, [fetchData, startPolling, stopPolling]);

    return {
        orders,
        stats,
        isLoading,
        error,
        lastUpdated,
        isPolling,
        refresh,
        startOrder,
        markOrderReady,
        toggleItem,
        completeOrder,
        bumpOrder,
        recallLastOrder,
    };
}
