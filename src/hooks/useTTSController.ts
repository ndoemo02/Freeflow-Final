/**
 * useTTSController - Controls Text-to-Speech playback
 * 
 * Responsibilities:
 * - Play TTS audio for a given text
 * - Stop current playback
 * - Track playing state
 * - Handle preloaded audio cache
 * 
 * This hook has ZERO domain knowledge - it only handles audio playback.
 */

import { useState, useRef, useCallback } from 'react';
import { speakTts } from '../lib/ttsClient';
import { logger } from '../lib/logger';

export interface UseTTSControllerReturn {
    isPlaying: boolean;
    playTTS: (text: string) => Promise<void>;
    stopTTS: () => void;
    setPreloadedAudio: (text: string, base64: string) => void;
}

export function useTTSController(): UseTTSControllerReturn {
    const [isPlaying, setIsPlaying] = useState(false);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const preloadedAudioRef = useRef<{ text: string; base64: string } | null>(null);

    /**
     * Set preloaded audio from backend response for instant playback
     */
    const setPreloadedAudio = useCallback((text: string, base64: string) => {
        preloadedAudioRef.current = { text, base64 };
    }, []);

    /**
     * Play TTS for the given text
     */
    const playTTS = useCallback(async (text: string): Promise<void> => {
        if (!text.trim()) return;

        setIsPlaying(true);

        try {
            let audio: HTMLAudioElement;

            // Check for cached/preloaded audio
            const cached = preloadedAudioRef.current;
            logger.debug(`🔊 [playTTS] Incoming: "${text.substring(0, 20)}...", Cached: "${cached?.text?.substring(0, 20)}..."`);

            const matches = cached && (
                cached.text.trim() === text.trim() ||
                text.includes(cached.text.substring(0, 15)) ||
                cached.text.includes(text.substring(0, 15))
            );

            if (matches && cached) {
                logger.info("🔊 [TTS] Playing PRELOADED audio from backend cache");
                audio = new Audio(`data:audio/mp3;base64,${cached.base64}`);
                preloadedAudioRef.current = null; // Use once
            } else {
                logger.info("🔊 [TTS] Fetching TTS for text:", text.substring(0, 40) + "...");

                // Speed up list items and narratives to feel less "slow"
                const isNarrative = text.includes('.') && text.length < 100 && !text.includes('?');
                const speakingRate = isNarrative ? 1.15 : 1.05;

                audio = await speakTts(text, {
                    voiceName: 'pl-PL-Wavenet-A',
                    speakingRate: speakingRate
                });
            }

            currentAudioRef.current = audio;

            // Play and wait for completion
            await audio.play();

            if (!audio.paused || !audio.ended) {
                await new Promise<void>(resolve => {
                    audio.onended = () => resolve();
                    audio.onerror = (e) => {
                        logger.error("Audio playback error:", e);
                        resolve();
                    };
                });
            }

            logger.info("✅ [TTS] Audio playback finished");
        } catch (e) {
            logger.error("TTS Output Error:", e);
        } finally {
            setIsPlaying(false);
            currentAudioRef.current = null;
        }
    }, []);

    /**
     * Stop current TTS playback
     */
    const stopTTS = useCallback(() => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    return {
        isPlaying,
        playTTS,
        stopTTS,
        setPreloadedAudio,
    };
}
