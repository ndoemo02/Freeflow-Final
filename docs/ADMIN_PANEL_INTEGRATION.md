# 🔧 INTEGRACJA ULEPSZEŃ ADMIN PANELU

## 📦 WYMAGANE ZALEŻNOŚCI

Dodaj do `package.json`:

```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.2",
    "xlsx": "^0.18.5",
    "html2canvas": "^1.4.1",
    "socket.io-client": "^4.7.2"
  }
}
```

Zainstaluj:
```bash
npm install jspdf jspdf-autotable xlsx html2canvas socket.io-client
```

---

## 🚀 INTEGRACJA Z ADMINPANEL.JSX

### 1. Import nowych komponentów

```jsx
// Na początku AdminPanel.jsx
import AdvancedFilters from '../components/admin/AdvancedFilters';
import ComparisonMode from '../components/admin/ComparisonMode';
import ExportButton from '../components/admin/ExportButton';
import { useRealtimeMetrics, ConnectionStatus, LiveRevenueTicker } from '../hooks/useRealtimeMetrics';
```

### 2. Dodaj state dla filtrów

```jsx
// W komponencie AdminPanel
const [filters, setFilters] = useState({
  fromDate: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  toDate: new Date().toISOString().slice(0, 10),
  intentFilter: '',
  restaurantFilter: ''
});

const handleFilterChange = (newFilters) => {
  setFilters(newFilters);
  // Zaktualizuj dane na podstawie nowych filtrów
  loadAnalyticsData(newFilters);
};
```

### 3. Zastąp obecne filtry AdvancedFilters

```jsx
// Zamiast obecnego bloku filtrów (linie 983-1005):
<div className="flex items-center gap-3 mb-6">
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
</div>
```

### 4. Dodaj Comparison Mode

```jsx
// Po sekcji z wykresami, dodaj nową sekcję:
<div className="bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-700 mb-8">
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-2xl font-bold text-white">Porównanie Okresów</h2>
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
      const data = await loadAnalyticsDataForPeriod(period);
      return data;
    }}
  />
</div>
```

### 5. Dodaj Real-time Updates

```jsx
// Na początku komponentu
const { metrics: realtimeMetrics, isConnected } = useRealtimeMetrics();

// Zaktualizuj KPI Cards aby używały real-time danych:
{kpiData.map((kpi, index) => (
  <div key={index} className="bg-gray-800 p-8 rounded-2xl shadow-lg relative overflow-hidden border border-gray-700">
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
    
    {/* Dodaj live indicator jeśli dostępne */}
    {isConnected && index === 0 && (
      <div className="absolute top-2 right-2">
        <ConnectionStatus isConnected={isConnected} />
      </div>
    )}
    
    <div className="text-4xl font-extrabold text-white mb-2 flex items-baseline gap-2">
      {index === 0 && isConnected && realtimeMetrics ? (
        <LiveRevenueTicker 
          revenue={realtimeMetrics.totalRevenue || kpi.value} 
          isConnected={isConnected} 
        />
      ) : (
        <>
          {kpi.value}
          <span className="text-lg text-gray-300 font-normal">{kpi.unit}</span>
        </>
      )}
    </div>
    {/* ... reszta karty */}
  </div>
))}
```

---

## 📝 PRZYKŁAD UŻYCIA - PEŁNA INTEGRACJA

### Plik: `src/hooks/useRealtimeMetrics.js`

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useRealtimeMetrics() {
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
    currentHourOrders: 0
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3000';
    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join:admin-dashboard');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('metrics:update', (data) => {
      setMetrics(prev => ({ ...prev, ...data }));
    });

    socket.on('order:new', (order) => {
      setMetrics(prev => ({
        ...prev,
        totalOrders: prev.totalOrders + 1,
        totalRevenue: prev.totalRevenue + (order.total || 0),
        currentHourOrders: prev.currentHourOrders + 1
      }));
    });

    return () => socket.disconnect();
  }, []);

  return { metrics, isConnected };
}

