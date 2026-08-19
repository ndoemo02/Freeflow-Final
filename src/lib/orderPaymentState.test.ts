/**
 * P4-B — kontrakt stanu platnosci zamowienia
 * ===========================================================================
 * Do dzis "czy zaplacone" wynikalo z obecnosci markera `[stripe_test_paid:…]`
 * w polu `notes` (ClientPanel.tsx:348). Marker byl obejsciem faktu, ze stara
 * baza odrzucala status 'confirmed' — a nie kontraktem.
 *
 * Po P4 zrodlem prawdy jest status 'confirmed' albo wypelnione confirmed_at.
 * Notatka klienta nie jest juz nosnikiem stanu i nie moze na ten stan wplywac.
 * ===========================================================================
 */

import { describe, it, expect } from 'vitest';
import { isOrderPaid } from './orderPaymentState';

describe('P4-B / isOrderPaid', () => {
    it('status confirmed oznacza zaplacone', () => {
        expect(isOrderPaid({ status: 'confirmed' })).toBe(true);
    });

    it('wypelnione confirmed_at oznacza zaplacone nawet po zmianie statusu przez kuchnie', () => {
        expect(isOrderPaid({ status: 'preparing', confirmed_at: '2026-08-19T10:00:00Z' })).toBe(true);
    });

    it('zamowienie oczekujace nie jest zaplacone', () => {
        expect(isOrderPaid({ status: 'pending' })).toBe(false);
    });

    it('puste confirmed_at nie oznacza zaplaty', () => {
        expect(isOrderPaid({ status: 'pending', confirmed_at: null })).toBe(false);
        expect(isOrderPaid({ status: 'pending', confirmed_at: '' })).toBe(false);
    });

    it('marker w notatce NIE jest juz dowodem zaplaty', () => {
        expect(isOrderPaid({ status: 'pending', notes: '[stripe_test_paid:cs_test_1]' })).toBe(false);
    });

    it('brak zamowienia nie wywraca funkcji', () => {
        expect(isOrderPaid(null)).toBe(false);
        expect(isOrderPaid(undefined)).toBe(false);
    });

    it('status rozpoznawany bez wzgledu na wielkosc liter i biale znaki', () => {
        expect(isOrderPaid({ status: ' Confirmed ' })).toBe(true);
    });
});
