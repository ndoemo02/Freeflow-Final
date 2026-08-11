import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBrainSession } from '../../src/hooks/useBrainSession';

// Mock dependencies
vi.mock('../../src/lib/config', () => ({
    getApiUrl: vi.fn((path) => `http://localhost/${path}`)
}));

vi.mock('../../src/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn()
    }
}));

vi.mock('../../src/tts/ttsManager', () => ({
    ttsManager: {
        stop: vi.fn()
    }
}));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        clear: vi.fn(() => {
            store = {};
        })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useBrainSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
        (fetch as any).mockClear();
    });

    it('should ignore sendMessage calls within 1500ms of conversationClosed', async () => {
        // Setup mock response that closes conversation
        const closeResponse = {
            ok: true,
            session_id: 'sess_1',
            reply: 'Zamówienie złożone.',
            conversationClosed: true,
            newSessionId: 'sess_new',
            closedReason: 'ORDER_CONFIRMED'
        };

        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => closeResponse
        });

        const { result } = renderHook(() => useBrainSession());

        // 1. First send: should trigger conversationClosed
        let firstCallPromise: any;
        await act(async () => {
            firstCallPromise = result.current.sendMessage('potwierdzam');
        });
        await firstCallPromise;

        expect(result.current.sessionId).toBe('sess_new');

        // 2. Second send: should be ignored due to cooldown
        let secondCallResult: any;
        await act(async () => {
            secondCallResult = await result.current.sendMessage('potwierdzam');
        });

        expect(secondCallResult).toBeNull();
        expect(fetch).toHaveBeenCalledTimes(1); // Should not have called fetch a second time
    });

    it('should allow sendMessage calls after 1500ms cooldown', async () => {
        vi.useFakeTimers();

        const closeResponse = {
            ok: true,
            session_id: 'sess_1',
            reply: 'Zamówienie złożone.',
            conversationClosed: true,
            newSessionId: 'sess_new',
            closedReason: 'ORDER_CONFIRMED'
        };

        const nextResponse = {
            ok: true,
            session_id: 'sess_new',
            reply: 'W czym mogę jeszcze pomóc?'
        };

        (fetch as any)
            .mockResolvedValueOnce({ ok: true, json: async () => closeResponse })
            .mockResolvedValueOnce({ ok: true, json: async () => nextResponse });

        const { result } = renderHook(() => useBrainSession());

        // 1. Close session
        await act(async () => {
            await result.current.sendMessage('potwierdzam');
        });

        // 2. Wait 1600ms
        act(() => {
            vi.advanceTimersByTime(1600);
        });

        // 3. Send next message: should NOT be ignored
        let secondCallResult: any;
        await act(async () => {
            secondCallResult = await result.current.sendMessage('nowa wiadomość');
        });

        expect(secondCallResult).not.toBeNull();
        expect(fetch).toHaveBeenCalledTimes(2);

        vi.useRealTimers();
    });
});
