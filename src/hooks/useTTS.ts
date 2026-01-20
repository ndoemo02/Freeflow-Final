import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseTTSReturn {
    isSpeaking: boolean;
    play: (text: string) => void;
    stop: () => void;
    isSupported: boolean;
}

export function useTTS(): UseTTSReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const synth = window.speechSynthesis;
    const isSupported = !!synth;

    // Monitor speaking state
    useEffect(() => {
        if (!isSupported) return;

        const interval = setInterval(() => {
            setIsSpeaking(synth.speaking);
        }, 100);

        return () => clearInterval(interval);
    }, [isSupported, synth]);

    const stop = useCallback(() => {
        if (isSupported) {
            synth.cancel();
            setIsSpeaking(false);
        }
    }, [isSupported, synth]);

    const play = useCallback((text: string) => {
        if (!isSupported || !text) return;

        stop(); // Stop any current speech

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pl-PL';

        // Choose a better voice if available (Google Polski, etc.)
        const voices = synth.getVoices();
        const plVoice = voices.find(v => v.lang.includes('pl') && v.name.includes('Google')) ||
            voices.find(v => v.lang.includes('pl'));

        if (plVoice) {
            utterance.voice = plVoice;
        }

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synth.speak(utterance);
        setIsSpeaking(true);
    }, [isSupported, stop, synth]);

    return {
        isSpeaking,
        play,
        stop,
        isSupported
    };
}
