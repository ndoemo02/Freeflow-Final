import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PanelHeader from '../components/PanelHeader';
import { getApiUrl } from '../lib/config';

const polishVoices = [
  { name: 'pl-PL-Chirp3-HD-Aoede', gender: 'Kobieta', technology: 'Premium (Chirp3-HD)' },
  { name: 'pl-PL-Chirp3-HD-Despina', gender: 'Kobieta', technology: 'Premium (Chirp3-HD)' },
  { name: 'pl-PL-Wavenet-A', gender: 'Kobieta', technology: 'WaveNet' },
  { name: 'pl-PL-Wavenet-B', gender: 'Mezczyzna', technology: 'WaveNet' },
  { name: 'pl-PL-Wavenet-C', gender: 'Mezczyzna', technology: 'WaveNet' },
  { name: 'pl-PL-Wavenet-D', gender: 'Kobieta', technology: 'WaveNet' },
  { name: 'pl-PL-Wavenet-E', gender: 'Kobieta', technology: 'WaveNet' },
  { name: 'pl-PL-Standard-A', gender: 'Kobieta', technology: 'Standard' },
  { name: 'pl-PL-Standard-B', gender: 'Mezczyzna', technology: 'Standard' },
  { name: 'pl-PL-Standard-C', gender: 'Mezczyzna', technology: 'Standard' },
  { name: 'pl-PL-Standard-D', gender: 'Kobieta', technology: 'Standard' },
  { name: 'pl-PL-Standard-E', gender: 'Kobieta', technology: 'Standard' },
];

export default function Settings() {
  const [text, setText] = useState(
    'Czesc! Tutaj mozesz przetestowac, jak brzmia rozne polskie glosy wygenerowane przez sztuczna inteligencje.',
  );
  const [selectedVoice, setSelectedVoice] = useState(polishVoices[0].name);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handlePlay = async () => {
    if (!text.trim()) {
      setStatusMessage('Prosze wpisac tekst.');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsLoading(true);
    setStatusMessage('');

    try {
      console.log('[Settings] Trying backend /api/tts');
      await playWithBackendTTS(text, selectedVoice);
    } catch (backendError) {
      console.warn('[Settings] Backend TTS failed, fallback Web Speech:', backendError);
      try {
        await playWithWebSpeechAPI(text, selectedVoice);
      } catch (fallbackError) {
        console.error('TTS failed:', fallbackError);
        setStatusMessage(
          fallbackError instanceof Error
            ? fallbackError.message
            : 'Wystapil blad. Sprobuj ponownie.',
        );
        setIsLoading(false);
      }
    }
  };

  const playWithWebSpeechAPI = async (inputText: string, voiceName: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Web Speech API nie jest obslugiwane w tej przegladarce.'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(inputText);
      const voices = speechSynthesis.getVoices();

      const voiceConfigs: { [key: string]: { lang: string; rate: number; pitch: number; volume: number; gender?: string } } = {
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
      utterance.lang = config.lang;
      utterance.rate = config.rate;
      utterance.pitch = config.pitch;
      utterance.volume = config.volume;

      let selected = voices.find((voice) => voice.lang.startsWith('pl'));
      if (!selected) {
        selected = voices.find((voice) => voice.lang.startsWith('en'));
      }

      if (config.gender && selected) {
        const byGender = voices.find(
          (voice) =>
            voice.lang.startsWith('pl') &&
            (voice.name.toLowerCase().includes(config.gender!.toLowerCase()) ||
              voice.name.toLowerCase().includes('kobieta') ||
              voice.name.toLowerCase().includes('female')),
        );
        if (byGender) selected = byGender;
      }

      if (selected) {
        utterance.voice = selected;
      }

      utterance.onend = () => {
        setIsLoading(false);
        resolve();
      };

      utterance.onerror = () => {
        setIsLoading(false);
        reject(new Error('Blad odtwarzania glosu'));
      };

      speechSynthesis.speak(utterance);
    });
  };

  const playWithBackendTTS = async (inputText: string, voiceName: string) => {
    const response = await fetch(getApiUrl('/api/tts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: inputText, voice: voiceName }),
    });

    if (!response.ok) {
      let details = `Blad API: ${response.status}`;
      try {
        const json = await response.json();
        if (json?.error) details = `${details} - ${String(json.error)}`;
      } catch {
        // noop
      }
      throw new Error(details);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Backend TTS zwrocil pusty payload.');
    }

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      setIsLoading(false);
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = () => {
      setIsLoading(false);
      URL.revokeObjectURL(audioUrl);
    };

    await audio.play();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]">
      <div className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <PanelHeader
            title="Ustawienia"
            subtitle="Konfiguracja aplikacji i tester glosow AI"
          />

          <motion.div
            className="bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-700 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 md:mb-0">
                Tester Polskich Glosow AI
              </h1>
              <div className="flex items-center space-x-2 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                  <path d="M15.5 8.5c-1.5-1.5-4-1.5-5.5 0s-1.5 4 0 5.5"></path>
                  <path d="M12 12L18 6"></path>
                  <path d="M12 12v6"></path>
                </svg>
                <span className="font-semibold">
                  Powered by Backend TTS (Vertex) + Web Speech fallback
                </span>
              </div>
            </div>

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
                  placeholder="Czesc! Tutaj mozesz przetestowac, jak brzmiem."
                />
              </div>

              <div>
                <label htmlFor="voice-select" className="block text-sm font-medium text-gray-300 mb-2">
                  Wybierz glos:
                </label>
                <select
                  id="voice-select"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-white"
                >
                  {polishVoices.map((voice) => (
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
              <div className="text-center text-sm text-red-400 h-5">{statusMessage}</div>
            </div>
          </motion.div>

          <motion.div
            className="bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Dostepne glosy (jezyk polski)</h2>
            <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-200 text-sm">
                <strong>Wskazowka:</strong> Kazdy glos ma inne parametry (tempo, wysokosc, glosnosc),
                wiec beda brzmiec inaczej nawet w trybie Web Speech API.
                Domyslnie audio generuje backend (Vertex), a Web Speech jest fallbackiem awaryjnym.
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
                      Plec
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Technologia
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-600">
                  {polishVoices.map((voice) => (
                    <tr key={voice.name} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{voice.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{voice.gender}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{voice.technology}</td>
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
