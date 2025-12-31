import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PanelHeader from '../components/PanelHeader';

// Polish voices data
const polishVoices = [
  { name: 'pl-PL-Chirp3-HD-Aoede', gender: 'Kobieta', technology: 'Premium (Chirp3-HD)' },
  { name: 'pl-PL-Chirp3-HD-Despina', gender: 'Kobieta', technology: 'Premium (Chirp3-HD)' },
  { name: 'pl-PL-Wavenet-A', gender: 'Kobieta', technology: 'WaveNet' },
  { name: 'pl-PL-Wavenet-B', gender: 'Mężczyzna', technology: 'WaveNet' },
  { name: 'pl-PL-Wavenet-C', gender: 'Mężczyzna', technology: 'WaveNet' },
  { name: 'pl-PL-Wavenet-D', gender: 'Kobieta', technology: 'WaveNet' },
  { name: 'pl-PL-Wavenet-E', gender: 'Kobieta', technology: 'WaveNet' },
  { name: 'pl-PL-Standard-A', gender: 'Kobieta', technology: 'Standard' },
  { name: 'pl-PL-Standard-B', gender: 'Mężczyzna', technology: 'Standard' },
  { name: 'pl-PL-Standard-C', gender: 'Mężczyzna', technology: 'Standard' },
  { name: 'pl-PL-Standard-D', gender: 'Kobieta', technology: 'Standard' },
  { name: 'pl-PL-Standard-E', gender: 'Kobieta', technology: 'Standard' },
];

