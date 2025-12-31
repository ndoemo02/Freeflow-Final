import React, { useMemo, useState } from "react";

/** KATEGORIE I PYTANIA — dopisz swoje */
const SECTIONS = [
  {
    key: "registration",
    label: "Rejestracja",
    color: "from-fuchsia-500/20 to-fuchsia-300/10",
    qa: [
      { q: "Jak założyć konto?", a: "Kliknij przycisk Zaloguj → wybierz Magic Link lub Google. Po zalogowaniu przejdziesz do panelu." },
      { q: "Czy muszę podawać NIP?", a: "Na etapie testów NIP jest opcjonalny. W produkcji może być wymagany dla kont firmowych." },
    ],
  },
  {
    key: "orders",
    label: "Zamówienia",
    color: "from-sky-500/20 to-sky-300/10",
    qa: [
      { q: "Jak złożyć zamówienie?", a: "Wyszukaj lokal, wybierz pozycje do koszyka i przejdź do podsumowania." },
      { q: "Czy mogę anulować zamówienie?", a: "Tak, jeśli nie zostało przyjęte przez lokal – w panelu klienta kliknij ‘Anuluj’ przy zamówieniu." },
    ],
  },
  {
    key: "payments",
    label: "Płatności",
    color: "from-emerald-500/20 to-emerald-300/10",
    qa: [
      { q: "Jakie metody płatności wspieracie?", a: "Obsługujemy płatności online i w lokalu (w zależności od restauracji)." },
      { q: "Kiedy pobierane są środki?", a: "Po potwierdzeniu zamówienia przez lokal. W przypadku anulowania środki nie są pobierane." },
    ],
  },
  {
    key: "tech",
    label: "Problemy techniczne",
    color: "from-amber-500/20 to-amber-300/10",
    qa: [
      { q: "Aplikacja nie ładuje mapy/zdjęć", a: "Odśwież stronę (Ctrl+F5). Jeśli problem wraca, sprawdź uprawnienia przeglądarki i blokery treści." },
      { q: "Błąd „Failed to fetch”", a: "Backend mógł nie działać lub CORS blokuje żądanie. Upewnij się, że front woła /api/* i że backend nasłuchuje." },
    ],
  },
];

const ALL = { key: "all", label: "Wszystkie" };

function Pill({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 h-9 rounded-xl text-sm transition-colors",
        active
          ? "bg-orange-500/20 text-orange-200 border border-orange-400/30"
          : "bg-white/5 text-white/80 border border-white/10 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Card({ gradient, children }) {
  return (
    <div
      className={[
        "rounded-2xl p-4 md:p-5",
        "bg-[rgba(17,17,20,0.86)] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.35)]",
        gradient ? `bg-gradient-to-br ${gradient}` : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default function FAQ() {
  const [filter, setFilter] = useState(ALL.key);

  const questions = useMemo(() => {
    const filteredSections = filter === ALL.key ? SECTIONS : SECTIONS.filter((s) => s.key === filter);
    return filteredSections.flatMap((section) =>
      section.qa.map((item) => ({ ...item, _section: section.label, _color: section.color }))
    );
  }, [filter]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      {/* Nagłówek */}
      <div className="mb-5 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide">
          FAQ — Najczęstsze pytania
        </h1>
        <p className="text-white/70 mt-2">
          Znajdziesz tu najczęstsze pytania o rejestrację, zamówienia, płatności i wsparcie.
        </p>
      </div>

      {/* Filtry */}
      <div className="flex flex-wrap gap-2 md:gap-3 mb-6 md:mb-8">
        <Pill active={filter === ALL.key} onClick={() => setFilter(ALL.key)}>
          {ALL.label}
        </Pill>
        {SECTIONS.map((s) => (
          <Pill key={s.key} active={filter === s.key} onClick={() => setFilter(s.key)}>
            {s.label}
          </Pill>
        ))}
      </div>

      {/* Lista QA */}
      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {questions.map((row) => (
          <Card key={row.q} gradient={row._color}>
            <details className="group">
              <summary className="cursor-pointer list-none select-none" aria-label={`Rozwiń odpowiedź na pytanie: ${row.q}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 border border-white/10">
                      {/* Ikona „?” */}
                      <span className="text-sm font-bold">?</span>
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base md:text-lg">
                        {row.q}
                      </h3>
                      <span className="text-xs md:text-sm text-white/60 px-2 py-0.5 rounded-md border border-white/10 bg-black/20">
                        {row._section}
                      </span>
                    </div>
                    <div className="text-white/60 text-sm mt-1 group-open:hidden">
                      Kliknij, aby rozwinąć odpowiedź
                    </div>
                  </div>
                  <div className="mt-1 opacity-70 group-open:rotate-180 transition">
                    ▼
                  </div>
                </div>
              </summary>

              <div className="mt-3 pl-10 text-white/90 leading-relaxed">
                {row.a}
              </div>
            </details>
          </Card>
        ))}
      </div>
    </div>
  );
}