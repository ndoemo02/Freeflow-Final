import { supabase } from './supabase';

export interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  customerSatisfaction: number;
  revenueChange: number;
  ordersChange: number;
  avgOrderChange: number;
  satisfactionChange: number;
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

// Pobierz podstawowe metryki KPI
export async function getAnalyticsKPI(period: string = '7'): Promise<AnalyticsData> {
  try {
    // Oblicz daty dla porównania
    const endDate = new Date();
    const startDate = new Date();
    const days = Number.isFinite(parseInt(period)) ? parseInt(period) : 7;
    startDate.setDate(endDate.getDate() - days);
    
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(startDate.getDate() - days);
    const prevEndDate = new Date(startDate);

    // Pobierz zamówienia z aktualnego okresu
    const { data: currentOrders, error: currentError } = await supabase
      .from('orders')
      .select('total_cents,total_price,created_at,status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (currentError) {
      console.error('Error fetching current orders:', currentError);
      return getMockAnalyticsKPI();
    }

    // Pobierz zamówienia z poprzedniego okresu (dla porównania)
    const { data: prevOrders, error: prevError } = await supabase
      .from('orders')
      .select('total_cents,total_price,created_at,status')
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString());

    if (prevError) {
      console.error('Error fetching previous orders:', prevError);
    }

    // Oblicz metryki dla aktualnego okresu
    const valueOf = (o: any) => {
      if (typeof o?.total_price === 'number') return o.total_price;
      if (typeof o?.total_cents === 'number') return o.total_cents / 100;
      if (typeof o?.total === 'number') return o.total;
      return 0;
    };
    const totalRevenue = currentOrders?.reduce((sum, order) => sum + valueOf(order), 0) || 0;
    const totalOrders = currentOrders?.length || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Oblicz metryki dla poprzedniego okresu
    const prevRevenue = prevOrders?.reduce((sum, order) => sum + valueOf(order), 0) || 0;
    const prevOrdersCount = prevOrders?.length || 0;
    const prevAvgOrder = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;

    // Oblicz zmiany procentowe
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const ordersChange = prevOrdersCount > 0 ? ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100 : 0;
    const avgOrderChange = prevAvgOrder > 0 ? ((averageOrderValue - prevAvgOrder) / prevAvgOrder) * 100 : 0;

    // Pobierz oceny klientów (mock na razie - możesz dodać tabelę reviews)
    const customerSatisfaction = 97.3;
    const satisfactionChange = -0.8;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      customerSatisfaction,
      revenueChange,
      ordersChange,
      avgOrderChange,
      satisfactionChange
    };

  } catch (error) {
    console.error('Error in getAnalyticsKPI:', error);
    return getMockAnalyticsKPI();
  }
}

// Pobierz dane dla wykresu zamówień w czasie
export async function getOrdersChartData(period: string = '7'): Promise<OrdersChartData> {
  try {
    const days = parseInt(period);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('created_at, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at');

    if (error) {
      console.error('Error fetching orders chart data:', error);
      return getMockOrdersChartData();
    }

    // Grupuj zamówienia po dniach
    const dailyOrders: { [key: string]: number } = {};
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
      dailyOrders[dateKey] = 0;
    }

    orders?.forEach(order => {
      const dateKey = order.created_at.split('T')[0];
      if (dailyOrders.hasOwnProperty(dateKey)) {
        dailyOrders[dateKey]++;
      }
    });

    const labels = Object.keys(dailyOrders).map(date => {
      const d = new Date(date);
      return d.toLocaleDateString('pl-PL', { weekday: 'short' });
    });

    const values = Object.values(dailyOrders);

    return { labels, values };

  } catch (error) {
    console.error('Error in getOrdersChartData:', error);
    return getMockOrdersChartData();
  }
}

// Pobierz rozkład godzinowy zamówień
export async function getHourlyDistribution(): Promise<HourlyDistribution> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      console.error('Error fetching hourly distribution:', error);
      return getMockHourlyDistribution();
    }

    // Grupuj po przedziałach godzinowych
    const hourlyGroups = {
      '11:00-14:00': 0,
      '17:00-20:00': 0,
      '20:00-23:00': 0,
      'Inne': 0
    };

    orders?.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      
      if (hour >= 11 && hour < 14) {
        hourlyGroups['11:00-14:00']++;
      } else if (hour >= 17 && hour < 20) {
        hourlyGroups['17:00-20:00']++;
      } else if (hour >= 20 && hour < 23) {
        hourlyGroups['20:00-23:00']++;
      } else {
        hourlyGroups['Inne']++;
      }
    });

    const total = Object.values(hourlyGroups).reduce((sum, count) => sum + count, 0);
    const labels = Object.keys(hourlyGroups);
    const values = Object.values(hourlyGroups).map(count => 
      total > 0 ? Math.round((count / total) * 100) : 0
    );

    return { labels, values };

  } catch (error) {
    console.error('Error in getHourlyDistribution:', error);
    return getMockHourlyDistribution();
  }
}

