/**
 * DEFINICJA ENUM dla Trybów UI.
 * Musi być rozłączna - UI renderuje TYLKO to, co wynika z tego pola.
 */
export type UIMode =
    | 'idle'                     // Stan spoczynku
    | 'restaurant_presentation'  // Karuzela restauracji
    | 'menu_presentation'        // Lista dań / menu
    | 'cart_summary'             // Podsumowanie koszyka
    | 'confirmation'             // Ekran potwierdzenia (np. zamówienia)
    | 'standard_chat';           // Dodane dla kompatybilności wstecznej (jesli potrzebne)

export interface PresentationStep {
    /**
     * Numer indeksu kroku w sekwencji.
     * Kluczowe dla synchronizacji TTS, scrolla i wznawiania.
     */
    step_index: number;

    /**
     * Unikalny identyfikator elementu UI (np. UUID restauracji),
     * który ma otrzymać fokus wizualny.
     */
    card_id: string;

    /**
     * Tekst, który zostanie zsyntezowany przez TTS w tym konkretnym kroku.
     */
    tts_narrative: string;
}

/**
 * Główny Kontrakt LLM <-> UI.
 * Definiuje strukturę JSON, którą musi zwrócić LLM.
 */
export interface LLMContract {
    /**
     * Tryb zachowania interfejsu.
     * UI reaguje na to pole switch case'm.
     */
    ui_mode: UIMode;

    /**
     * Tekst wstępny, czytany przez TTS zanim rozpocznie się sekwencja kroków.
     * Opcjonalny.
     */
    voice_intro?: string;

    /**
     * Lista kroków prezentacji.
     * Opcjonalna (np. gdy tryb to idle lub tylko pytanie).
     */
    presentation_sequence?: PresentationStep[];

    /**
     * Pytanie kończące interakcję w tej turze.
     * Opcjonalne.
     */
    closing_question?: string;

    /**
     * Flaga sterująca stanem mikrofonu po zakończeniu syntezy.
     * true = otwórz mikrofon i czekaj na input.
     * false = zakończ, czekaj na kliknięcie.
     */
    expect_selection: boolean;

    /**
     * Dodatkowe dane dynamiczne (opcjonalne).
     */
    payload?: any;
}

// Alias dla kompatybilności wstecznej, jeśli gdzieś jeszcze używamy starej nazwy w trakcie refactoringu
export type VoiceUIResponse = LLMContract;
