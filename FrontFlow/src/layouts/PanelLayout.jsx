import React from 'react';
import '../panel.css';

export default function PanelLayout({ title = 'Panel', children }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-black/40 to-black/80 text-ff-text">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-3xl font-semibold mb-4">{title}</h1>
        <div className="ff-card p-4">{children}</div>
      </div>
    </div>
  );
}


