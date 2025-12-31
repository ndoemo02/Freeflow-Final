/**
 * HomeWithNewLogo - Przykład integracji nowego logo z istniejącą logiką Home
 * 
 * Ten plik pokazuje jak zintegrować FreeFlowLogo z istniejącą stroną główną.
 * Możesz użyć tego jako referencji lub skopiować fragmenty do swojego Home.tsx
 */

import { useState, useEffect } from 'react';
import FreeFlowLogo from '../components/FreeFlowLogo';

export default function HomeWithNewLogo() {
  // Stan aplikacji
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  // Mapowanie stanu aplikacji na stan logo
  const getLogoState = () => {
    if (error) return 'off';
    if (isSpeaking) return 'speaking';
    if (isProcessing) return 'speaking';
    if (isRecording) return 'listening';
    return 'idle';
  };

  // Handler kliknięcia logo
  const handleLogoClick = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setIsProcessing(true);
      
      // Symulacja przetwarzania
      setTimeout(() => {
        setIsProcessing(false);
        setIsSpeaking(true);
        setResponse('Znalazłem 3 restauracje w Twojej okolicy...');
        
        // Symulacja TTS
        setTimeout(() => {
          setIsSpeaking(false);
        }, 3000);
      }, 1500);
    } else {
      // Start recording
      setIsRecording(true);
      setError(null);
      setTranscript('');
      setResponse('');
    }
  };

  // Symulacja transkrypcji podczas nagrywania
  useEffect(() => {
    if (isRecording) {
      const phrases = [
        'Szukam...',
        'Szukam pizzerii...',
        'Szukam pizzerii w pobliżu...'
      ];
      let index = 0;
      
      const interval = setInterval(() => {
        if (index < phrases.length) {
          setTranscript(phrases[index]);
          index++;
        }
      }, 800);
      
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-orange-400">Free</span>
            <span className="text-2xl font-bold text-white">Flow</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              Menu
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-screen px-4 pt-20">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-8">
          
          {/* Animated Logo */}
          <FreeFlowLogo
            state={getLogoState()}
            size={460}
            micReactive={isRecording}
            onClick={handleLogoClick}
            className="cursor-pointer"
          />

          {/* Status Text */}
          <div className="text-center min-h-[80px]">
            {error && (
              <div className="text-red-400 text-lg">
                ❌ {error}
              </div>
            )}
            
            {!error && (
              <>
                {/* Transcript */}
                {transcript && (
                  <div className="text-cyan-400 text-xl font-medium mb-2">
                    🎤 {transcript}
                  </div>
                )}

                {/* Processing */}
                {isProcessing && (
                  <div className="text-purple-400 text-lg animate-pulse">
                    ⏳ Przetwarzam...
                  </div>
                )}

                {/* Response */}
                {response && !isProcessing && (
                  <div className="text-green-400 text-lg">
                    ✅ {response}
                  </div>
                )}

                {/* Idle prompt */}
                {!isRecording && !isProcessing && !response && (
                  <div className="text-slate-400 text-lg">
                    💬 Kliknij logo i powiedz czego szukasz
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {isRecording && (
              <button
                onClick={handleLogoClick}
                className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
              >
                🛑 Stop
              </button>
            )}
            
            {!isRecording && !isProcessing && (
              <button
                onClick={handleLogoClick}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-cyan-500 hover:shadow-lg hover:shadow-orange-500/25 text-white font-medium transition-all"
              >
                🎤 Rozpocznij
              </button>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="text-4xl mb-3">🎤</div>
            <h3 className="text-lg font-semibold mb-2">Voice Recognition</h3>
            <p className="text-sm text-slate-400">
              Mów naturalnie, AI rozumie kontekst
            </p>
          </div>
          
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Instant Results</h3>
            <p className="text-sm text-slate-400">
              Błyskawiczne wyszukiwanie i zamówienia
            </p>
          </div>
          
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold mb-2">Smart AI</h3>
            <p className="text-sm text-slate-400">
              Inteligentne sugestie i personalizacja
            </p>
          </div>
        </div>

        {/* Debug Info (tylko w development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-12 p-4 rounded-lg bg-slate-950/50 border border-white/10 max-w-md">
            <h4 className="text-sm font-mono text-slate-400 mb-2">Debug Info:</h4>
            <div className="text-xs font-mono text-slate-500 space-y-1">
              <div>Logo State: <span className="text-cyan-400">{getLogoState()}</span></div>
              <div>Recording: <span className="text-cyan-400">{isRecording ? 'Yes' : 'No'}</span></div>
              <div>Processing: <span className="text-cyan-400">{isProcessing ? 'Yes' : 'No'}</span></div>
              <div>Speaking: <span className="text-cyan-400">{isSpeaking ? 'Yes' : 'No'}</span></div>
              <div>Mic Reactive: <span className="text-cyan-400">{isRecording ? 'Active' : 'Inactive'}</span></div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-sm text-slate-500">
        <p>FreeFlow Business v3 - Voice to Order</p>
      </footer>
    </div>
  );
}

