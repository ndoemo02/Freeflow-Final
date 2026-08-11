import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInternalAccountCount, getInternalAnalytics } from '../lib/analytics';
import { getApiUrl } from '../lib/config';
import AmberControlDeck from '../components/admin/AmberControlDeck';
import AmberQualityLab from './admin/AmberQualityLab';

const TABS = [
  { id: 'overview', label: 'Restaurant Operations' },
  { id: 'quality', label: 'Amber Quality Lab' },
  { id: 'controls', label: 'Kontrolki Amber' },
];

function formatMoney(value) {
  if (!Number.isFinite(value)) return 'N/D';
  return `${Number(value).toLocaleString('pl-PL', { maximumFractionDigits: 2 })} zł`;
}

function formatDelta(value) {
  if (!Number.isFinite(value)) return 'N/D';
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(1)}% vs poprzedni okres`;
}

function MetricCard({ label, value, detail, unavailable = false }) {
  return (
    <div className="glass rounded-xl border border-[var(--ff-stroke)] p-4">
      <div className="text-[11px] uppercase tracking-wider text-[var(--ff-text-2)]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${unavailable ? 'text-[var(--ff-text-2)]' : 'text-[var(--ff-text-1)]'}`}>
        {value}
      </div>
      <div className="mt-1 text-[11px] text-[var(--ff-text-2)]">{detail}</div>
    </div>
  );
}

