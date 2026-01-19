// Debug orders and restaurant matching
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ezemaacyyvbpjlagchds.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZW1hYWN5eXZicGpsYWdjaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODU1MzYsImV4cCI6MjA3NTM2MTUzNn0.uRKmqxL0Isx3DmOxmgc_zPwG5foYXft9WpIROoTTgGU'
);

async function debugOrdersRestaurant() {
  console.log('🔍 Debugging orders and restaurant matching...');
  
  try {
    // 1. Get all restaurants
    console.log('🏪 Getting all restaurants...');
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name')
      .order('name');
    
    if (restaurantsError) {
      console.error('❌ Restaurants error:', restaurantsError);
      return;
    }
    
    console.log('✅ Found restaurants:', restaurants);
    
    // 2. Get all orders
    console.log('\n📦 Getting all orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, restaurant_id, user_id, total_price, status, created_at, items')
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('❌ Orders error:', ordersError);
      return;
    }
    
    console.log('✅ Found orders:', orders);
    
    // 3. Check which orders match which restaurants
    console.log('\n🔗 Checking order-restaurant matching...');
    for (const order of orders) {
      const restaurant = restaurants.find(r => r.id === order.restaurant_id);
      console.log(`Order ${order.id}:`);
      console.log(`  Restaurant ID: ${order.restaurant_id}`);
      console.log(`  Restaurant Name: ${restaurant ? restaurant.name : 'NOT FOUND'}`);
      console.log(`  Total: ${order.total_price} zł`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Items: ${order.items ? 'Present' : 'Missing'}`);
      console.log('');
    }
    
    // 4. Test BusinessPanel query for each restaurant
    console.log('🧪 Testing BusinessPanel queries...');
    for (const restaurant of restaurants.slice(0, 3)) { // Test first 3 restaurants
      console.log(`\nTesting restaurant: ${restaurant.name} (${restaurant.id})`);
      
      const { data: restaurantOrders, error: restaurantOrdersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });
      
      if (restaurantOrdersError) {
        console.error(`❌ Error for ${restaurant.name}:`, restaurantOrdersError);
      } else {
        console.log(`✅ Found ${restaurantOrders.length} orders for ${restaurant.name}`);
        if (restaurantOrders.length > 0) {
          console.log('  Orders:', restaurantOrders.map(o => ({
            id: o.id,
            total: o.total_price,
            status: o.status,
            items: o.items ? 'Present' : 'Missing'
          })));
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugOrdersRestaurant();
