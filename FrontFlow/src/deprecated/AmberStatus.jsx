import React from 'react';

export default function AmberStatus({ state = "ready" }) {
  const colors = {
    ready: "bg-green-500",
    thinking: "bg-purple-500", 
    idle: "bg-yellow-400",
    error: "bg-red-500"
  };

  const labels = {
    ready: "Gotowa",
    thinking: "Myśli",
    idle: "Oczekuje", 
    error: "Błąd"
  };

  return (
    <div className="flex items-center gap-2 text-sm text-gray-200">
      <span>Amber:</span>
      <span 
        className={`${colors[state]} w-3 h-3 rounded-full shadow-md animate-pulse`} 
        title={`Status: ${labels[state]}`}
      />
      <span className="capitalize">{labels[state]}</span>
    </div>
  );
}

