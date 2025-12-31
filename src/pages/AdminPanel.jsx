import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  BarElement,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
  getAnalyticsKPI,
  getOrdersChartData,
  getHourlyDistribution,
  getTopDishes,
  getTopRestaurants
} from '../lib/analytics';
import { supabase } from '../lib/supabase';
import PanelHeader from '../components/PanelHeader';
import { CONFIG, getApiUrl } from '../lib/config';
import AmberControlDeck from '../components/admin/AmberControlDeck';
import AmberLiveMonitor from '../components/AmberLiveMonitor';
import FreeFunSection from '../components/FreeFunSection';
import ConversationViewer from '../components/admin/ConversationViewer';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  BarElement
);

import { useTheme } from '../state/ThemeContext';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('7 dni');
  const [chartType, setChartType] = useState('Dzienna');
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);

  // Admin token
  const [adminToken, setAdminToken] = useState('');
  useEffect(() => {
    const t = localStorage.getItem('admin-token') || '';
    setAdminToken(t);
  }, []);
  const saveToken = (v) => { setAdminToken(v); localStorage.setItem('admin-token', v || ''); };
  const tokenOk = !!adminToken;

  // State dla danych z Supabase
  const [analyticsData, setAnalyticsData] = useState(null);
  const [ordersChart, setOrdersChart] = useState(null);
  const [hourlyChart, setHourlyChart] = useState(null);
  const [topDishes, setTopDishes] = useState([]);
  const [topRestaurants, setTopRestaurants] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  // Admin API states
  const [intents, setIntents] = useState([]);
  // Filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => (new Date()).toISOString().slice(0, 10));
  const [intentFilter, setIntentFilter] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', available: true });

  // Amber Diagnostics
  const [diag, setDiag] = useState({ nluMs: 0, dbMs: 0, ttsMs: 0, durationMs: 0, lastAt: null, running: false });
  const testAmber = async () => {
    try {
      setDiag(d => ({ ...d, running: true }));
      const t0 = performance.now();
      const isV2 = CONFIG.USE_BRAI_V2 || CONFIG.USE_BRAIN_V2; // Just to be safe with naming
      const apiUrl = getApiUrl(isV2 ? '/api/brain/v2' : '/api/brain');

      const body = isV2 ? {
        session_id: `diag-${Date.now()}`,
        input: 'Gdzie mogę zjeść w pobliżu?',
        meta: { channel: 'admin_diag' }
      } : {
        text: 'Gdzie mogę zjeść w pobliżu?',
        includeTTS: true,
        sessionId: `diag-${Date.now()}`
      };

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await resp.json();
      const t1 = performance.now();
      const timings = json.timings || {};
      setDiag({
        nluMs: Math.round(timings.nluMs || 0),
        dbMs: Math.round(timings.dbMs || 0),
        ttsMs: Math.round(timings.ttsMs || 0),
        durationMs: Math.round(timings.durationMs || (t1 - t0)),
        lastAt: new Date().toISOString(),
        running: false,
      });
    } catch (e) {
      console.warn('Amber test failed', e);
      setDiag(d => ({ ...d, running: false }));
    }
  };

  // Heartbeat
  const [hb, setHb] = useState({ status: 'unknown', last: null });
  useEffect(() => {
    let timer;
    const tick = async () => {
      try {
        const r = await fetch(getApiUrl('/api/health'));
        setHb({ status: r.ok ? '🟢 online' : '🔴 offline', last: new Date().toISOString() });
      } catch {
        setHb({ status: '🔴 offline', last: new Date().toISOString() });
      }
    };
    tick();
    timer = setInterval(tick, 5000);
    return () => clearInterval(timer);
  }, []);

  // Live diagnostics via SSE
  useEffect(() => {
    try {
      const es = new EventSource(getApiUrl('/api/amber/live'));
      es.onmessage = (e) => {
        try {
          const j = JSON.parse(e.data || '{}');
          setDiag(d => ({
            nluMs: Math.round(j.nlu_ms ?? j.nluMs ?? d.nluMs),
            dbMs: Math.round(j.db_ms ?? j.dbMs ?? d.dbMs),
            ttsMs: Math.round(j.tts_ms ?? j.ttsMs ?? d.ttsMs),
            durationMs: Math.round(j.duration_ms ?? j.durationMs ?? d.durationMs),
            lastAt: j.created_at || new Date().toISOString(),
            running: false,
          }));
        } catch { }
      };
      return () => es.close();
    } catch {
      // ignore if EventSource not supported
    }
  }, []);

  // Trends & Top slow intents
  const [trends, setTrends] = useState([]);
  const [topSlow, setTopSlow] = useState([]);
  const [activity, setActivity] = useState([]);
  const [bizStats, setBizStats] = useState({ total_orders: 0, total_revenue: 0, avg_order: 0, interactions: 0, conversion: 0 });
  const [alerts, setAlerts] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);

  const loadSystemStatus = async () => {
    if (!tokenOk) return;
    try {
      const j = await adminFetch('/api/admin/system-status');
      if (j.ok && j.status) {
        setSystemStatus(j.status["dr.panel.status"]);
      }
    } catch (e) {
      console.warn('system-status error', e.message);
    }
  };

  // Debug state (retained)
  const [debugStatus, setDebugStatus] = useState("");
  const [debugMsg, setDebugMsg] = useState("");


  // Amber Learning Stats
  const [learningStats, setLearningStats] = useState({ total: 0, latest: [], intentStats: {}, feedbackStats: { positive: 0, negative: 0, neutral: 0 } });
  const [learningLoading, setLearningLoading] = useState(false);
  // Tabs
  const [activeTab, setActiveTab] = useState('insights'); // 'insights' | 'control' | 'learning'

  // Date helper that accepts YYYY-MM-DD and DD.MM.YYYY
  const toIsoSafe = (v, endOfDay = false) => {
    if (!v) return null;
    let d = null;
    if (v instanceof Date) d = v;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) d = new Date(v);
    else if (/^\d{2}\.\d{2}\.\d{4}$/.test(String(v))) {
      const [dd, mm, yyyy] = String(v).split('.');
      d = new Date(`${yyyy}-${mm}-${dd}`);
    }
    if (!d || isNaN(d.getTime())) return null;
    if (endOfDay) d.setHours(23, 59, 59, 999);
    return d.toISOString();
  };

  const loadTrends = async () => {
    if (!tokenOk) return setTrends([]);
    try {
      const qs = new URLSearchParams();
      const fIso = toIsoSafe(fromDate);
      const tIso = toIsoSafe(toDate, true);
      if (fIso) qs.append('from', fIso);
      if (tIso) qs.append('to', tIso);
      if (intentFilter) qs.append('intent', intentFilter);
      const j = await adminFetch(`/api/admin/performance/trends?${qs.toString()}`);
      setTrends(j.data || []);
    } catch (e) {
      console.warn('trends error', e.message);
      setTrends([]);
    }
  };
  const loadTopSlow = async () => {
    if (!tokenOk) return setTopSlow([]);
    try {
      const qs = new URLSearchParams();
      const fIso = toIsoSafe(fromDate);
      const tIso = toIsoSafe(toDate, true);
      if (fIso) qs.append('from', fIso);
      if (tIso) qs.append('to', tIso);
      if (intentFilter) qs.append('intent', intentFilter);
      const j = await adminFetch(`/api/admin/performance/top-intents?${qs.toString()}`);
      setTopSlow(j.data || []);
    } catch (e) {
      console.warn('top-intents error', e.message);
      setTopSlow([]);
    }
  };

  useEffect(() => {
    if (!tokenOk) return;
    loadTrends();
    loadTopSlow();
    loadActivity();
    loadBusiness();
    fetchAlerts();
    loadLearningStats();
    loadSystemStatus();

    // Background polling for health status every 30s
    const statusInterval = setInterval(loadSystemStatus, 30000);
    return () => clearInterval(statusInterval);
  }, [tokenOk, fromDate, toDate, intentFilter]);

  const refreshData = async () => {
    await Promise.all([loadIntents(), loadTrends(), loadTopSlow(), loadActivity(), loadBusiness(), loadSystemStatus()]);
  };

  const trendsData = {
    labels: trends.map(t => t.day),
    datasets: [
      { label: 'NLU', data: trends.map(t => t.nluAvg), borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.2)', tension: 0.3 },
      { label: 'DB', data: trends.map(t => t.dbAvg), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)', tension: 0.3 },
      { label: 'TTS', data: trends.map(t => t.ttsAvg), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.2)', tension: 0.3 },
      { label: 'Total', data: trends.map(t => t.durAvg), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.2)', tension: 0.3 },
    ]
  };
  const trendsOptions = { responsive: true, plugins: { legend: { labels: { color: '#e5e7eb' } } }, scales: { x: { ticks: { color: '#9ca3af' } }, y: { ticks: { color: '#9ca3af' } } } };

  const adminFetch = async (url, opts = {}) => {
    const headers = { 'Content-Type': 'application/json', 'x-admin-token': adminToken, ...(opts.headers || {}) };
    const fullUrl = /^https?:/i.test(url) ? url : getApiUrl(url.startsWith('/') ? url : `/${url}`);
    const res = await fetch(fullUrl, { ...opts, headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  };

  const loadActivity = async () => {
    if (!tokenOk) return setActivity([]);
    try {
      const j = await adminFetch('/api/admin/amber/restaurants-activity?days=7');
      setActivity(j.data || []);
    } catch (e) { setActivity([]); }
  };
  const loadBusiness = async () => {
    if (!tokenOk) return setBizStats({ total_orders: 0, total_revenue: 0, avg_order: 0, interactions: 0, conversion: 0 });
    try {
      const j = await adminFetch('/api/admin/business/stats');
      setBizStats({
        total_orders: j.total_orders || 0,
        total_revenue: j.total_revenue || 0,
        avg_order: j.avg_order || 0,
        interactions: j.interactions || 0,
        conversion: j.conversion || 0,
      });
    } catch (e) { }
  };
  const fetchAlerts = async () => {
    if (!tokenOk) return setAlerts([]);
    try {
      const j = await adminFetch('/api/admin/trends/alerts');
      setAlerts(j.alerts || j.data || []);
    } catch (e) { setAlerts([]); }
  };

  const loadLearningStats = async (limit = 20) => {
    if (!tokenOk) return;
    setLearningLoading(true);
    try {
      const j = await adminFetch(`/api/admin/amber/learning-stats?limit=${limit}`);
      setLearningStats({
        total: j.total || 0,
        latest: j.latest || [],
        intentStats: j.intentStats || {},
        feedbackStats: j.feedbackStats || { positive: 0, negative: 0, neutral: 0 }
      });
    } catch (e) {
      console.warn('learning-stats error', e.message);
      setLearningStats({ total: 0, latest: [], intentStats: {}, feedbackStats: { positive: 0, negative: 0, neutral: 0 } });
    } finally {
      setLearningLoading(false);
    }
  };

  const loadIntents = async () => {
    if (!tokenOk) return setIntents([]);
    try {
      const qs = new URLSearchParams();
      const fIso = toIsoSafe(fromDate);
      const tIso = toIsoSafe(toDate, true);
      if (fIso) qs.append('from', fIso);
      if (tIso) qs.append('to', tIso);
      if (intentFilter) qs.append('intent', intentFilter);
      const j = await adminFetch(`/api/admin/intents?${qs.toString()}`);
      setIntents(j.data || []);
    } catch (e) {
      console.warn('intents error', e.message);
      setIntents([]);
    }
  };

  const loadRestaurants = async () => {
    if (!tokenOk) return setRestaurants([]);
    try {
      const j = await adminFetch('/api/admin/restaurants');
      setRestaurants(j.data || []);
    } catch (e) {
      console.warn('restaurants error', e.message);
      setRestaurants([]);
    }
  };

  const loadMenu = async (restaurant) => {
    setSelectedRestaurant(restaurant);
    setMenuItems([]);
    if (!restaurant) return;
    try {
      const j = await adminFetch(`/api/admin/menu?restaurant_id=${restaurant.id}`);
      setMenuItems(j.data || []);
    } catch (e) {
      console.warn('menu error', e.message);
      setMenuItems([]);
    }
  };

  const saveMenuItem = async () => {
    if (!selectedRestaurant) return;
    const payload = { ...newItem, restaurant_id: selectedRestaurant.id, price: Number(newItem.price) || 0 };
    try {
      await adminFetch('/api/admin/menu', { method: 'POST', body: JSON.stringify(payload) });
      setShowAddModal(false);
      setNewItem({ name: '', price: '', category: '', available: true });
      await loadMenu(selectedRestaurant);
    } catch (e) {
      alert('Save failed: ' + e.message);
    }
  };

  // Dark Mode Toggle
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    // Initial check or default to dark
    if (localStorage.getItem('admin-theme') === 'light') {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('admin-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('admin-theme', 'light');
    }
  };

  // Funkcja do ładowania wszystkich danych
  const loadAnalyticsData = async (period = '7') => {
    setLoading(true);
    try {
      const now = new Date();
      const fromIso = toIsoSafe(fromDate) || new Date(now.getTime() - (parseInt(period) || 7) * 24 * 60 * 60 * 1000).toISOString();
      const toIso = toIsoSafe(toDate, true) || now.toISOString();
      console.log('📊 Zakres dat:', { from: fromIso, to: toIso });

      // Przelicz na dni dla istniejących helperów
      const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
      const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));

      const [kpi, orders, hourly, dishes, restaurantsTop] = await Promise.all([
        getAnalyticsKPI(String(days)),
        getOrdersChartData(String(days)),
        getHourlyDistribution(),
        getTopDishes(),
        getTopRestaurants()
      ]);

      setAnalyticsData(kpi);
      setOrdersChart(orders);
      setHourlyChart(hourly);
      setTopDishes(dishes);
      setTopRestaurants(restaurantsTop);
    } catch (error) {
      console.error('❌ loadAnalyticsData error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do ładowania kont użytkowników
  const loadAccounts = async () => {
    setAccountsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          user_type,
          business_id,
          created_at,
          first_name,
          last_name,
          phone
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading accounts:', error);
        // Fallback to mock data when database is empty
        setAccounts(getMockAccounts());
      } else {
        setAccounts(data || []);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      // Fallback to mock data
      setAccounts(getMockAccounts());
    } finally {
      setAccountsLoading(false);
    }
  };

  // Ładuj dane przy pierwszym renderze i zmianie okresu
  useEffect(() => {
    const period = selectedPeriod.split(' ')[0]; // '7 dni' -> '7'
    loadAnalyticsData(period);
    loadAccounts();
    loadIntents();
    loadRestaurants();
  }, [selectedPeriod, tokenOk]);

  // Funkcja do określania typu konta
  const getAccountType = (userType) => {
    switch (userType) {
      case 'business': return { label: 'BIZ', color: 'bg-blue-600 text-blue-100', icon: '🏢' };
      case 'customer': return { label: 'CUS', color: 'bg-green-600 text-green-100', icon: '👤' };
      case 'admin': return { label: 'ADM', color: 'bg-red-600 text-red-100', icon: '👑' };
      case 'driver': return { label: 'DRV', color: 'bg-yellow-600 text-yellow-100', icon: '🚗' };
      default: return { label: 'UNK', color: 'bg-gray-600 text-gray-100', icon: '❓' };
    }
  };

  // Mock dane dla kont użytkowników
  const getMockAccounts = () => [
    {
      id: 'mock-1',
      email: 'jan.kowalski@example.com',
      user_type: 'customer',
      first_name: 'Jan',
      last_name: 'Kowalski',
      phone: '123456789',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock-2',
      email: 'anna.nowak@restaurant.com',
      user_type: 'business',
      first_name: 'Anna',
      last_name: 'Nowak',
      phone: '987654321',
      business_id: 'biz-1',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock-3',
      email: 'admin@freeflow.com',
      user_type: 'admin',
      first_name: 'Admin',
      last_name: 'System',
      phone: '555666777',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock-4',
      email: 'kierowca@taxi.com',
      user_type: 'driver',
      first_name: 'Piotr',
      last_name: 'Kierowca',
      phone: '111222333',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Przygotuj dane KPI dla wyświetlenia
  const getStatusIcon = (metric) => {
    const s = systemStatus?.metrics?.[metric] || 'UNKNOWN';
    let icon = '🔴';
    let label = 'Offline / Error';

    if (s === 'REALTIME') { icon = '🟢'; label = 'Live / Realtime'; }
    else if (s === 'STALE' || s === 'HARDCODED') { icon = '🟡'; label = 'Demo / Cached'; }

    return <span title={label} className="cursor-help">{icon}</span>;
  };

  const kpiData = analyticsData ? [
    {
      value: analyticsData.totalRevenue.toLocaleString('pl-PL'),
      unit: 'zł',
      label: 'Całkowity Przychód',
      status: getStatusIcon('revenue'),
      change: `${analyticsData.revenueChange >= 0 ? '+' : ''}${analyticsData.revenueChange.toFixed(1)}% vs poprzedni okres`,
      positive: analyticsData.revenueChange >= 0
    },
    {
      value: analyticsData.totalOrders.toLocaleString('pl-PL'),
      unit: 'zamówień',
      label: 'Liczba Zamówień',
      status: getStatusIcon('orders'),
      change: `${analyticsData.ordersChange >= 0 ? '+' : ''}${analyticsData.ordersChange.toFixed(1)}% vs poprzedni okres`,
      positive: analyticsData.ordersChange >= 0
    },
    {
      value: analyticsData.averageOrderValue.toFixed(2),
      unit: 'zł',
      label: 'Średnia Wartość Zamówienia',
      status: getStatusIcon('orders'), // Shared with orders usually
      change: `${analyticsData.avgOrderChange >= 0 ? '+' : ''}${analyticsData.avgOrderChange.toFixed(1)}% vs poprzedni okres`,
      positive: analyticsData.avgOrderChange >= 0
    },
    {
      value: analyticsData.customerSatisfaction.toFixed(1),
      unit: '%',
      label: 'Zadowolenie Klientów',
      status: '🟡', // Always hardcoded in analytics.ts for now
      change: `${analyticsData.satisfactionChange >= 0 ? '+' : ''}${analyticsData.satisfactionChange.toFixed(1)}% vs poprzedni okres`,
      positive: analyticsData.satisfactionChange >= 0
    }
  ] : [];

  // Dane wykresu zamówień (z Supabase lub fallback)
  const ordersChartData = ordersChart ? {
    labels: ordersChart.labels,
    datasets: [{
      label: 'Liczba zamówień',
      data: ordersChart.values,
      borderColor: '#38BDF8', // neon2
      backgroundColor: 'rgba(56,189,248,0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointBackgroundColor: '#38BDF8',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4
    }]
  } : {
    labels: ['Ładowanie...'],
    datasets: [{ label: 'Ładowanie...', data: [0], borderColor: '#667eea', backgroundColor: 'rgba(102, 126, 234, 0.1)' }]
  };

  // Dane wykresu godzinowego (z Supabase lub fallback)
  const hourlyChartData = hourlyChart ? {
    labels: hourlyChart.labels,
    datasets: [{
      data: hourlyChart.values,
      backgroundColor: ['#5B7CFF', '#38BDF8', '#8B5CF6', '#22C55E'],
      borderWidth: 0
    }]
  } : {
    labels: ['Ładowanie...'],
    datasets: [{ data: [100], backgroundColor: ['#e2e8f0'] }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10,16,32,.95)',
        titleColor: '#EAF0FF',
        bodyColor: '#EAF0FF',
        borderColor: 'rgba(255,255,255,.1)',
        borderWidth: 1,
        padding: 10
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#9CA3AF', font: { size: 11 } }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9CA3AF', font: { size: 11 } }
      }
    },
    elements: {
      point: { hoverRadius: 8 }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
          color: '#9CA3AF',
          font: { size: 11 }
        }
      },
      tooltip: { enabled: true }
    }
  };

  // Intents chart data
  const intentsChartData = {
    labels: intents.map(i => new Date(i.timestamp).toLocaleTimeString()),
    datasets: [{
      label: 'Confidence',
      data: intents.map(i => i.confidence ?? 0),
      borderColor: '#8b5cf6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.3
    }]
  };
  const intentsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const i = intents[ctx.dataIndex];
            return `${i.intent} • ${i.confidence?.toFixed?.(2) ?? '-'}\n${(i.replySnippet || '').slice(0, 60)}`;
          }
        }
      },
      legend: { display: false }
    },
    scales: { y: { beginAtZero: true, max: 1 } }
  };

  const fallbackBlocks = intents.filter(i => i.fallback && (i.confidence ?? 1) < 0.5).slice(0, 10);

  const diagData = {
    labels: ['NLU parse', 'DB fetch', 'TTS gen'],
    datasets: [{
      label: 'ms',
      data: [diag.nluMs, diag.dbMs, diag.ttsMs],
      backgroundColor: ['#22d3ee', '#f59e0b', '#8b5cf6']
    }]
  };
  const diagOptions = { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.raw} ms` } } } };

  // Jeśli brak tokena, wymuś logowanie
  if (!tokenOk) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans" style={{ background: 'var(--bg0)', color: 'var(--fg0)' }}>
        <div className="glass p-8 rounded-2xl border border-[var(--border)] max-w-md w-full text-center shadow-2xl relative z-10">
          <div className="size-16 rounded-xl glass neon-ring flex items-center justify-center mx-auto mb-6 text-[var(--neon)]">
            <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7L12 12L22 7L12 2Z" /><path d="M2 17L12 22L22 17" /><path d="M2 12L12 17L22 12" /></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Panel Administratora</h2>
          <p className="text-[var(--muted)] mb-6 text-sm">Wprowadź token dostępu, aby zobaczyć dane.</p>
          <input
            type="password"
            autoFocus
            className="w-full p-3 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[var(--border)] focus:border-[var(--neon)] outline-none transition-colors text-center text-lg tracking-widest mb-4 placeholder-gray-600"
            placeholder="••••••••"
            onKeyDown={(e) => { if (e.key === 'Enter') saveToken(e.currentTarget.value) }}
          />
          <button
            className="w-full py-3 rounded-xl bg-[var(--neon)] text-black font-bold hover:opacity-90 transition-opacity"
            onClick={(e) => saveToken(e.currentTarget.previousElementSibling.value)}
          >
            Zaloguj
          </button>
        </div>
        {/* Tło dla logowania */}
        <div className="fixed inset-0 pointer-events-none" style={{
          background: `radial-gradient(circle at center, rgba(34,211,238,0.1) 0%, transparent 70%)`
        }}></div>
        <div className="grid-overlay"></div>
      </div>
    );
  }

  // Loading state UI
  if (loading && !analyticsData) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg0)' }}>
        <div className="grid-overlay"></div>
        <div className="relative w-24 h-24 z-10">
          <div className="absolute inset-0 border-4 border-[var(--border)] rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-[var(--neon)] rounded-full animate-spin"></div>
        </div>
        <h2 className="mt-8 text-xl tracking-widest text-[var(--fg0)] animate-pulse z-10">
          INITIALIZING...
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-[rgba(91,124,255,.25)] selection:text-[var(--fg0)]" style={{ background: 'var(--bg0)' }}>
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(1100px 700px at 20% 10%, rgba(91,124,255,.12), transparent 60%),
          radial-gradient(900px 600px at 85% 20%, rgba(56,189,248,.10), transparent 55%),
          radial-gradient(700px 500px at 55% 85%, rgba(139,92,246,.08), transparent 60%),
          linear-gradient(180deg, var(--bg0), var(--bg1))
        `
      }}></div>
      <div className="grid-overlay"></div>

      <div className="relative max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-5">

        {/* --- Top Header --- */}
        <header className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl glass neon-ring flex items-center justify-center text-[var(--neon)]">
              {/* Logo / Icon */}
              <svg className="size-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-[16px] sm:text-lg font-semibold tracking-tight truncate text-[var(--fg0)]">Panel Administratora</h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full glass border border-[var(--border)] text-[var(--muted)]">v2.0</span>
                <span className="hidden sm:inline text-[11px] text-[var(--muted)]">{new Date().toLocaleTimeString()}</span>
              </div>
              <p className="text-[12px] text-[var(--muted)] leading-4 truncate">FreeFlow System • {accounts.length} users • {restaurants.length} restaurants</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Global Controls */}
            <div className="hidden md:flex items-center gap-2 glass rounded-xl px-2 py-1 border border-[var(--border)]">
              <span className="text-[11px] text-[var(--muted)]">Okres</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-[12px] font-medium focus-ring rounded-lg px-2 py-1 text-[var(--fg0)] outline-none cursor-pointer"
              >
                <option value="7 dni">7 dni</option>
                <option value="30 dni">30 dni</option>
                <option value="90 dni">90 dni</option>
              </select>
            </div>

            <button
              onClick={refreshData}
              disabled={loading}
              className="glass rounded-xl px-3 py-2 text-[12px] font-medium border border-[var(--border)] hover:neon-ring transition-shadow focus-ring text-[var(--fg0)]"
            >
              <span className="inline-flex items-center gap-2">
                <span className={loading ? "animate-spin" : ""}>↻</span>
                <span className="hidden sm:inline">Odśwież</span>
              </span>
            </button>

            <button
              onClick={toggleDarkMode}
              className="glass rounded-xl px-3 py-2 text-[12px] font-medium border border-[var(--border)] hover:neon-ring transition-shadow focus-ring text-[var(--fg0)]"
            >
              {darkMode ? '🌙 Dark' : '☀️ Light'}
            </button>

            <button
              onClick={() => setTheme(theme === 'v2' ? 'v1' : 'v2')}
              className="glass rounded-xl px-3 py-2 text-[12px] font-medium border border-[var(--border)] hover:neon-ring transition-shadow focus-ring text-[var(--fg0)]"
            >
              {theme === 'v2' ? '🔮 Modern' : '🏛️ Classic'}
            </button>

            <button
              onClick={() => navigate('/')}
              className="glass rounded-xl px-3 py-2 text-[12px] font-medium border border-[var(--border)] hover:neon-ring transition-shadow focus-ring text-[var(--fg0)] ml-2"
              title="Wróć do strony głównej"
            >
              🏠 Powrót
            </button>
          </div>
        </header>

        {/* --- Global System Status (Agent Loop) --- */}
        {systemStatus && (
          <div className={`mb-4 px-4 py-2 rounded-xl flex items-center justify-between gap-3 border transition-colors
            ${systemStatus.state === 'ALL SYSTEMS OPERATIONAL' ? 'bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.3)]' :
              systemStatus.state === 'INVALID' ? 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]' :
                'bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]'}
          `}>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {systemStatus.state === 'ALL SYSTEMS OPERATIONAL' ? '🟢' :
                  systemStatus.state === 'INVALID' ? '🔴' : '🟡'}
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--fg0)]">
                Status Systemu: {systemStatus.state}
              </span>
              <span className="text-[11px] text-[var(--muted)] ml-2">— {systemStatus.label}</span>
            </div>
            <div className="text-[10px] text-[var(--muted)] flex items-center gap-3">
              <span>Confidence: {(systemStatus.confidence * 100).toFixed(0)}%</span>
              <span>Checked: {new Date(systemStatus.last_checked).toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* --- KPI Grid --- */}
        <section className="mt-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

            {/* KPI 1 Revenue */}
            <div className="glass rounded-xl px-4 py-3 border border-[var(--border)] hover:neon-ring transition-shadow fade-in">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg glass-strong flex items-center justify-center border border-[var(--border)] text-[#22c55e]">
                    $
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                      {getStatusIcon('revenue')} Przychód Total
                    </div>
                    <div className="text-[16px] font-semibold tracking-tight text-[var(--fg0)]">
                      {analyticsData?.totalRevenue?.toLocaleString('pl-PL') || '0'} zł
                    </div>
                  </div>
                </div>
                {analyticsData?.revenueChange !== undefined && (
                  <div className={`text-[11px] font-medium px-2 py-0.5 rounded-full border border-[var(--border)] glass ${analyticsData.revenueChange >= 0 ? 'text-[var(--good)]' : 'text-[var(--bad)]'}`}>
                    {analyticsData.revenueChange > 0 ? '+' : ''}{analyticsData.revenueChange}%
                  </div>
                )}
              </div>
            </div>

            {/* KPI 2 Intent Confidence (replacing Latency for visual variance) */}
            <div className="glass rounded-xl px-4 py-3 border border-[var(--border)] hover:neon-ring transition-shadow fade-in" style={{ animationDelay: '50ms' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg glass-strong flex items-center justify-center border border-[var(--border)] text-[var(--neon)]">
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93L7.76 7.76M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                      {getStatusIcon('ai_intervention')} Interwencje AI
                    </div>
                    <div className="text-[16px] font-semibold tracking-tight text-[var(--fg0)]">
                      {((1 - (learningStats.feedbackStats.negative / (learningStats.total || 1))) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-[var(--muted)]">Efficiency</div>
              </div>
            </div>

            {/* KPI 3 Orders */}
            <div className="glass rounded-xl px-4 py-3 border border-[var(--border)] hover:neon-ring transition-shadow fade-in" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg glass-strong flex items-center justify-center border border-[var(--border)] text-[var(--neon2)]">
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                      {getStatusIcon('orders')} Zamówienia
                    </div>
                    <div className="text-[16px] font-semibold tracking-tight text-[var(--fg0)]">
                      {analyticsData?.totalOrders || 0}
                    </div>
                  </div>
                </div>
                {analyticsData?.ordersChange !== undefined && (
                  <div className={`text-[11px] font-medium px-2 py-0.5 rounded-full border border-[var(--border)] glass ${analyticsData.ordersChange >= 0 ? 'text-[var(--good)]' : 'text-[var(--bad)]'}`}>
                    {analyticsData.ordersChange > 0 ? '+' : ''}{analyticsData.ordersChange}%
                  </div>
                )}
              </div>
            </div>

            {/* KPI 4 Avg Order */}
            <div className="glass rounded-xl px-4 py-3 border border-[var(--border)] hover:neon-ring transition-shadow fade-in" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg glass-strong flex items-center justify-center border border-[var(--border)] text-purple-400">
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                      {getStatusIcon('orders')} Śr. Zamówienie
                    </div>
                    <div className="text-[16px] font-semibold tracking-tight text-[var(--fg0)]">
                      {analyticsData?.averageOrderValue?.toFixed(2) || '0.00'} zł
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI 5 System Status */}
            <div className="glass rounded-xl px-4 py-3 border border-[var(--border)] hover:neon-ring transition-shadow fade-in" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`size-9 rounded-lg glass-strong flex items-center justify-center border border-[var(--border)] ${hb.status.includes('online') ? 'text-[var(--good)]' : 'text-[var(--bad)]'}`}>
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                      Status Silnika
                    </div>
                    <div className="text-[16px] font-semibold tracking-tight text-[var(--fg0)]">
                      {hb.status === 'unknown' ? 'Checking...' : hb.status.includes('online') ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-[var(--muted)]">{diag.durationMs}ms lat.</div>
              </div>
            </div>

          </div>
        </section>

        {/* --- Tabs --- */}
        <section className="mb-4">
          <div className="glass rounded-xl border border-[var(--border)] px-2 py-2 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1">
              {[
                { id: 'insights', label: 'Dashboard' },
                { id: 'control', label: 'Live Control' },
                { id: 'learning', label: 'Brain / Learning' },
                { id: 'alerts', label: 'System Alerts' },
                { id: 'config', label: 'Konfiguracja Menu' },
                { id: 'events', label: 'Wydarzenia' },
                { id: 'conversations', label: 'Rozmowy' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-[12px] font-medium rounded-lg border transition-all whitespace-nowrap
                      ${activeTab === tab.id
                      ? 'bg-[rgba(255,255,255,.08)] border-[var(--border)] text-[var(--fg0)] shadow-[0_0_10px_rgba(91,124,255,0.1)]'
                      : 'border-transparent text-[var(--muted)] hover:bg-[rgba(255,255,255,.04)] hover:text-[var(--fg0)]'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="hidden md:flex items-center px-3 border-l border-[var(--border)] text-[11px] text-[var(--muted)]">
              Admin Mode
            </div>
          </div>
        </section>

        {/* --- Main Content --- */}
        <main className="fade-in">

          {/* TAB: INSIGHTS (Overview) */}
          {activeTab === 'insights' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

              {/* Main Chart (Left, 8 cols) */}
              <div className="lg:col-span-8 glass rounded-xl border border-[var(--border)] p-4 flex flex-col h-[400px]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--fg0)]">Sprzedaż & Ruch</div>
                    <div className="text-[11px] text-[var(--muted)]">Zamówienia vs Czas</div>
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">Live Data</div>
                </div>
                <div className="flex-1 relative w-full min-h-0">
                  {ordersChart ? (
                    <Line
                      data={ordersChartData}
                      options={{ ...chartOptions, maintainAspectRatio: false }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-[var(--muted)]">Ładowanie wykresu...</div>
                  )}
                </div>
              </div>

              {/* Right Side Widgets (4 cols) */}
              <div className="lg:col-span-4 grid grid-cols-1 gap-3 content-start">
                {/* Hourly Distribution Donut */}
                <div className="glass rounded-xl border border-[var(--border)] p-4 h-[220px] flex flex-col">
                  <div className="mb-2">
                    <div className="text-[13px] font-semibold text-[var(--fg0)]">Szczyt Godzinowy</div>
                    <div className="text-[11px] text-[var(--muted)]">Kiedy zamawiają najczęściej?</div>
                  </div>
                  <div className="flex-1 relative min-h-0">
                    {hourlyChart && <Doughnut data={hourlyChartData} options={doughnutOptions} />}
                  </div>
                </div>

                {/* Top Stats List */}
                <div className="glass rounded-xl border border-[var(--border)] p-4 h-[170px] overflow-auto tiny-scroll">
                  <div className="text-[13px] font-semibold text-[var(--fg0)] mb-2 sticky top-0 bg-[var(--glass)] backdrop-blur-md pb-1 border-b border-[var(--border)]">Top Dania</div>
                  <div className="space-y-2 mt-2">
                    {topDishes.slice(0, 3).map((d, i) => (
                      <div key={i} className="flex justify-between items-center text-[12px]">
                        <span className="text-[var(--fg0)] truncate pr-2">{d.name}</span>
                        <span className="text-[var(--neon)] font-mono">{d.orders}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Diagnostics / Dev Widgets (Full Width) */}
              <div className="lg:col-span-12 glass rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[12px] font-semibold text-[var(--fg0)]">System & Amber Diagnostics</div>
                  <span className="text-[11px] text-[var(--muted)]">Real-time metrics</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Widget 1: Health */}
                  <div className="glass-strong rounded-xl border border-[var(--border)] p-3">
                    <div className="text-[11px] text-[var(--muted)]">Status Połączenia</div>
                    <div className="mt-1 flex items-end justify-between">
                      <div className={`text-[18px] font-semibold ${hb.status.includes('online') ? 'text-[var(--good)]' : 'text-[var(--bad)]'}`}>{hb.status}</div>
                      <div className="text-[11px] text-[var(--muted)]">{new Date().toLocaleTimeString()}</div>
                    </div>
                  </div>
                  {/* Widget 2: NLU Latency */}
                  <div className="glass-strong rounded-xl border border-[var(--border)] p-3">
                    <div className="text-[11px] text-[var(--muted)]">Amber NLU Latency</div>
                    <div className="mt-1 flex items-end justify-between">
                      <div className="text-[18px] font-semibold text-[var(--neon)]">{diag.nluMs} ms</div>
                      <div className="text-[11px] text-[var(--muted)]">Parse time</div>
                    </div>
                    {/* Mini bar */}
                    <div className="mt-2 h-1 bg-black/20 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--neon)]" style={{ width: `${Math.min(100, diag.nluMs / 5)}%` }}></div>
                    </div>
                  </div>
                  {/* Widget 3: DB Latency */}
                  <div className="glass-strong rounded-xl border border-[var(--border)] p-3">
                    <div className="text-[11px] text-[var(--muted)]">Database Latency</div>
                    <div className="mt-1 flex items-end justify-between">
                      <div className="text-[18px] font-semibold text-[var(--warn)]">{diag.dbMs} ms</div>
                      <div className="text-[11px] text-[var(--muted)]">Query time</div>
                    </div>
                    <div className="mt-2 h-1 bg-black/20 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--warn)]" style={{ width: `${Math.min(100, diag.dbMs / 5)}%` }}></div>
                    </div>
                  </div>
                  {/* Widget 4: Memory/CPU (Mock) */}
                  <div className="glass-strong rounded-xl border border-[var(--border)] p-3">
                    <div className="text-[11px] text-[var(--muted)]">Server Load</div>
                    <div className="mt-1 flex items-end justify-between">
                      <div className="text-[18px] font-semibold text-[var(--neon2)]">24%</div>
                      <div className="text-[11px] text-[var(--muted)]">Stable</div>
                    </div>
                    <div className="mt-2 h-1 bg-black/20 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--neon2)]" style={{ width: '24%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: CONTROL (Amber Live) */}
          {activeTab === 'control' && (
            <div className="glass rounded-xl border border-[var(--border)] p-4 min-h-[600px]">
              <AmberControlDeck adminToken={adminToken} />
            </div>
          )}

          {/* TAB: LEARNING */}
          {activeTab === 'learning' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-8 glass rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[13px] font-semibold text-[var(--fg0)]">Uczenie Feedbackowe</div>
                  <button onClick={() => loadLearningStats()} className="text-[11px] glass px-2 py-1 rounded hover:bg-white/10">Odśwież</button>
                </div>
                {/* Table of learnings */}
                <div className="overflow-auto max-h-[500px] tiny-scroll">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[var(--glass-strong)] backdrop-blur-md z-10 text-[11px] text-[var(--muted)] uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Intencja</th>
                        <th className="p-3">Feedback</th>
                        <th className="p-3">Input</th>
                        <th className="p-3">Czas</th>
                      </tr>
                    </thead>
                    <tbody className="text-[12px] text-[var(--fg0)] divide-y divide-[var(--border)]">
                      {learningStats.latest.map((item, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="p-3"><span className="px-2 py-1 rounded bg-[rgba(139,92,246,0.2)] text-[#a78bfa]">{item.intent}</span></td>
                          <td className="p-3">
                            {item.feedback_score > 0 ? <span className="text-[var(--good)]">Pozytywny</span> :
                              item.feedback_score < 0 ? <span className="text-[var(--bad)]">Negatywny</span> : <span className="text-[var(--muted)]">Neutral</span>}
                          </td>
                          <td className="p-3 opacity-80">{item.input_text}</td>
                          <td className="p-3 text-[var(--muted)]">{new Date(item.created_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Right side charts for Learning */}
              <div className="lg:col-span-4 space-y-3">
                <div className="glass rounded-xl border border-[var(--border)] p-4">
                  <h3 className="text-[12px] font-semibold mb-2">Rozkład Feedbacku</h3>
                  <div className="h-[200px]">
                    <Doughnut data={{
                      labels: ['Poz', 'Neg', 'Neu'],
                      datasets: [{
                        data: [learningStats.feedbackStats.positive, learningStats.feedbackStats.negative, learningStats.feedbackStats.neutral],
                        backgroundColor: ['#22c55e', '#ef4444', '#64748b'],
                        borderWidth: 0
                      }]
                    }} options={doughnutOptions} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ALERTS */}
          {activeTab === 'alerts' && (
            <div className="glass rounded-xl border border-[var(--border)] p-4">
              <div className="flex flex-col gap-4">
                <h3 className="text-[14px] font-semibold text-[var(--fg0)]">System Alerts & Logs</h3>
                <div className="space-y-2">
                  {alerts.map((alert, idx) => (
                    <div key={idx} className="glass-strong border border-[var(--border)] p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`size-2 rounded-full ${alert.severity === 'high' ? 'bg-[var(--bad)]' : 'bg-[var(--warn)]'}`}></div>
                        <span className="text-[13px] font-medium">{alert.type}</span>
                        <span className="text-[12px] text-[var(--muted)]">{alert.message}</span>
                      </div>
                      <span className="text-[11px] text-[var(--muted)]">{new Date(alert.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                  {alerts.length === 0 && <div className="text-[var(--muted)] italic p-4 text-center">System is stable. No active alerts.</div>}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONFIG (MENU) */}
          {activeTab === 'config' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass rounded-xl border border-[var(--border)] p-4 max-h-[600px] overflow-auto tiny-scroll">
                <h3 className="text-[13px] font-semibold mb-4 text-[var(--fg0)]">Restauracje</h3>
                <div className="space-y-1">
                  {restaurants.map(r => (
                    <div
                      key={r.id}
                      onClick={() => loadMenu(r)}
                      className={`p-3 rounded-lg cursor-pointer border transition-all flex justify-between
                             ${selectedRestaurant?.id === r.id ? 'bg-[var(--neon)]/20 border-[var(--neon)]' : 'border-transparent hover:bg-white/5'}
                          `}
                    >
                      <span className="font-medium text-[13px]">{r.name}</span>
                      <span className="text-[11px] text-[var(--muted)]">{r.partner_mode}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-xl border border-[var(--border)] p-4 max-h-[600px] overflow-auto tiny-scroll flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[13px] font-semibold text-[var(--fg0)]">
                    Menu {selectedRestaurant ? `— ${selectedRestaurant.name}` : '(Wybierz restaurację)'}
                  </h3>
                  <button
                    disabled={!selectedRestaurant}
                    onClick={() => setShowAddModal(true)}
                    className="glass px-3 py-1 rounded text-[11px] border border-[var(--border)] hover:bg-[var(--neon)]/20 disabled:opacity-50"
                  >
                    + Dodaj
                  </button>
                </div>

                {selectedRestaurant ? (
                  <table className="w-full text-left border-collapse">
                    <thead className="text-[11px] text-[var(--muted)] uppercase border-b border-[var(--border)]">
                      <tr>
                        <th className="py-2">Nazwa</th>
                        <th className="py-2">Cena</th>
                        <th className="py-2">Dostępność</th>
                      </tr>
                    </thead>
                    <tbody className="text-[12px] text-[var(--fg0)]">
                      {menuItems.map(m => (
                        <tr key={m.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/5">
                          <td className="py-2">{m.name}</td>
                          <td className="py-2 font-mono">{Number(m.price).toFixed(2)}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${m.available ? 'bg-[var(--good)]/20 text-[var(--good)]' : 'bg-[var(--bad)]/20 text-[var(--bad)]'}`}>
                              {m.available ? 'TAK' : 'NIE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[var(--muted)] text-[12px]">
                    Wybierz restaurację z listy po lewej
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: EVENTS (FreeFun) */}
          {activeTab === 'events' && (
            <div className="glass rounded-xl border border-[var(--border)] p-4 min-h-[600px]">
              <FreeFunSection />
            </div>
          )}

          {/* TAB: CONVERSATIONS */}
          {activeTab === 'conversations' && (
            <div className="glass rounded-xl border border-[var(--border)] p-4 h-[650px]">
              <ConversationViewer adminToken={adminToken} />
            </div>
          )}
        </main>
      </div>

      {/* --- Add Item Modal --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong border border-[var(--border)] p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--fg0)] mb-4">Dodaj pozycję menu</h3>
            <div className="space-y-3">
              <input
                placeholder="Nazwa dania"
                value={newItem.name}
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full bg-[rgba(0,0,0,0.3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--fg0)] focus:border-[var(--neon)] outline-none"
              />
              <div className="flex gap-3">
                <input
                  placeholder="Cena (PLN)"
                  value={newItem.price}
                  onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                  className="flex-1 bg-[rgba(0,0,0,0.3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--fg0)] focus:border-[var(--neon)] outline-none"
                />
                <input
                  placeholder="Kategoria"
                  value={newItem.category}
                  onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                  className="flex-1 bg-[rgba(0,0,0,0.3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--fg0)] focus:border-[var(--neon)] outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-[13px] text-[var(--muted)] cursor-pointer">
                <input type="checkbox" checked={newItem.available} onChange={e => setNewItem({ ...newItem, available: e.target.checked })} />
                Dostępne w sprzedaży
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg text-[12px] bg-white/5 hover:bg-white/10 text-[var(--fg0)]">Anuluj</button>
              <button onClick={saveMenuItem} className="px-4 py-2 rounded-lg text-[12px] bg-[var(--neon)] hover:brightness-110 text-white font-medium shadow-[0_0_15px_rgba(91,124,255,0.4)]">Zapisz</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