function BarList({ labels = [], values = [], suffix = '' }) {
  const maximum = Math.max(...values, 1);
  return (
    <div className="space-y-3">
      {labels.map((label, index) => {
        const value = Number(values[index] || 0);
        return (
          <div key={`${label}-${index}`}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[var(--ff-text-1)]">{label}</span>
              <span className="font-mono text-[var(--ff-text-2)]">{value}{suffix}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[var(--ff-amber-500)]"
                style={{ width: `${Math.max(0, Math.min(100, (value / maximum) * 100))}%` }}
              />
            </div>
          </div>
        );
      })}
      {labels.length === 0 && <p className="text-xs text-[var(--ff-text-2)]">Brak danych w wybranym okresie.</p>}
    </div>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('7');
  const [snapshot, setSnapshot] = useState(null);
  const [accountCount, setAccountCount] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(null);
  const [health, setHealth] = useState('checking');
  const [adminToken, setAdminToken] = useState('');

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const [analytics, accounts] = await Promise.all([
        getInternalAnalytics(period),
        getInternalAccountCount(),
      ]);
      setSnapshot(analytics);
      setAccountCount(accounts);
    } catch (error) {
      setSnapshot(null);
      setAccountCount(null);
      setOverviewError(error?.message || 'Dane operacyjne są niedostępne.');
    } finally {
      setOverviewLoading(false);
    }
  }, [period]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const response = await fetch(getApiUrl('/api/health'));
        if (!cancelled) setHealth(response.ok ? 'online' : 'offline');
      } catch {
        if (!cancelled) setHealth('offline');
      }
    };
    void check();
    const timer = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const kpi = snapshot?.kpi;

  return (
    <main className="min-h-screen bg-[var(--ff-bg)] px-4 py-5 text-[var(--ff-text-1)] md:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 flex flex-col gap-4 rounded-2xl border border-[var(--ff-stroke)] bg-black/20 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--ff-amber-500)]">FreeFlow Internal</div>
            <h1 className="mt-1 text-2xl font-semibold">Operations & Amber Quality</h1>
            <p className="mt-1 max-w-3xl text-sm text-[var(--ff-text-2)]">
              Dane restauracyjne są oddzielone od treści rozmów. Quality Lab pokazuje wyłącznie sesje post-hoc objęte aktywną zgodą.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-[var(--ff-stroke)] px-4 py-2 text-sm text-[var(--ff-text-2)] hover:bg-white/5"
          >
            Wróć do aplikacji
          </button>
        </header>

        <nav className="mb-4 flex gap-2 overflow-x-auto rounded-xl border border-[var(--ff-stroke)] bg-black/20 p-2">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm transition ${activeTab === tab.id ? 'bg-[var(--ff-amber-500)] text-white' : 'text-[var(--ff-text-2)] hover:bg-white/5'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'overview' && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-[var(--ff-stroke)] bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Przegląd operacyjny restauracji</h2>
                <p className="text-xs text-[var(--ff-text-2)]">Źródło: chroniony JWT agregat orders dla internal_admin; bez transkrypcji i danych Quality Lab.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                  className="rounded-lg border border-[var(--ff-stroke)] bg-black/30 px-3 py-2 text-sm"
                >
                  <option value="7">7 dni</option>
                  <option value="30">30 dni</option>
                  <option value="90">90 dni</option>
                </select>
                <button type="button" onClick={() => void loadOverview()} className="rounded-lg border border-[var(--ff-stroke)] px-3 py-2 text-sm hover:bg-white/5">
                  Odśwież
                </button>
              </div>
            </div>

            {overviewError && (
              <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
                Dane niedostępne: {overviewError}. Panel nie podstawia wartości demonstracyjnych.
              </div>
            )}
            {overviewLoading && <div className="rounded-xl border border-[var(--ff-stroke)] p-8 text-center text-sm text-[var(--ff-text-2)]">Ładowanie danych źródłowych…</div>}

            {!overviewLoading && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <MetricCard label="Przychód" value={kpi ? formatMoney(kpi.totalRevenue) : 'N/D'} detail={kpi ? formatDelta(kpi.revenueChange) : 'Brak źródła'} unavailable={!kpi} />
                  <MetricCard label="Zamówienia" value={kpi ? kpi.totalOrders : 'N/D'} detail={kpi ? formatDelta(kpi.ordersChange) : 'Brak źródła'} unavailable={!kpi} />
                  <MetricCard label="Śr. koszyk" value={kpi ? formatMoney(kpi.averageOrderValue) : 'N/D'} detail={kpi ? formatDelta(kpi.avgOrderChange) : 'Brak źródła'} unavailable={!kpi} />
                  <MetricCard label="Satysfakcja" value="N/D" detail="Brak wiarygodnego źródła" unavailable />
                  <MetricCard label="Konta" value={Number.isFinite(accountCount) ? accountCount : 'N/D'} detail="Tylko zagregowana liczba" unavailable={!Number.isFinite(accountCount)} />
                  <MetricCard label="API health" value={health === 'checking' ? 'Sprawdzanie' : health} detail="Bieżąca dostępność endpointu" unavailable={health !== 'online'} />
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="glass rounded-xl border border-[var(--ff-stroke)] p-4">
                    <h3 className="mb-1 font-semibold">Zamówienia dziennie</h3>
                    <p className="mb-4 text-xs text-[var(--ff-text-2)]">Rzeczywiste wiersze orders z wybranego okresu.</p>
                    <BarList labels={snapshot?.ordersChart?.labels} values={snapshot?.ordersChart?.values} />
                  </div>
                  <div className="glass rounded-xl border border-[var(--ff-stroke)] p-4">
                    <h3 className="mb-1 font-semibold">Rozkład godzinowy</h3>
                    <p className="mb-4 text-xs text-[var(--ff-text-2)]">Udział zamówień w przedziałach czasowych.</p>
                    <BarList labels={snapshot?.hourly?.labels} values={snapshot?.hourly?.values} suffix="%" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="glass rounded-xl border border-[var(--ff-stroke)] p-4">
                    <h3 className="mb-3 font-semibold">Najczęściej zamawiane dania</h3>
                    <div className="space-y-2">
                      {(snapshot?.topDishes || []).map((dish) => (
                        <div key={dish.name} className="flex justify-between rounded-lg border border-[var(--ff-stroke)] px-3 py-2 text-sm">
                          <span>{dish.name}</span><span className="font-mono text-[var(--ff-amber-500)]">{dish.orders}</span>
                        </div>
                      ))}
                      {!snapshot?.topDishes?.length && <p className="text-xs text-[var(--ff-text-2)]">Brak danych.</p>}
                    </div>
                  </div>
                  <div className="glass rounded-xl border border-[var(--ff-stroke)] p-4">
                    <h3 className="mb-3 font-semibold">Restauracje według przychodu</h3>
                    <div className="space-y-2">
                      {(snapshot?.topRestaurants || []).map((restaurant) => (
                        <div key={`${restaurant.name}-${restaurant.location}`} className="flex justify-between gap-4 rounded-lg border border-[var(--ff-stroke)] px-3 py-2 text-sm">
                          <span>{restaurant.name}<span className="ml-2 text-xs text-[var(--ff-text-2)]">{restaurant.location}</span></span>
                          <span className="font-mono text-[var(--ff-amber-500)]">{restaurant.revenue}</span>
                        </div>
                      ))}
                      {!snapshot?.topRestaurants?.length && <p className="text-xs text-[var(--ff-text-2)]">Brak danych.</p>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'quality' && <AmberQualityLab />}

        {activeTab === 'controls' && (
          <section className="space-y-4">
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
              <h2 className="font-semibold">Kontrolki o potwierdzonym wpływie</h2>
              <p className="mt-1 text-xs text-[var(--ff-text-2)]">
                Model LIVE, styl mowy i prompty wpływają na nowe sesje lub wskazane ścieżki odpowiedzi. Nie ma aktywnego przełącznika „roli Amber”. Ta sekcja nadal używa legacy ADMIN_TOKEN do czasu migracji konfiguracji na JWT.
              </p>
              <input
                type="password"
                value={adminToken}
                onChange={(event) => setAdminToken(event.target.value)}
                placeholder="Legacy ADMIN_TOKEN — tylko na czas tej sesji"
                autoComplete="off"
                className="mt-3 w-full max-w-xl rounded-lg border border-[var(--ff-stroke)] bg-black/30 px-3 py-2 text-sm"
              />
            </div>
            {adminToken ? (
              <div className="glass rounded-xl border border-[var(--ff-stroke)] p-4"><AmberControlDeck adminToken={adminToken} /></div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--ff-stroke)] p-8 text-center text-sm text-[var(--ff-text-2)]">
                Podaj token tylko wtedy, gdy chcesz zmienić aktywną konfigurację. Token nie jest zapisywany w localStorage.
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
