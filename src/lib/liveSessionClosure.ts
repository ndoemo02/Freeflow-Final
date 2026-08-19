/**
 * Zatrzask zamkniecia sesji live po potwierdzeniu zamowienia (P4-C, zadanie #13).
 *
 * PROBLEM: zamkniecie sesji bylo przypiete do finalizeOrder — kroku, ktory
 * nigdy nie zadzialal (CLAUDE.md §10). Sesja live zostawala otwarta po
 * potwierdzeniu, co produkowalo Ghost Cart.
 *
 * KONTRAKT: potwierdzenie glosowe konczy sesje live i zostawia koszyk na
 * ekranie. Utworzenie zamowienia i platnosc sa juz poza sesja glosowa.
 *
 * DLACZEGO ZATRZASK, A NIE WYWOLANIE WPROST: zamkniecie polaczenia w chwili
 * przyjscia tool_call ucieloby Amber w polowie zdania — model dopiero po
 * odpowiedzi narzedzia generuje wypowiedz koncowa, a audio splywa strumieniem
 * jeszcze po `turnComplete`. Zamkniecie wymaga wiec DWOCH warunkow naraz:
 * koniec generowania (turnComplete) ORAZ cisza w odtwarzaczu.
 *
 * Modul jest czysty (zero Reacta, zero WebSocketa), zeby ten warunek dalo sie
 * przetestowac bez uruchamiania calej sesji.
 */

/** Jedyne narzedzie konczace sesje. 'open_checkout' i 'create_order' NIE koncza. */
const TOOL_KONCZACY_SESJE = 'confirm_order';

export interface SessionClosureLatch {
    /** Zbroi zatrzask, jesli narzedzie jest tym konczacym sesje. */
    armForTool(toolName: string): void;
    /** Model skonczyl generowac ture. Zwraca true, gdy to juz moment zamkniecia. */
    noteTurnComplete(): boolean;
    /** Odtwarzacz zaczal mowic. */
    notePlaybackStarted(): void;
    /** Odtwarzacz ucichl. Zwraca true, gdy to juz moment zamkniecia. */
    notePlaybackStopped(): boolean;
    isArmed(): boolean;
    /** Rozbraja - uzywane przy starcie i zatrzymaniu sesji. */
    reset(): void;
}

export function createSessionClosureLatch(): SessionClosureLatch {
    let armed = false;
    let turnCompleted = false;
    let playing = false;
    let fired = false;

    /** Zamykamy raz, po spelnieniu obu warunkow naraz. */
    function rozstrzygnij(): boolean {
        if (!armed || fired || !turnCompleted || playing) return false;
        fired = true;
        return true;
    }

    return {
        armForTool(toolName: string): void {
            if (fired) return;
            if (String(toolName || '').trim().toLowerCase() !== TOOL_KONCZACY_SESJE) return;
            armed = true;
        },

        noteTurnComplete(): boolean {
            turnCompleted = true;
            return rozstrzygnij();
        },

        notePlaybackStarted(): void {
            playing = true;
        },

        notePlaybackStopped(): boolean {
            playing = false;
            return rozstrzygnij();
        },

        isArmed(): boolean {
            return armed;
        },

        reset(): void {
            armed = false;
            turnCompleted = false;
            playing = false;
            fired = false;
        },
    };
}
