import { LLMContract } from './llmContract';
import { logger } from './logger';

// Typy pomocnicze dla funkcji sterujących UI
export interface UIController {
    stopAllTTS: () => void;
    playTTS: (text: string) => Promise<void>;

    clearHighlights: () => void;
    highlightCard: (cardId: string) => void;
    unhighlightCard: (cardId: string) => void;
    scrollToCard: (cardId: string) => void;

    lockUserInput: () => void;
    unlockUserInput: () => void;
    openMicrophone: () => void;

    setUIMode: (mode: LLMContract['ui_mode']) => void;
}

// Globalny lock chroniący przed re-entrancy
let isRendering = false;

// Flaga aborcji - pozwala na przerwanie pętli renderowania
let abort = false;

export function abortRender() {
    logger.info("🛑 [RenderFromLLM] Abort requested");
    abort = true;
}

/**
 * SERCE PREZENTACJI GŁOSOWEJ.
 * 
 * Ta funkcja jest całkowicie deterministyczna.
 * Nie podejmuje decyzji - tylko wykonuje instrukcje z kontraktu.
 * Wykonywana jest liniowo (await za await), aby uniknąć race conditions.
 */
export async function renderFromLLM(contract: LLMContract, ui: UIController) {
    logger.info("🚀 [RenderEngine V3] Start", contract);

    // (A) Guard: Re-entrancy Lock
    if (isRendering) {
        logger.warn("⚠️ [RenderFromLLM] Already running — request ignored");
        return;
    }

    isRendering = true;
    abort = false;

    try {
        // 1. HARD RESET UI STATE
        ui.stopAllTTS();
        ui.clearHighlights();
        ui.lockUserInput();

        if (abort) return;

        // 2. SWITCH TYLKO PO ui_mode
        switch (contract.ui_mode) {
            case 'idle':
            case 'standard_chat':
                ui.setUIMode('standard_chat');
                break;

            case 'restaurant_presentation':
                ui.setUIMode('restaurant_presentation');
                break;

            case 'menu_presentation':
                ui.setUIMode('menu_presentation');
                break;

            case 'cart_summary':
                ui.setUIMode('cart_summary');
                break;

            case 'confirmation':
                ui.setUIMode('confirmation');
                break;

            default:
                // Fallback instead of crash
                ui.setUIMode('standard_chat');
        }

        // 🔥 FORCE ALL AUDIO (Task 1)
        const allowTTS = true;

        if (abort) return;

        // 3. VOICE INTRO
        if (contract.voice_intro && allowTTS) {
            logger.info("🔊 [Render V3] Intro:", contract.voice_intro.substring(0, 40));
            await ui.playTTS(contract.voice_intro);
        }

        if (abort) return;

        // 4. SEKWENCJA PREZENTACJI (Deterministyczna pętla)
        if (contract.presentation_sequence && contract.presentation_sequence.length > 0) {
            for (const step of contract.presentation_sequence) {
                if (abort) break;

                // A. Wskazujemy palcem (Highlight + Scroll)
                ui.scrollToCard(step.card_id);
                ui.highlightCard(step.card_id);

                // B. Opowiadamy o tym elemencie (tylko w trybach prezentacji)
                if (step.tts_narrative && allowTTS) {
                    await ui.playTTS(step.tts_narrative);
                }

                // C. Zdejmujemy wyróżnienie
                ui.unhighlightCard(step.card_id);
            }
        }

        if (abort) return;

        // 5. CLOSING QUESTION
        if (contract.closing_question && allowTTS) {
            await ui.playTTS(contract.closing_question);
        }

        if (abort) return;

        // 6. STEROWANIE MIKROFONEM
        if (contract.expect_selection) {
            ui.unlockUserInput();
            ui.openMicrophone();
        } else {
            ui.unlockUserInput();
        }

    } catch (error) {
        if (abort) {
            logger.info("🛑 [RenderFromLLM] Aborted during execution");
        } else {
            logger.error("❌ [RenderFromLLM] Critical Error:", error);
        }
        ui.unlockUserInput();
    } finally {
        isRendering = false;
        abort = false;
        logger.info("🏁 [RenderFromLLM] Finished");
    }
}