// Pobierz top dania
export async function getTopDishes(): Promise<TopDish[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    // Najpierw sprawdź czy istnieją zamówienia z items JSON
    const { data: orders, error } = await supabase
      .from('orders')
      .select('items, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      console.error('Error fetching orders for top dishes:', error);
      return getMockTopDishes();
    }

    // Parsuj JSON items i zlicz dania
    const dishCounts: { [key: string]: { name: string; count: number } } = {};

    orders?.forEach(order => {
      try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const name = item.name || 'Nieznane danie';
            if (!dishCounts[name]) {
              dishCounts[name] = { name, count: 0 };
            }
            dishCounts[name].count += item.quantity || 1;
          });
        }
      } catch (e) {
        console.warn('Could not parse order items:', order.items);
      }
    });

    // Sortuj i zwróć top 5
    return Object.values(dishCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(dish => ({
        name: dish.name,
        description: '', // Brak opisu w items JSON
        orders: dish.count
      }));

  } catch (error) {
    console.error('Error in getTopDishes:', error);
    return getMockTopDishes();
  }
}

// Pobierz top restauracje
export async function getTopRestaurants(): Promise<TopRestaurant[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        total_cents,
        total_price,
        restaurant_id,
        restaurants!restaurant_id (
          name,
          city
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      console.error('Error fetching top restaurants:', error);
      return getMockTopRestaurants();
    }

    // Grupuj po restauracjach
    const restaurantRevenue: { [key: string]: { name: string; city: string; revenue: number } } = {};

    orders?.forEach(order => {
      const restaurant = order.restaurants as any;
      if (restaurant) {
        const key = restaurant.name;
        if (!restaurantRevenue[key]) {
          restaurantRevenue[key] = {
            name: restaurant.name,
            city: restaurant.city || '',
            revenue: 0
          };
        }
        const val = typeof (order as any).total_price === 'number'
          ? (order as any).total_price
          : ((order as any).total_cents || 0) / 100;
        restaurantRevenue[key].revenue += val;
      }
    });

    // Sortuj i zwróć top 5
    return Object.values(restaurantRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(restaurant => ({
        name: restaurant.name,
        location: restaurant.city,
        revenue: `${restaurant.revenue.toLocaleString('pl-PL')} zł`
      }));

  } catch (error) {
    console.error('Error in getTopRestaurants:', error);
    return getMockTopRestaurants();
  }
}

// Mock dane (fallback gdy brak prawdziwych danych)
function getMockAnalyticsKPI(): AnalyticsData {
  return {
    totalRevenue: 2450,  // Realistyczne 2,5k zamiast 26k
    totalOrders: 127,    // 127 zamówień zamiast 1247
    averageOrderValue: 19.29,  // Średnia wartość
    customerSatisfaction: 94.2,
    revenueChange: 8.5,
    ordersChange: 12.3,
    avgOrderChange: -2.1,
    satisfactionChange: 1.2
  };
}

function getMockOrdersChartData(): OrdersChartData {
  return {
    labels: ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sb', 'Nd'],
    values: [12, 18, 14, 25, 34, 42, 28]  // Bardziej realistyczne liczby
  };
}

function getMockHourlyDistribution(): HourlyDistribution {
  return {
    labels: ['11:00-14:00', '17:00-20:00', '20:00-23:00', 'Inne'],
    values: [45, 35, 15, 5]
  };
}

function getMockTopDishes(): TopDish[] {
  return [
    { name: 'Pizza Margherita', description: 'Klasyczna, z mozzarellą', orders: 34 },
    { name: 'Pizza Pepperoni', description: 'Z salami pepperoni', orders: 28 },
    { name: 'Kebab w picie', description: 'Z sosem czosnkowym', orders: 21 },
    { name: 'Sałatka Cezar', description: 'Z kurczakiem grillowanym', orders: 18 },
    { name: 'Frytki', description: 'Chrupiące, solone', orders: 15 }
  ];
}

function getMockTopRestaurants(): TopRestaurant[] {
  return [
    { name: 'Pizzeria Calzone', location: 'Piekary Śląskie', revenue: '854 zł' },
    { name: 'Kebab King', location: 'Centrum miasta', revenue: '628 zł' },
    { name: 'Sushi Yama', location: 'Osiedle Słoneczne', revenue: '592 zł' },
    { name: 'Burger House', location: 'Galeria handlowa', revenue: '467 zł' },
    { name: 'Pasta Milano', location: 'Stare miasto', revenue: '385 zł' }
  ];
}
