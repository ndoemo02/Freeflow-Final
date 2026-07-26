import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CinematicRestaurantCarousel from './CinematicRestaurantCarousel';

vi.mock('../hooks/useIslandFullList', () => ({
    useIslandFullList: vi.fn(),
}));

const ITEMS = [
    { id: 'vien', name: 'Vien-Thien', city: 'Piekary Śląskie' },
    { id: 'rezy', name: 'Rezydencja Luxury Hotel', city: 'Piekary Śląskie' },
];

describe('CinematicRestaurantCarousel interactions', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn((query: string) => ({
                matches: query.includes('max-width'),
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        });
        Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
            configurable: true,
            value: vi.fn(),
        });

        const header = document.createElement('header');
        header.dataset.uiRole = 'home-header';
        header.getBoundingClientRect = () => ({
            top: 0, bottom: 72, left: 0, right: 390, width: 390, height: 72, x: 0, y: 0, toJSON: () => ({}),
        });

        const dock = document.createElement('div');
        dock.dataset.uiRole = 'voice-dock-bar';
        dock.getBoundingClientRect = () => ({
            top: 720, bottom: 800, left: 0, right: 390, width: 390, height: 80, x: 0, y: 720, toJSON: () => ({}),
        });
        document.body.append(header, dock);
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    async function renderCarousel(onSelect = vi.fn()) {
        render(
            <CinematicRestaurantCarousel
                items={ITEMS}
                selectedId="vien"
                onSelect={onSelect}
            />,
        );
        await act(async () => {
            vi.advanceTimersByTime(250);
        });
        return onSelect;
    }

    it('opens a restaurant with one tap on mobile', async () => {
        const onSelect = await renderCarousel();
        const card = screen.getByRole('button', { name: /rezydencja luxury hotel/i });

        fireEvent.pointerDown(card, { pointerId: 1, pointerType: 'touch', clientX: 200, clientY: 300 });
        fireEvent.pointerUp(card, { pointerId: 1, pointerType: 'touch', clientX: 202, clientY: 302 });

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(ITEMS[1]);
    });

    it('does not select a restaurant after a drag gesture', async () => {
        const onSelect = await renderCarousel();
        const card = screen.getByRole('button', { name: /vien-thien/i });

        fireEvent.pointerDown(card, { pointerId: 2, pointerType: 'touch', clientX: 220, clientY: 300 });
        fireEvent.pointerMove(card, { pointerId: 2, pointerType: 'touch', clientX: 120, clientY: 302 });
        fireEvent.pointerUp(card, { pointerId: 2, pointerType: 'touch', clientX: 120, clientY: 302 });

        expect(onSelect).not.toHaveBeenCalled();
    });

    it('opens the focused restaurant with Enter', async () => {
        const onSelect = await renderCarousel();
        const card = screen.getByRole('button', { name: /vien-thien/i });

        fireEvent.keyDown(card, { key: 'Enter' });

        expect(onSelect).toHaveBeenCalledWith(ITEMS[0]);
    });

    it('keeps the next desktop card active after clicking the navigation arrow', async () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn((query: string) => ({
                matches: !query.includes('max-width'),
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        });
        await renderCarousel();

        const next = screen.getByRole('button', { name: '›' });
        fireEvent.pointerDown(next, { pointerId: 4, pointerType: 'mouse', clientX: 400, clientY: 300 });
        fireEvent.click(next);

        expect(screen.getByRole('button', { name: /rezydencja luxury hotel/i })).toHaveAttribute('tabindex', '0');
        expect(screen.getByRole('button', { name: /vien-thien/i })).toHaveAttribute('tabindex', '-1');
    });
});
