// Check orders table structure in frontend database
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ezemaacyyvbpjlagchds.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZW1hYWN5eXZicGpsYWdjaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODU1MzYsImV4cCI6MjA3NTM2MTUzNn0.uRKmqxL0Isx3DmOxmgc_zPwG5foYXft9WpIROoTTgGU'
);

async function checkOrdersStructure() {
  console.log('🔍 Checking orders table structure in frontend database...');
  
  try {
    // Check if orders table exists and its structure
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(3);
    
    if (ordersError) {
      console.error('❌ Orders table error:', ordersError);
      console.log('📋 Orders table might not exist or have RLS issues');
      return;
    }
    
    console.log('✅ Orders table structure:');
    if (orders && orders.length > 0) {
      console.log('Columns:', Object.keys(orders[0]));
      console.log('Sample records:', orders);
    } else {
      console.log('Orders table exists but is empty');
    }
    
    // Try to create a test order to see what fields are required
    console.log('\n🧪 Testing order creation...');
    const testOrder = {
      customer_id: 'test-user-id',
      restaurant_id: 'test-restaurant-id',
      status: 'pending',
      total: 50.00,
      items: JSON.stringify([{
        name: 'Test Pizza',
        price: 25.00,
        quantity: 2
      }])
    };
    
    const { data: testOrderResult, error: testOrderError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single();
    
    if (testOrderError) {
      console.error('❌ Test order creation error:', testOrderError);
    } else {
      console.log('✅ Test order created successfully:', testOrderResult);
      
      // Clean up test order
      await supabase
        .from('orders')
        .delete()
        .eq('id', testOrderResult.id);
      console.log('🧹 Test order cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Check error:', error);
  }
}

checkOrdersStructure();
