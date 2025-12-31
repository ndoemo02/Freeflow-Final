import { useState } from "react";
import { motion } from "framer-motion";
import FreeFlowLogo from "../components/FreeFlowLogo";

/**
 * LogoDemo - Strona demonstracyjna komponentu FreeFlowLogo
 * Pokazuje wszystkie stany animacji i opcje konfiguracji
 */
export default function LogoDemo() {
  const [state, setState] = useState("idle");
  const [size, setSize] = useState(420);
  const [micReactive, setMicReactive] = useState(false);

  const states = [
    { value: "idle", label: "Idle", desc: "Spokojny stan oczekiwania", color: "bg-orange-500" },
    { value: "listening", label: "Listening", desc: "Aktywne nasłuchiwanie", color: "bg-cyan-500" },
    { value: "speaking", label: "Speaking", desc: "Odpowiedź głosowa", color: "bg-purple-500" },
    { value: "off", label: "Off", desc: "Nieaktywny", color: "bg-slate-500" }
  ];

  const sizes = [
    { value: 280, label: "Small" },
    { value: 420, label: "Medium" },
    { value: 560, label: "Large" },
    { value: 720, label: "XL" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            FreeFlow Logo Component
          </h1>
          <p className="text-slate-400 mt-2">
            Interaktywny komponent logo z animacjami stanów głosowych
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Logo Preview */}
          <div className="flex flex-col items-center justify-center">
            <motion.div
              key={state}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <FreeFlowLogo
                state={state}
                size={size}
                micReactive={micReactive}
                onClick={() => {
                  console.log('Logo clicked!');
                  // Cycle through states on click
                  const currentIndex = states.findIndex(s => s.value === state);
                  const nextIndex = (currentIndex + 1) % states.length;
                  setState(states[nextIndex].value);
                }}
              />
            </motion.div>

            {/* Current State Info */}
            <motion.div
              key={`info-${state}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 text-center"
            >
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
                <div className={`w-3 h-3 rounded-full ${states.find(s => s.value === state)?.color}`} />
                <span className="font-semibold text-lg">
                  {states.find(s => s.value === state)?.label}
                </span>
              </div>
              <p className="text-slate-400 mt-3">
                {states.find(s => s.value === state)?.desc}
              </p>
            </motion.div>
          </div>

          {/* Controls Panel */}
          <div className="space-y-8">
            {/* State Selector */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🎭</span>
                Stan Animacji
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {states.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setState(s.value)}
                    className={`
                      px-4 py-3 rounded-xl font-medium transition-all duration-200
                      ${state === s.value
                        ? `${s.color} text-white shadow-lg scale-105`
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }
                    `}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">📏</span>
                Rozmiar
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {sizes.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSize(s.value)}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${size === s.value
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }
                    `}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <input
                  type="range"
                  min="200"
                  max="800"
                  step="20"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="text-center text-sm text-slate-400 mt-2">
                  {size}px
                </div>
              </div>
            </div>

            {/* Mic Reactive Toggle */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🎤</span>
                Mic Reactive
              </h3>
              <button
                onClick={() => setMicReactive(!micReactive)}
                className={`
                  w-full px-6 py-4 rounded-xl font-medium transition-all duration-200
                  ${micReactive
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }
                `}
              >
                {micReactive ? '✅ Włączone' : '⭕ Wyłączone'}
              </button>
              <p className="text-xs text-slate-400 mt-3">
                {micReactive 
                  ? '🎵 Logo reaguje na dźwięk z mikrofonu'
                  : 'Logo używa standardowych animacji'
                }
              </p>
            </div>

            {/* Code Example */}
            <div className="bg-slate-950/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">💻</span>
                Kod
              </h3>
              <pre className="text-xs text-slate-300 overflow-x-auto">
                <code>{`<FreeFlowLogo
  state="${state}"
  size={${size}}
  micReactive={${micReactive}}
  onClick={handleClick}
/>`}</code>
              </pre>
            </div>

            {/* Features List */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">✨</span>
                Features
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>4 stany animacji (idle, listening, speaking, off)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Reaktywność na dźwięk z mikrofonu</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Płynne przejścia między stanami</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Pulsujące pierścienie dla stanów aktywnych</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Dynamiczny glow effect (contra-pulse)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Wskaźnik amplitudy dźwięku</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Accessibility (keyboard navigation, ARIA)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Responsywny i skalowalny</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 mb-4">
            💡 Kliknij logo aby przełączać stany
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setState("idle");
                setSize(420);
                setMicReactive(false);
              }}
              className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => {
                setState("listening");
                setMicReactive(true);
              }}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              Demo Mic Reactive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

