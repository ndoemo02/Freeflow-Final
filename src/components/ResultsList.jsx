import React, { useEffect, useState } from "react";
import "./ResultsList.css";

export default function ResultsList({ results }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t); }, []);
  if (!results || results.length === 0) return null;

  return (
    <div className="results-container transition space-y-3">
      {results.map((r, i) => (
        <div
          key={i}
          className={`result-card transition transform hover:scale-[1.01] hover:shadow-glass ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} duration-300 ease-out`}
          style={{ transitionDelay: `${i * 40}ms` }}
        >
          <div className="result-title">{r.name || r.title || "Bez nazwy"}</div>
          {r.address && <div className="result-sub">{r.address}</div>}
          {r.phone && <div className="result-sub">📞 {r.phone}</div>}
          {r.hours && <div className="result-sub">⏰ {r.hours}</div>}
        </div>
      ))}
    </div>
  );
}


