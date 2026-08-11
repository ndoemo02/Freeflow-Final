import { getApiUrl } from './config';
import { getAccessToken } from './supabase';

export interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  customerSatisfaction: number | null;
  revenueChange: number;
  ordersChange: number;
  avgOrderChange: number;
  satisfactionChange: number | null;
}

export interface OrdersChartData {
  labels: string[];
  values: number[];
}

export interface HourlyDistribution {
  labels: string[];
  values: number[];
}

export interface TopDish {
  name: string;
  description: string;
  orders: number;
}

export interface TopRestaurant {
  name: string;
  location: string;
  revenue: string;
}

export interface InternalAnalyticsSnapshot {
  kpi: AnalyticsData;
  ordersChart: OrdersChartData;
  hourly: HourlyDistribution;
  topDishes: TopDish[];
  topRestaurants: TopRestaurant[];
}

async function internalFetch(path: string) {
  const token = await getAccessToken();
  if (!token) throw new Error('Internal admin authentication required');
  const response = await fetch(getApiUrl(`/api/admin/internal-dashboard${path}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
  return payload;
}

export async function getInternalAnalytics(period = '7'): Promise<InternalAnalyticsSnapshot> {
  const parsed = Number.parseInt(period, 10);
  const days = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 90) : 7;
  const payload = await internalFetch(`/analytics?days=${days}`);
  if (!payload?.data) throw new Error('analytics_unavailable');
  return payload.data;
}

export async function getInternalAccountCount(): Promise<number> {
  const payload = await internalFetch('/account-count');
  if (!Number.isFinite(payload?.count)) throw new Error('account_count_unavailable');
  return payload.count;
}
