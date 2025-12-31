export class VoiceStateManager {
    constructor() {
        this.state = 'IDLE'; // IDLE, USER_SPEAKING, PROCESSING, SYSTEM_SPEAKING
        this.echoGuardUntil = 0;
        this.currentTurnId = null;
        this.isEnabled = import.meta.env.VITE_VOICE_ASM_ENABLED === 'true';
        this.eventListeners = [];
    }

    getState() {
        return this.state;
    }

    setState(newState) {
        if (!this.isEnabled) return;
        console.log(`[ASM] State change: ${this.state} -> ${newState}`);
        this.state = newState;
        this.notifyListeners();
    }

    // --- Events from System ---

    // Called when VAD detects speech start
    onVadStart() {
        if (!this.isEnabled) return true;

        const now = Date.now();
        if (now < this.echoGuardUntil) {
            console.log('[ASM] Echo Guard: Ignoring VAD start (system voice detected as user input)');
            return false; // Ignore
        }

        if (this.state === 'SYSTEM_SPEAKING') {
            console.log('[ASM] Barge-in detected! Stopping TTS.');
            this.stopTTS();
            this.setState('USER_SPEAKING');
            return true;
        }

        if (this.state === 'PROCESSING') {
            console.log('[ASM] Processing... ignoring new speech (unless "stop")');
            // Assuming we don't handle "stop" logic here, just blocking
            return false;
        }

        this.setState('USER_SPEAKING');
        return true;
    }

    // Called when VAD detects speech end (silence)
    onVadEnd() {
        if (!this.isEnabled) return;
        if (this.state === 'USER_SPEAKING') {
            this.setState('PROCESSING');
        }
    }

    // Called when TTS starts playing
    onTtsStart(turnId) {
        if (!this.isEnabled) return;

        this.currentTurnId = turnId;
        this.setState('SYSTEM_SPEAKING');

        // Activate Echo Guard for 300ms (system latency + speaker travel time)
        this.echoGuardUntil = Date.now() + 500;
        console.log('[ASM] TTS Started. Echo Guard active for 500ms.');
    }

    // Called when TTS finishes naturally
    onTtsEnd() {
        if (!this.isEnabled) return;
        if (this.state === 'SYSTEM_SPEAKING') {
            this.setState('IDLE');
        }
    }

    // --- Actions ---

    registerAudio(audio) {
        this.currentAudio = audio;
    }

    stopTTS() {
        // This method should be bound to actual cancellation logic or emit event
        // For now we just update state, actual stopping needs to be hooked up
        if (this.currentAudio) {
            console.log('[ASM] Stopping Google TTS Audio');
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            } catch (e) {
                console.warn('[ASM] Error stopping audio:', e);
            }
            this.currentAudio = null;
        }

        if (typeof window.speechSynthesis !== 'undefined') {
            console.log('[ASM] Cancelling WebSpeech TTS');
            window.speechSynthesis.cancel();
        }

        // Force state to IDLE or USER_SPEAKING depending on context, handled by onVadStart usually
        // But if stopped manually, we should go IDLE
        if (this.state === 'SYSTEM_SPEAKING') {
            this.setState('IDLE');
        }
    }

    subscribe(callback) {
        this.eventListeners.push(callback);
        return () => this.eventListeners = this.eventListeners.filter(cb => cb !== callback);
    }

    notifyListeners() {
        this.eventListeners.forEach(cb => cb(this.state));
    }
}

export const voiceStateManager = new VoiceStateManager();
