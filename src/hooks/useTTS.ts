import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseTTSReturn {
    isSpeaking: boolean;
    play: (text: string, audioContent?: string | null) => void;
    stop: () => void;
    isSupported: boolean;
    currentSource: 'backend' | 'webspeech' | null;
}

/**
 * useTTS - Hybrid TTS Hook
 * 
 * Supports two modes:
 * 1. Backend TTS (Gemini/Vertex) - plays base64 audio from backend
 * 2. WebSpeech fallback - uses browser's speech synthesis
 * 
 * Priority: Backend audio > WebSpeech
 * Admin panel controls: ENGINE TTS, GŁOS TTS, Pitch, Tempo
 */
export function useTTS(): UseTTSReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentSource, setCurrentSource] = useState<'backend' | 'webspeech' | null>(null);

    const synth = window.speechSynthesis;
    const isWebSpeechSupported = !!synth;

    // Audio element ref for backend TTS
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (isWebSpeechSupported) {
                synth.cancel();
            }
        };
    }, [isWebSpeechSupported, synth]);

    // Monitor WebSpeech speaking state
    useEffect(() => {
        if (!isWebSpeechSupported) return;

        const interval = setInterval(() => {
            if (currentSource === 'webspeech') {
                setIsSpeaking(synth.speaking);
            }
        }, 100);

        // Cleanup on page unload / visibility change
        const handleUnload = () => {
            synth.cancel();
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                synth.cancel();
                if (audioRef.current) {
                    audioRef.current.pause();
                }
                setIsSpeaking(false);
                setCurrentSource(null);
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isWebSpeechSupported, synth, currentSource]);

    const stop = useCallback(() => {
        // Stop backend audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        // Stop WebSpeech
        if (isWebSpeechSupported) {
            synth.cancel();
        }

        setIsSpeaking(false);
        setCurrentSource(null);
    }, [isWebSpeechSupported, synth]);

    /**
     * Play TTS
     * 
     * @param text - Text to speak (used for WebSpeech fallback)
     * @param audioContent - Base64 encoded audio from backend (optional)
     */
    const play = useCallback((text: string, audioContent?: string | null) => {
        if (!text) return;

        stop(); // Stop any current speech

        // ═══════════════════════════════════════════════════════════════════════════
        // PRIORITY 1: Backend Audio (Gemini/Vertex/Google Cloud TTS)
        // If audioContent is provided, play it directly
        // ═══════════════════════════════════════════════════════════════════════════
        if (audioContent) {
            try {
                // Create audio element
                const audio = new Audio();

                // Handle different audio formats from backend
                // Backend typically sends base64 encoded audio
                const audioSrc = audioContent.startsWith('data:')
                    ? audioContent
                    : `data:audio/mp3;base64,${audioContent}`;

                audio.src = audioSrc;
                audioRef.current = audio;

                audio.onplay = () => {
                    setIsSpeaking(true);
                    setCurrentSource('backend');
                    console.log('[TTS] 🔊 Playing backend audio (Gemini/Vertex)');
                };

                audio.onended = () => {
                    setIsSpeaking(false);
                    setCurrentSource(null);
                    audioRef.current = null;
                };

                audio.onerror = (e) => {
                    console.warn('[TTS] Backend audio failed, falling back to WebSpeech:', e);
                    setCurrentSource(null);
                    audioRef.current = null;
                    // Fallback to WebSpeech
                    playWebSpeech(text);
                };

                audio.play().catch((err) => {
                    console.warn('[TTS] Audio play() rejected:', err.message);
                    // Fallback to WebSpeech on autoplay block
                    playWebSpeech(text);
                });

                return;
            } catch (error) {
                console.warn('[TTS] Backend audio error:', error);
                // Fallback to WebSpeech
            }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // PRIORITY 2: WebSpeech Fallback
        // Used when backend doesn't provide audio or audio playback fails
        // ═══════════════════════════════════════════════════════════════════════════
        playWebSpeech(text);

    }, [stop]);

    /**
     * WebSpeech fallback implementation
     */
    const playWebSpeech = useCallback((text: string) => {
        if (!isWebSpeechSupported || !text) {
            console.warn('[TTS] WebSpeech not supported');
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pl-PL';

        // Choose a better voice if available (Google Polski, etc.)
        const voices = synth.getVoices();
        const plVoice = voices.find(v => v.lang.includes('pl') && v.name.includes('Google')) ||
            voices.find(v => v.lang.includes('pl'));

        if (plVoice) {
            utterance.voice = plVoice;
        }

        utterance.onstart = () => {
            setIsSpeaking(true);
            setCurrentSource('webspeech');
            console.log('[TTS] 🔊 Playing WebSpeech (browser)');
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setCurrentSource(null);
        };

        utterance.onerror = () => {
            setIsSpeaking(false);
            setCurrentSource(null);
        };

        synth.speak(utterance);
    }, [isWebSpeechSupported, synth]);

    return {
        isSpeaking,
        play,
        stop,
        isSupported: isWebSpeechSupported || true, // Backend audio doesn't require WebSpeech
        currentSource
    };
}
