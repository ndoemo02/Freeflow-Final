import { useEffect, useState } from "react";

export default function Header() {
  const [health, setHealth] = useState<"up" | "down" | "idle">("idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://freeflow-backend.vercel.app/api/index/health", { cache: "no-store" });
        if (!cancelled) setHealth(res.ok ? "up" : "down");
      } catch {
        if (!cancelled) setHealth("down");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-slate-900/60 backdrop-blur border-b border-slate-800/50">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <a href="/" className="text-xl font-extrabold select-none">
          <span className="text-orange-500">Free</span>
          <span className="text-purple-400">Flow</span>
        </a>

        <div className="flex items-center gap-3">
          {/* health dot */}
          <div className="flex items-center gap-1 text-xs text-slate-300">
            <span
              className={[
                "inline-block h-2.5 w-2.5 rounded-full",
                health === "up" ? "bg-emerald-500" : health === "down" ? "bg-red-500" : "bg-slate-500",
              ].join(" ")}
              title={health === "up" ? "API OK" : health === "down" ? "API DOWN" : "API…"}
            />
            <span className="hidden sm:inline">{health === "up" ? "API OK" : health === "down" ? "API DOWN" : "API…"}</span>
          </div>

          <button
            className="rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-900 font-semibold px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400/70"
            aria-label="Koszyk"
            type="button"
          >
            🛒 Koszyk
          </button>
        </div>
      </div>
    </header>
  );
}