export function ConnectionStatus({ isConnected }) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
      isConnected 
        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
        : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${
        isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
      }`} />
      <span>{isConnected ? 'Live' : 'Offline'}</span>
    </div>
  );
}

export function LiveRevenueTicker({ revenue, isConnected }) {
  const [animatedValue, setAnimatedValue] = useState(revenue);

  useEffect(() => {
    if (!isConnected) return;
    
    const diff = revenue - animatedValue;
    const steps = 20;
    const step = diff / steps;
    let current = animatedValue;
    
    const interval = setInterval(() => {
      current += step;
      if (Math.abs(current - revenue) < 0.01) {
        current = revenue;
        clearInterval(interval);
      }
      setAnimatedValue(current);
    }, 50);

    return () => clearInterval(interval);
  }, [revenue, isConnected]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-4xl font-extrabold text-cyan-400">
        {animatedValue.toLocaleString('pl-PL', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })} zł
      </span>
      {isConnected && (
        <span className="text-xs text-green-400 animate-pulse">LIVE</span>
      )}
    </div>
  );
}
```

---

## 🔌 BACKEND - WebSocket Support

### Dodaj do `api/server-vercel.js`:

```javascript
import { Server } from 'socket.io';
import { createServer } from 'http';

// Jeśli używasz Express, możesz potrzebować:
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Emitowanie metryk co 5 sekund
setInterval(async () => {
  try {
    const metrics = {
      totalOrders: await getTotalOrders(),
      totalRevenue: await getTotalRevenue(),
      activeUsers: await getActiveUsers(),
      currentHourOrders: await getCurrentHourOrders()
    };
    
    io.to('admin-dashboard').emit('metrics:update', metrics);
  } catch (error) {
    console.error('Error emitting metrics:', error);
  }
}, 5000);

// Nasłuchiwanie nowych zamówień (Supabase Realtime)
supabase
  .channel('orders')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'orders' },
    (payload) => {
      io.to('admin-dashboard').emit('order:new', payload.new);
    }
  )
  .subscribe();

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join:admin-dashboard', () => {
    socket.join('admin-dashboard');
    console.log('Client joined admin-dashboard');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Zmień app.listen na httpServer.listen
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`🧠 FreeFlow Brain running locally on http://localhost:${PORT}`);
  });
}
```

---

## ✅ CHECKLIST INTEGRACJI

- [ ] Zainstalować zależności (`npm install`)
- [ ] Dodać importy do AdminPanel.jsx
- [ ] Zastąpić obecne filtry AdvancedFilters
- [ ] Dodać ExportButton w odpowiednich miejscach
- [ ] Dodać ComparisonMode sekcję
- [ ] Dodać useRealtimeMetrics hook
- [ ] Zaktualizować KPI Cards z real-time data
- [ ] Dodać WebSocket support w backend (opcjonalnie)
- [ ] Przetestować eksport danych
- [ ] Przetestować filtry
- [ ] Przetestować comparison mode

---

## 🎨 STYLIZACJA (Galaxy UI)

Komponenty są gotowe do stylizacji w Galaxy UI theme. Wszystkie używają:
- `bg-gray-800/50` - glassmorphic backgrounds
- `border-purple-500/30` - neon borders
- `backdrop-blur-xl` - blur effects
- Framer Motion animations

Możesz dodać dodatkowe style w `AdminPanel.jsx` lub globalnych CSS.

---

## 🐛 TROUBLESHOOTING

### Problem: Export nie działa
- Sprawdź czy `jspdf`, `xlsx`, `html2canvas` są zainstalowane
- Sprawdź console dla błędów
- Upewnij się że dane są w odpowiednim formacie

### Problem: Filtry nie działają
- Sprawdź czy `onFilterChange` jest poprawnie zaimplementowane
- Sprawdź format danych w `restaurants` i `intents` props

### Problem: Real-time nie działa
- Sprawdź czy WebSocket server jest uruchomiony
- Sprawdź `REACT_APP_WS_URL` w .env
- Sprawdź console dla błędów połączenia

### Problem: Comparison Mode nie ładuje danych
- Sprawdź czy `onPeriodSelect` zwraca dane w odpowiednim formacie
- Sprawdź czy `currentData` ma wszystkie wymagane pola

---

**Gotowe!** 🚀 Panel jest teraz uzbrojony w zaawansowane funkcje!


