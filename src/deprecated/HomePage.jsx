// src/pages/HomePage.jsx
import React from "react";
import { Link } from "react-router-dom";

const CATEGORIES = [
  { to: "/panel/customer", icon: "👤", label: "Panel Klienta", desc: "Zarządzaj kontem i zamówieniami" },
  { to: "/panel/business", icon: "🏪", label: "Panel Biznesu", desc: "Zarządzaj restauracją i menu" },
  { to: "/panel/taxi", icon: "🚗", label: "Zamów Taxi", desc: "Szybkie przejazdy w Twoim mieście" },
  { to: "/faq", icon: "❓", label: "Pomoc i FAQ", desc: "Znajdź odpowiedzi na pytania" },
];

export default function HomePage() {
  return (
    <div className="mx-auto mt-24 max-w-4xl px-4 pb-20">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Witaj we <span className="text-orange-500">FreeFlow</span>
        </h1>
        <p className="mt-4 text-lg text-slate-300">
          Nowoczesna platforma do zamawiania jedzenia i usług.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.to}
            to={cat.to}
            className="group block rounded-2xl border border-white/10 bg-slate-900/60 p-6 transition-all hover:border-orange-500/30 hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">{cat.icon}</div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-orange-400">
                  {cat.label}
                </h3>
                <p className="mt-1 text-sm text-slate-400">{cat.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}