export default function Settings() {
  const [text, setText] = useState("Cześć! Tutaj możesz przetestować, jak brzmią różne polskie głosy wygenerowane przez sztuczną inteligencję.");
  const [selectedVoice, setSelectedVoice] = useState(polishVoices[0].name);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handlePlay = async () => {
    if (!text.trim()) {
      setStatusMessage("Proszę wpisać tekst.");
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsLoading(true);
    setStatusMessage('');

    try {
      // Sprawdź czy mamy klucz Google API
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      
      if (!apiKey || apiKey === 'your_google_api_key_here') {
        // Fallback do Web Speech API
        console.log('🎵 Using Web Speech API fallback...');
        await playWithWebSpeechAPI(text, selectedVoice);
      } else {
        // Użyj Google TTS API
        console.log('🎵 Using Google TTS API...');
        await playWithGoogleTTS(text, selectedVoice);
      }
    } catch (error) {
      console.error("❌ Błąd podczas generowania mowy:", error);
      setStatusMessage(error instanceof Error ? error.message : "Wystąpił błąd. Spróbuj ponownie.");
      setIsLoading(false);
    }
  };

  const playWithWebSpeechAPI = async (text: string, voiceName: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Web Speech API nie jest obsługiwane w tej przeglądarce.'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Pobierz wszystkie dostępne głosy
      const voices = speechSynthesis.getVoices();
      console.log('🎵 Available voices:', voices.map(v => ({ name: v.name, lang: v.lang, gender: v.name.includes('Female') || v.name.includes('Kobieta') ? 'Female' : 'Male' })));

      // Mapuj głosy Google na dostępne głosy przeglądarki z różnymi parametrami
      const voiceConfigs: { [key: string]: { lang: string, rate: number, pitch: number, volume: number, gender?: string } } = {
        'pl-PL-Standard-A': { lang: 'pl-PL', rate: 1.0, pitch: 1.2, volume: 1.0, gender: 'Female' },
        'pl-PL-Standard-B': { lang: 'pl-PL', rate: 0.9, pitch: 0.8, volume: 1.0, gender: 'Male' },
        'pl-PL-Wavenet-A': { lang: 'pl-PL', rate: 1.1, pitch: 1.3, volume: 0.9, gender: 'Female' },
        'pl-PL-Wavenet-B': { lang: 'pl-PL', rate: 0.8, pitch: 0.7, volume: 1.0, gender: 'Male' },
        'pl-PL-Wavenet-C': { lang: 'pl-PL', rate: 1.2, pitch: 0.9, volume: 0.8, gender: 'Male' },
        'pl-PL-Wavenet-D': { lang: 'pl-PL', rate: 0.9, pitch: 1.4, volume: 1.0, gender: 'Female' },
        'pl-PL-Wavenet-E': { lang: 'pl-PL', rate: 1.0, pitch: 1.1, volume: 0.9, gender: 'Female' },
        'pl-PL-Chirp3-HD-Aoede': { lang: 'pl-PL', rate: 1.1, pitch: 1.5, volume: 1.0, gender: 'Female' },
        'pl-PL-Chirp3-HD-Despina': { lang: 'pl-PL', rate: 0.9, pitch: 1.3, volume: 0.9, gender: 'Female' },
      };

      const config = voiceConfigs[voiceName] || { lang: 'pl-PL', rate: 1.0, pitch: 1.0, volume: 1.0 };
      
      // Ustaw parametry głosu
      utterance.lang = config.lang;
      utterance.rate = config.rate;
      utterance.pitch = config.pitch;
      utterance.volume = config.volume;

      // Znajdź najlepszy głos
      let selectedVoice = voices.find(voice => voice.lang.startsWith('pl'));
      
      // Jeśli nie ma polskiego głosu, użyj angielskiego z polskim akcentem
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
        if (selectedVoice) {
          console.log('🎵 No Polish voice found, using English voice with Polish text');
        }
      }

      // Spróbuj znaleźć głos o określonej płci
      if (config.gender && selectedVoice) {
        const genderVoice = voices.find(voice => 
          voice.lang.startsWith('pl') && 
          (voice.name.toLowerCase().includes(config.gender!.toLowerCase()) ||
           voice.name.toLowerCase().includes('kobieta') ||
           voice.name.toLowerCase().includes('female'))
        );
        if (genderVoice) {
          selectedVoice = genderVoice;
        }
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('🎵 Using voice:', selectedVoice.name, selectedVoice.lang, 'Rate:', config.rate, 'Pitch:', config.pitch);
      } else {
        console.log('🎵 No suitable voice found, using default');
      }

      utterance.onend = () => {
        console.log('🎵 Web Speech API playback ended');
        setIsLoading(false);
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('🎵 Web Speech API error:', event);
        setIsLoading(false);
        reject(new Error('Błąd odtwarzania głosu'));
      };

      speechSynthesis.speak(utterance);
      console.log('🎵 Web Speech API playback started with config:', config);
    });
  };

  const playWithGoogleTTS = async (text: string, voiceName: string) => {
    console.log('🎵 Starting Google TTS generation...');
    const audioData = await generateTts(text, voiceName);
    const mimeType = audioData.mimeType;

    console.log('🎵 Audio data received:', {
      hasAudioData: !!audioData.audioData,
      mimeType: mimeType,
      audioDataLength: audioData.audioData?.length
    });

    if (audioData.audioData && mimeType && mimeType.startsWith("audio/")) {
      const sampleRateMatch = mimeType.match(/rate=(\d+)/);
      if (!sampleRateMatch) {
        throw new Error("Nie można odczytać częstotliwości próbkowania z typu MIME.");
      }
      const sampleRate = parseInt(sampleRateMatch[1], 10);
      console.log('🎵 Sample rate:', sampleRate);
      
      const pcmData = base64ToArrayBuffer(audioData.audioData);
      const pcm16 = new Int16Array(pcmData);
      const wavBlob = pcmToWav(pcm16, sampleRate);
      const audioUrl = URL.createObjectURL(wavBlob);
      
      console.log('🎵 Audio URL created:', audioUrl);
      
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        console.log('🎵 Google TTS playback ended');
        setIsLoading(false);
      };
      audio.onerror = (e) => {
        console.error('🎵 Google TTS playback error:', e);
        setIsLoading(false);
      };
      
      await audio.play();
      console.log('🎵 Google TTS playback started');
    } else {
      throw new Error("Otrzymano nieprawidłowe dane audio z API.");
    }
  };

  const generateTts = async (text: string, voiceName: string) => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || "";
    
    console.log('🔑 API Key:', apiKey ? 'Ustawiony' : 'BRAK');
    console.log('📝 Text:', text);
    console.log('🎤 Voice:', voiceName);
    
    if (!apiKey || apiKey === 'your_google_api_key_here') {
      throw new Error('Brak klucza Google API. Dodaj VITE_GOOGLE_API_KEY do pliku .env');
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        parts: [{ text: text }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }
          }
        }
      },
      model: "gemini-2.5-flash-preview-tts"
    };

    console.log('📤 Request payload:', payload);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('❌ API Error:', errorBody);
      throw new Error(`Błąd API: ${response.status} - ${errorBody.error?.message || 'Nieznany błąd'}`);
    }

    const result = await response.json();
    console.log('✅ API Response:', result);
    
    const part = result?.candidates?.[0]?.content?.parts?.[0];

    return {
      audioData: part?.inlineData?.data,
      mimeType: part?.inlineData?.mimeType,
    };
  };

  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const pcmToWav = (pcmData: Int16Array, sampleRate: number) => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    // FMT sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    // DATA sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(44 + i * 2, pcmData[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]">
      <div className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <PanelHeader 
            title="⚙️ Ustawienia" 
            subtitle="Konfiguracja aplikacji i tester głosów AI"
          />

          {/* Voice Tester Section */}
          <motion.div 
            className="bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-700 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 md:mb-0">
                Tester Polskich Głosów AI
              </h1>
              <div className="flex items-center space-x-2 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                  <path d="M15.5 8.5c-1.5-1.5-4-1.5-5.5 0s-1.5 4 0 5.5"></path>
                  <path d="M12 12L18 6"></path>
                  <path d="M12 12v6"></path>
                </svg>
                <span className="font-semibold">
                  {import.meta.env.VITE_GOOGLE_API_KEY && import.meta.env.VITE_GOOGLE_API_KEY !== 'your_google_api_key_here' 
                    ? 'Powered by Google TTS' 
                    : 'Web Speech API (różne parametry)'}
                </span>
              </div>
            </div>

            {/* Main tool section */}
            <div className="space-y-6">
              <div>
                <label htmlFor="text-input" className="block text-sm font-medium text-gray-300 mb-2">
                  Wpisz tekst do przeczytania:
                </label>
                <textarea 
                  id="text-input" 
                  rows={5} 
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-white placeholder-gray-400" 
                  placeholder="Cześć! Tutaj możesz przetestować, jak brzmię."
                />
              </div>

              <div>
                <label htmlFor="voice-select" className="block text-sm font-medium text-gray-300 mb-2">
                  Wybierz głos:
                </label>
                <select 
                  id="voice-select" 
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-white"
                >
                  {polishVoices.map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.gender}, {voice.technology})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center pt-2">
                <button 
                  onClick={handlePlay}
                  disabled={isLoading}
                  className="mx-auto flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-110 disabled:bg-gray-400 disabled:scale-100 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10" style={{ transform: 'translateX(2px)' }}>
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  )}
                </button>
              </div>
              <div className="text-center text-sm text-red-400 h-5">
                {statusMessage}
              </div>
            </div>
          </motion.div>

          {/* Voices table */}
          <motion.div 
            className="bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Dostępne głosy (język polski)</h2>
            <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-200 text-sm">
                <strong>💡 Wskazówka:</strong> Każdy głos ma inne parametry (tempo, wysokość, głośność), 
                więc będą brzmieć inaczej nawet w trybie Web Speech API. 
                Dla najlepszej jakości dodaj klucz Google API do pliku .env
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Nazwa API
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Płeć
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Technologia
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-600">
                  {polishVoices.map((voice, index) => (
                    <tr key={voice.name} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {voice.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {voice.gender}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {voice.technology}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
