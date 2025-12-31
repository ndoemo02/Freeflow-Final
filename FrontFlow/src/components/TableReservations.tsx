/**
 * TableReservations - Komponent do zarządzania rezerwacjami stolików
 * 
 * 🚧 FUTURE FEATURE - NOT IMPLEMENTED YET 🚧
 * 
 * Ten komponent będzie obsługiwał:
 * - Interaktywną mapę stolików w restauracji
 * - Rezerwacje w czasie rzeczywistym
 * - Drag & drop do zmiany układu stolików
 * - Automatyczne przypisywanie stolików na podstawie liczby gości
 * - Integrację z systemem zamówień
 */

import { motion } from 'framer-motion';
import { useState } from 'react';

interface Table {
  id: string;
  number: number;
  seats: number;
  x: number;
  y: number;
  status: 'available' | 'occupied' | 'reserved';
  reservation?: {
    customerName: string;
    time: string;
    guests: number;
  };
}

export default function TableReservations() {
  const [tables] = useState<Table[]>([
    // Mock data - w przyszłości z API
    { id: '1', number: 1, seats: 2, x: 50, y: 50, status: 'available' },
    { id: '2', number: 2, seats: 4, x: 200, y: 50, status: 'occupied' },
    { id: '3', number: 3, seats: 6, x: 350, y: 50, status: 'reserved' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 via-purple-400 to-blue-400 bg-clip-text text-transparent font-orbitron">
            Ruchome Stoliki
          </h1>
          <p className="text-xl text-slate-300 mb-2">
            Interaktywne zarządzanie rezerwacjami
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-200">
            <span className="text-2xl">🚧</span>
            <span className="font-semibold">Funkcja w przygotowaniu</span>
          </div>
        </motion.div>

        {/* Coming Soon Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/20 p-12 shadow-2xl"
        >
          <div className="text-center space-y-8">
            {/* Icon */}
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-9xl"
            >
              🪑
            </motion.div>

            {/* Title */}
            <div>
              <h2 className="text-4xl font-bold text-white mb-4 font-orbitron">
                Wkrótce dostępne!
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Pracujemy nad innowacyjnym systemem zarządzania stolikami, który pozwoli Ci:
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-8">
              <FeatureCard
                icon="🎯"
                title="Drag & Drop"
                description="Przeciągaj stoliki i zmieniaj układ restauracji w czasie rzeczywistym"
              />
              <FeatureCard
                icon="📅"
                title="Rezerwacje Online"
                description="Klienci mogą rezerwować stoliki bezpośrednio przez aplikację"
              />
              <FeatureCard
                icon="🤖"
                title="AI Optimization"
                description="Automatyczne przypisywanie stolików na podstawie liczby gości"
              />
              <FeatureCard
                icon="📊"
                title="Analityka"
                description="Statystyki obłożenia i optymalizacja wykorzystania przestrzeni"
              />
            </div>

            {/* Mock Preview */}
            <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-slate-800/50 to-purple-900/30 border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-6 font-orbitron">
                Podgląd (Mock)
              </h3>
              <div className="relative h-64 bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden">
                {/* Mock Tables */}
                {tables.map((table, index) => (
                  <motion.div
                    key={table.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className={`
                      absolute w-16 h-16 rounded-xl flex items-center justify-center
                      font-bold text-white cursor-pointer transition-all
                      ${table.status === 'available' && 'bg-green-500/30 border-2 border-green-400/50 hover:bg-green-500/50'}
                      ${table.status === 'occupied' && 'bg-red-500/30 border-2 border-red-400/50'}
                      ${table.status === 'reserved' && 'bg-orange-500/30 border-2 border-orange-400/50'}
                    `}
                    style={{ left: table.x, top: table.y }}
                    whileHover={{ scale: 1.1 }}
                  >
                    {table.number}
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-center gap-6 mt-6">
                <StatusBadge color="green" label="Dostępny" />
                <StatusBadge color="red" label="Zajęty" />
                <StatusBadge color="orange" label="Zarezerwowany" />
              </div>
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="pt-8"
            >
              <p className="text-slate-400 mb-4">
                Chcesz być powiadomiony o uruchomieniu tej funkcji?
              </p>
              <button
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-purple-500 text-white font-bold text-lg shadow-2xl hover:shadow-orange-500/25 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                Zapisz się na listę oczekujących
              </button>
              <p className="text-xs text-slate-500 mt-2">
                (Funkcja niedostępna w wersji demo)
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Technical Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8 p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50"
        >
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span>💻</span>
            Informacje techniczne
          </h3>
          <div className="text-sm text-slate-400 space-y-2">
            <p>• Komponent: <code className="text-orange-400">TableReservations.tsx</code></p>
            <p>• Status: <span className="text-yellow-400">In Development</span></p>
            <p>• Planowane technologie: React DnD, WebSocket (real-time), Canvas API</p>
            <p>• Integracja: Supabase Realtime, AI dla optymalizacji</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 backdrop-blur-xl"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-300 text-sm">{description}</p>
    </motion.div>
  );
}

function StatusBadge({ color, label }: { color: string; label: string }) {
  const colorClasses = {
    green: 'bg-green-500/20 border-green-400/50 text-green-300',
    red: 'bg-red-500/20 border-red-400/50 text-red-300',
    orange: 'bg-orange-500/20 border-orange-400/50 text-orange-300',
  };

  return (
    <div className={`px-4 py-2 rounded-full border-2 text-sm font-semibold ${colorClasses[color as keyof typeof colorClasses]}`}>
      {label}
    </div>
  );
}

