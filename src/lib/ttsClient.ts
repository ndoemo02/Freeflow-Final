// src/lib/ttsClient.ts
import { getApiUrl } from './config';
// @ts-ignore
import { voiceStateManager } from '../managers/VoiceStateManager';

export interface TtsOptions {
  lang?: string;
  voiceName?: string;
  gender?: 'MALE' | 'FEMALE';
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
}

export interface TtsResponse {
  ok: boolean;
  audioContent?: string;
  audioEncoding?: string;
  voice?: string;
  language?: string;
  textLength?: number;
  error?: string;
  message?: string;
}

// Google Cloud TTS API function
async function speakWithGoogleTTS(text: string, opts: TtsOptions): Promise<HTMLAudioElement> {
  console.log("🎤 Google TTS: Starting speech synthesis for text:", text);

  try {
    const res = await fetch(getApiUrl('/api/tts'), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        languageCode: opts.lang || 'pl-PL',
        voice: opts.voiceName || 'pl-PL-Standard-A'
      }),
    });

    if (!res.ok) {
      // Try to get error details from JSON response
      try {
        const errorData = await res.json();
        throw new Error(`TTS API error: ${errorData.message || res.statusText}`);
      } catch {
        throw new Error(`TTS API error: ${res.statusText}`);
      }
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    return new Promise((resolve, reject) => {
      audio.onloadeddata = () => {
        console.log("🎤 Google TTS: Audio loaded, starting playback");
        voiceStateManager.registerAudio(audio);
        voiceStateManager.onTtsStart('google');
        audio.play();
        resolve(audio);
      };

      audio.onended = () => {
        console.log("🎤 Google TTS: Speech completed");
        voiceStateManager.onTtsEnd();
        URL.revokeObjectURL(url); // Clean up
      };

      audio.onerror = (event) => {
        console.error("🎤 Google TTS: Audio error:", event);
        URL.revokeObjectURL(url); // Clean up
        reject(new Error("Audio playback failed"));
      };
    });
  } catch (error) {
    console.error("🎤 Google TTS: Request failed:", error);
    throw error;
  }
}

// Web Speech API fallback function
async function speakWithWebSpeechAPI(text: string, opts: TtsOptions): Promise<HTMLAudioElement> {
  console.log("🎤 Web Speech API: Starting speech synthesis for text:", text);

  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Web Speech API not supported in this browser'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Configure voice settings
    utterance.lang = opts.lang || 'pl-PL';
    utterance.rate = opts.speakingRate || 1.0;
    utterance.pitch = opts.pitch || 1.0;
    utterance.volume = 1.0;

    // Try to find a Polish voice
    const voices = speechSynthesis.getVoices();
    const polishVoices = voices.filter(voice => voice.lang.startsWith('pl'));

    if (polishVoices.length > 0) {
      // Prefer Wavenet voices if available
      const wavenetVoice = polishVoices.find(voice => voice.name.includes('Wavenet'));
      utterance.voice = wavenetVoice || polishVoices[0];
      console.log("🎤 Using Polish voice:", utterance.voice?.name);
    } else {
      console.log("⚠️ No Polish voices found, using default");
    }

    utterance.onstart = () => {
      console.log("🎤 Web Speech API: Speech started");
      voiceStateManager.onTtsStart('webspeech');
    };

    utterance.onend = () => {
      console.log("🎤 Web Speech API: Speech completed");
      voiceStateManager.onTtsEnd();
      // Create a dummy audio element for compatibility
      const audio = new Audio();
      resolve(audio);
    };

    utterance.onerror = (event) => {
      console.error("🎤 Web Speech API: Speech error:", event.error);
      reject(new Error(`Speech synthesis failed: ${event.error}`));
    };

    // Start speaking
    speechSynthesis.speak(utterance);
  });
}

// Main TTS function - tries OpenAI first, falls back to Web Speech API
export async function speakTts(text: string, opts: TtsOptions = {}): Promise<HTMLAudioElement> {
  console.log("🎤 TTS: Starting speech synthesis for text:", text);

  // Default options
  const defaultOpts: TtsOptions = {
    lang: 'pl-PL',
    speakingRate: 1.0,
    pitch: 1.0,
    volumeGainDb: 0.0,
    ...opts
  };

  try {
    // Try Google Cloud TTS first
    console.log("🎤 TTS: Attempting Google Cloud TTS...");
    return await speakWithGoogleTTS(text, defaultOpts);
  } catch (googleError) {
    console.warn("🎤 TTS: Google Cloud TTS failed, falling back to Web Speech API:", googleError);

    try {
      // Fallback to Web Speech API
      console.log("🎤 TTS: Attempting Web Speech API...");
      return await speakWithWebSpeechAPI(text, defaultOpts);
    } catch (webSpeechError) {
      console.error("🎤 TTS: Both TTS methods failed:", { googleError, webSpeechError });
      throw new Error(`TTS failed: ${webSpeechError.message}`);
    }
  }
}

// Helper function to speak with specific voice
export async function speakWithVoice(text: string, voiceName: string) {
  return speakTts(text, { voiceName });
}

// Helper function to speak with gender preference
export async function speakWithGender(text: string, gender: 'MALE' | 'FEMALE') {
  return speakTts(text, { gender });
}

// Simple speak function for quick usage
export const speak = speakTts;