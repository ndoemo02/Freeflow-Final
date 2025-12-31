// src/pages/BusinessPanel.jsx
import React from "react";
import { useToast } from "../components/Toast";

export default function BusinessPanel() {
  const { push } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [restaurants, setRestaurants] = React.useState([]);
  const [selected, setSelected] = React.useState("");

  React.useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        // TODO: podłącz realne źródło (np. Supabase)
        const demo = [{ id: "r1", name: "Twoja Restauracja" }];
        setRestaurants(demo);
        setSelected(demo[0]?.id ?? "");
      } catch (e) {
        push("Nie udało się pobrać restauracji", "error");
      } finally {
        setBusy(false);
      }
    })();
  }, [push]);

  return (
    <div className="mx-auto mt-24 max-w-6xl px-4 pb-20">
      <h1 className="mb-1 text-center text-3xl font-extrabold text-white">Panel biznesowy</h1>
      <p className="mb-6 text-center text-slate-300">Zarządzaj lokalem, menu i zamówieniami</p>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="text-xs text-slate-400">Restauracja</div>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={busy}
            className="mt-1 w-full rounded-xl bg-slate-800/70 px-3 py-2 text-slate-100 ring-1 ring-white/10"
          >
            {restaurants.length === 0 && <option>(brak)</option>}
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            className="w-full rounded-xl bg-orange-500 px-4 py-2 font-medium text-slate-900 disabled:opacity-50"
            disabled={!selected || busy}
            onClick={() => push("Dodawanie nowej pozycji (modal) – wkrótce", "info")}
          >
            Dodaj pozycję
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">Twoje menu</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="text-slate-300">
              <tr>
                <th className="py-2 pr-4">Nazwa</th>
                <th className="py-2 pr-4">Cena</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {["Margarita", "Pepperoni"].map((n, i) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="py-2 pr-4">{n}</td>
                  <td className="py-2 pr-4">{i ? "42.00 zł" : "36.00 zł"}</td>
                  <td className="py-2 pr-4">
                    <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-emerald-200 ring-1 ring-emerald-400/30">Aktywne</span>
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <button className="rounded-lg bg-white/10 px-3 py-1.5 text-white ring-1 ring-white/15 hover:bg-white/15">
                      Edytuj
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


