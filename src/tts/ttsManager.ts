export interface ChunkPlayOptions {
  rate?: number;
  pitch?: number;
  pauseBetweenChunks?: number;
}

export class TTSManager {
  private utterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentController: AbortController | null = null;
  
  // Chunk queue for human-like pacing
  private chunkQueue: string[] = [];
  private isPlaying = false;
  private onChunkComplete?: (index: number, total: number) => void;

  /**
   * Stops all current speech (Web Speech API, Audio elements, pending fetches, and chunk queue).
   */
  stop() {
    // 1. Clear chunk queue FIRST (most important for immediate stop)
    this.isPlaying = false;
    this.chunkQueue = [];

    // 2. Cancel Web Speech API
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    this.utterance = null;

    // 3. Stop HTML5 Audio (Google TTS blobs)
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    // 4. Abort pending fetch requests
    if (this.currentController) {
      this.currentController.abort();
      this.currentController = null;
    }
  }

  /**
   * Check if currently playing
   */
  get isSpeaking(): boolean {
    return this.isPlaying || 
           window.speechSynthesis.speaking || 
           (this.currentAudio?.paused === false);
  }

  /**
   * Prepares for a new streaming/async request.
   * Cancels previous requests and returns a new AbortSignal.
   */
  startAsyncRequest(): AbortSignal {
    this.stop();
    this.currentController = new AbortController();
    return this.currentController.signal;
  }

  /**
   * Registers an active Audio element so it can be stopped later.
   */
  registerAudio(audio: HTMLAudioElement) {
    if (this.currentAudio && this.currentAudio !== audio) {
      this.currentAudio.pause();
    }
    
    this.currentAudio = audio;
    
    audio.addEventListener('ended', () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
    });
  }

  /**
   * Play a single chunk using Web Speech API
   */
  private playOneChunk(text: string, options: ChunkPlayOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isPlaying) {
        reject(new Error('Playback stopped'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pl-PL';
      utterance.rate = options.rate ?? 0.95;
      utterance.pitch = options.pitch ?? 1.0;

      // Try to find a Polish voice
      const voices = window.speechSynthesis.getVoices();
      const plVoice = voices.find(v => v.lang.includes('pl') && v.name.includes('Google')) ||
                      voices.find(v => v.lang.includes('pl'));
      if (plVoice) {
        utterance.voice = plVoice;
      }

      this.utterance = utterance;

      utterance.onend = () => {
        this.utterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.utterance = null;
        // 'interrupted' is expected when stop() is called
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
        } else {
          reject(new Error(`Speech error: ${event.error}`));
        }
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Natural pause between chunks
   */
  private pause(ms: number): Promise<void> {
    return new Promise(resolve => {
      if (!this.isPlaying) {
        resolve();
        return;
      }
      setTimeout(resolve, ms);
    });
  }

  /**
   * Play multiple chunks with human-like pacing.
   * STOP will immediately clear the queue.
   */
  async playChunked(chunks: string[], options: ChunkPlayOptions = {}): Promise<void> {
    this.stop(); // Clear previous
    
    if (!chunks || chunks.length === 0) {
      return;
    }

    this.chunkQueue = [...chunks];
    this.isPlaying = true;
    
    const pauseMs = options.pauseBetweenChunks ?? 300;
    let index = 0;
    const total = chunks.length;

    while (this.chunkQueue.length > 0 && this.isPlaying) {
      const chunk = this.chunkQueue.shift()!;
      
      try {
        await this.playOneChunk(chunk, options);
        
        // Callback for progress tracking
        this.onChunkComplete?.(index, total);
        index++;
        
        // Natural pause between chunks (with slight randomness)
        if (this.chunkQueue.length > 0 && this.isPlaying) {
          const variation = Math.random() * 100 - 50; // ±50ms
          await this.pause(pauseMs + variation);
        }
      } catch (err) {
        // If stopped mid-chunk, exit gracefully
        if (!this.isPlaying) break;
        console.warn('Chunk playback error:', err);
      }
    }

    this.isPlaying = false;
  }

  /**
   * Set callback for chunk progress
   */
  setOnChunkComplete(callback: (index: number, total: number) => void) {
    this.onChunkComplete = callback;
  }

  /**
   * Direct Web Speech API usage (Legacy/Simple mode)
   */
  speak(text: string, lang = 'pl-PL') {
    this.stop();
    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.lang = lang;
    window.speechSynthesis.speak(this.utterance);
    
    this.utterance.onend = () => {
      this.utterance = null;
    };
  }
}

export const ttsManager = new TTSManager();

