// 🚀 SZYBKA INTEGRACJA - Wklej to do AdminPanel.jsx
// 
// KROK 1: Dodaj importy na początku pliku (po istniejących importach)

import AdvancedFilters from '../components/admin/AdvancedFilters';
import ComparisonMode from '../components/admin/ComparisonMode';
import ExportButton from '../components/admin/ExportButton';
import { useRealtimeMetrics, ConnectionStatus, LiveRevenueTicker } from '../hooks/useRealtimeMetrics';

// KROK 2: W komponencie AdminPanel, dodaj state dla filtrów (po istniejących state)

const [filters, setFilters] = useState({
  fromDate: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  toDate: new Date().toISOString().slice(0, 10),
  intentFilter: '',
  restaurantFilter: ''
});

// KROK 3: Dodaj real-time hook (po innych hooks)

const { metrics: realtimeMetrics, isConnected } = useRealtimeMetrics();

// KROK 4: Dodaj handler dla filtrów (po innych funkcjach)

const handleFilterChange = (newFilters) => {
  setFilters(newFilters);
  setFromDate(newFilters.fromDate);
  setToDate(newFilters.toDate);
  setIntentFilter(newFilters.intentFilter);
  // Odśwież dane
  loadIntents();
  loadTrends();
  loadTopSlow();
  loadActivity();
  loadBusiness();
};

// KROK 5: Zastąp obecne filtry (około linia 983-1005) tym kodem:

{/* Zaawansowane Filtry i Eksport */}
<div className="flex items-center gap-3 mb-6 flex-wrap">
  <AdvancedFilters
    fromDate={filters.fromDate}
    toDate={filters.toDate}
    intentFilter={filters.intentFilter}
    restaurantFilter={filters.restaurantFilter}
    onFilterChange={handleFilterChange}
    restaurants={restaurants}
    intents={['create_order', 'find_nearby', 'confirm_order', 'cancel_order', 'select_restaurant', 'menu_request']}
  />
  
  <ExportButton
    data={intents}
    tableData={intents}
    tableColumns={[
      { key: 'timestamp', label: 'Data' },
      { key: 'intent', label: 'Intencja' },
      { key: 'confidence', label: 'Confidence' },
      { key: 'replySnippet', label: 'Odpowiedź' }
    ]}
    dashboardElementId="admin-dashboard"
    filename={`freeflow-analytics-${new Date().toISOString().slice(0, 10)}`}
  />
  
  {/* Status połączenia real-time */}
  <ConnectionStatus isConnected={isConnected} />
</div>

// KROK 6: Zaktualizuj KPI Cards aby używały real-time (około linia 889-917)
// Zastąp pierwszą kartę (Przychód) tym:

{loading ? (
  // Loading skeleton (bez zmian)
  Array(4).fill(0).map((_, index) => (
    <div key={index} className="bg-gray-800 p-8 rounded-2xl shadow-lg relative overflow-hidden animate-pulse border border-gray-700">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
      <div className="h-10 bg-gray-700 rounded mb-2"></div>
      <div className="h-4 bg-gray-700 rounded mb-4 w-3/4"></div>
      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
    </div>
  ))
) : (
  kpiData.map((kpi, index) => (
    <div key={index} className="bg-gray-800 p-8 rounded-2xl shadow-lg relative overflow-hidden border border-gray-700">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
      
      {/* Live indicator dla pierwszej karty */}
      {index === 0 && isConnected && (
        <div className="absolute top-2 right-2">
          <ConnectionStatus isConnected={isConnected} />
        </div>
      )}
      
      <div className="text-4xl font-extrabold text-white mb-2 flex items-baseline gap-2">
        {index === 0 && isConnected && realtimeMetrics?.totalRevenue ? (
          <LiveRevenueTicker 
            revenue={realtimeMetrics.totalRevenue} 
            isConnected={isConnected} 
          />
        ) : (
          <>
            {kpi.value}
            <span className="text-lg text-gray-300 font-normal">{kpi.unit}</span>
          </>
        )}
      </div>
      <div className="text-gray-300 font-medium mb-4">{kpi.label}</div>
      <div className={`flex items-center gap-2 text-sm font-semibold ${kpi.positive ? 'text-green-400' : 'text-red-400'}`}>
        <span className="text-base">{kpi.positive ? '↗' : '↘'}</span>
        <span>{kpi.change}</span>
      </div>
    </div>
  ))
)}

// KROK 7: Dodaj Comparison Mode po sekcji z wykresami (około po linii 958)
// Wklej przed sekcją "Krzywa Intencji Amber":

{/* Comparison Mode */}
<div className="bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-700 mb-8">
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-2xl font-bold text-white">📊 Porównanie Okresów</h2>
  </div>
  
  <ComparisonMode
    currentData={{
      from: filters.fromDate,
      to: filters.toDate,
      period: selectedPeriod,
      revenue: analyticsData?.totalRevenue || 0,
      orders: analyticsData?.totalOrders || 0,
      avgOrder: analyticsData?.averageOrderValue || 0,
      satisfaction: analyticsData?.customerSatisfaction || 0,
      chartData: {
        labels: ordersChart?.labels || [],
        values: ordersChart?.values || []
      }
    }}
    onPeriodSelect={async (period) => {
      // Załaduj dane dla wybranego okresu
      try {
        const periodDays = Math.ceil(
          (new Date(period.to) - new Date(period.from)) / (1000 * 60 * 60 * 24)
        );
        const [kpi, orders] = await Promise.all([
          getAnalyticsKPI(String(periodDays)),
          getOrdersChartData(String(periodDays))
        ]);
        return {
          revenue: kpi.totalRevenue,
          orders: kpi.totalOrders,
          avgOrder: kpi.averageOrderValue,
          satisfaction: kpi.customerSatisfaction,
          chartData: {
            labels: orders.labels,
            values: orders.values
          }
        };
      } catch (error) {
        console.error('Error loading comparison data:', error);
        return null;
      }
    }}
  />
</div>

// KROK 8: Dodaj ID do głównego kontenera dla eksportu PDF
// Znajdź główny div (około linia 627) i dodaj id:

<div id="admin-dashboard" className="min-h-screen bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]">

// KROK 9: Dodaj ExportButton w innych miejscach gdzie potrzebne
// Np. przy tabeli intents, przy top lists, etc.

// PRZYKŁAD: Eksport intents
<ExportButton
  data={intents}
  filename={`amber-intents-${new Date().toISOString().slice(0, 10)}`}
/>

// PRZYKŁAD: Eksport tabeli
<ExportButton
  tableData={intents}
  tableColumns={[
    { key: 'timestamp', label: 'Data' },
    { key: 'intent', label: 'Intencja' },
    { key: 'confidence', label: 'Confidence' }
  ]}
  filename={`intents-table-${new Date().toISOString().slice(0, 10)}`}
/>

// ✅ GOTOWE! Panel jest teraz uzbrojony w:
// - ✅ Zaawansowane filtry (multi-select, date presets)
// - ✅ Eksport danych (CSV, Excel, PDF)
// - ✅ Porównywanie okresów
// - ✅ Real-time updates (jeśli WebSocket skonfigurowany)


