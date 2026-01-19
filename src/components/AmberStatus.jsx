import React from 'react';

const COLORS = {
  ready: 'bg-green-500',
  thinking: 'bg-purple-500',
  idle: 'bg-yellow-400',
  error: 'bg-red-500',
};

const LABELS = {
  ready: 'Gotowa',
  thinking: 'Myśli',
  idle: 'Oczekuje',
  error: 'Błąd',
};

export default function AmberStatus({ state = 'ready' }) {
  const color = COLORS[state] || COLORS.ready;
  const label = LABELS[state] || LABELS.ready;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-200">
      <span>Amber:</span>
      <span
        className={`${color} w-3 h-3 rounded-full shadow-md animate-pulse`}
        title={`Status: ${label}`}
      />
      <span className="capitalize">{label}</span>
    </div>
  );
}
