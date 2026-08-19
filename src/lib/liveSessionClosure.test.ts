/**
 * P4-C — kontrakt zamkniecia sesji live po potwierdzeniu zamowienia
 * ===========================================================================
 * Dzis zamkniecie sesji jest przypiete do finalizeOrder, czyli za krokiem,
 * ktory zawsze padal — stad Ghost Cart (CLAUDE.md §10).
 *
 * Kontrakt docelowy: potwierdzenie glosowe ("czy to wszystko?" -> "tak")
 * konczy sesje live i wyswietla koszyk. Potwierdzenie manualne w koszyku
 * tworzy zamowienie i uruchamia platnosc — to juz poza sesja live.
 *
 * Twardy warunek: zamkniecie MUSI nastapic PO zakonczeniu tury audio.
 * Zamkniete za wczesnie ucina Amber w polowie zdania.
 * ===========================================================================
 */

import { describe, it, expect } from 'vitest';
import { createSessionClosureLatch } from './liveSessionClosure';

describe('P4-C / zbrojenie zatrzasku', () => {
    it('confirm_order zbroi zatrzask', () => {
        const zatrzask = createSessionClosureLatch();
        zatrzask.armForTool('confirm_order');
        expect(zatrzask.isArmed()).toBe(true);
    });

    it('inne narzedzia koszyka NIE koncza sesji', () => {
        for (const tool of ['open_checkout', 'create_order', 'add_item_to_cart', 'get_cart_state']) {
            const zatrzask = createSessionClosureLatch();
            zatrzask.armForTool(tool);
            expect(zatrzask.isArmed()).toBe(false);
        }
    });

    it('nazwa narzedzia rozpoznawana mimo wielkosci liter i spacji', () => {
        const zatrzask = createSessionClosureLatch();
        zatrzask.armForTool(' Confirm_Order ');
        expect(zatrzask.isArmed()).toBe(true);
    });
});

describe('P4-C / moment zamkniecia', () => {
    it('nie zamyka sesji, dopoki tura sie nie skonczyla', () => {
        const zatrzask = createSessionClosureLatch();
        zatrzask.armForTool('confirm_order');
        zatrzask.notePlaybackStarted();

        expect(zatrzask.notePlaybackStopped()).toBe(false);
    });

    it('turnComplete przy trwajacym audio NIE zamyka - czeka na koniec wypowiedzi', () => {
        const zatrzask = createSessionClosureLatch();
        zatrzask.armForTool('confirm_order');
        zatrzask.notePlaybackStarted();

        expect(zatrzask.noteTurnComplete()).toBe(false);
    });

    it('zamyka dopiero gdy audio ucichlo PO turnComplete', () => {
        const zatrzask = createSessionClosureLatch();
        zatrzask.armForTool('confirm_order');
        zatrzask.notePlaybackStarted();
        zatrzask.noteTurnComplete();

        expect(zatrzask.notePlaybackStopped()).toBe(true);
    });

    it('tura bez audio zamyka sie na samym turnComplete', () => {
        const zatrzask = createSessionClosureLatch();
        zatrzask.armForTool('confirm_order');

        expect(zatrzask.noteTurnComplete()).toBe(true);
    });

    it('bez zbrojenia nic nie zamyka sesji', () => {
        const zatrzask = createSessionClosureLatch();
        expect(zatrzask.noteTurnComplete()).toBe(false);
        expect(zatrzask.notePlaybackStopped()).toBe(false);
    });

    it('zamkniecie zglaszane jest DOKLADNIE raz', () => {
        const zatrzask = createSessionClosureLatch();
        zatrzask.armForTool('confirm_order');
        zatrzask.notePlaybackStarted();
        zatrzask.noteTurnComplete();

        expect(zatrzask.notePlaybackStopped()).toBe(true);
        expect(zatrzask.notePlaybackStopped()).toBe(false);
        expect(zatrzask.noteTurnComplete()).toBe(false);
    });

    it('reset rozbraja zatrzask - nowa sesja zaczyna od zera', () => {
        const zatrzask = createSessionClosureLatch();
        zatrzask.armForTool('confirm_order');
        zatrzask.reset();

        expect(zatrzask.isArmed()).toBe(false);
        expect(zatrzask.noteTurnComplete()).toBe(false);
    });
});
