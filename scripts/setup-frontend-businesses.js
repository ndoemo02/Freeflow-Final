// Setup businesses in frontend Supabase database
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ezemaacyyvbpjlagchds.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZW1hYWN5eXZicGpsYWdjaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODU1MzYsImV4cCI6MjA3NTM2MTUzNn0.uRKmqxL0Isx3DmOxmgc_zPwG5foYXft9WpIROoTTgGU'
);

async function setupFrontendBusinesses() {
  console.log('🔧 Setting up businesses in frontend database...');
  
  try {
    // First, let's check what tables exist
    console.log('🔍 Checking available tables...');
    
    // Check if businesses table exists
    const { data: businessesTest, error: businessesTestError } = await supabase
      .from('businesses')
      .select('*')
      .limit(1);
    
    if (businessesTestError) {
      console.log('❌ Businesses table error:', businessesTestError.message);
      console.log('📋 Businesses table might not exist in frontend database');
    } else {
      console.log('✅ Businesses table exists');
    }
    
    // Check if restaurants table exists
    const { data: restaurantsTest, error: restaurantsTestError } = await supabase
      .from('restaurants')
      .select('*')
      .limit(1);
    
    if (restaurantsTestError) {
      console.log('❌ Restaurants table error:', restaurantsTestError.message);
      console.log('📋 Restaurants table might not exist in frontend database');
    } else {
      console.log('✅ Restaurants table exists');
    }
    
    // Check if menu_items table exists
    const { data: menuTest, error: menuTestError } = await supabase
      .from('menu_items')
      .select('*')
      .limit(1);
    
    if (menuTestError) {
      console.log('❌ Menu items table error:', menuTestError.message);
      console.log('📋 Menu items table might not exist in frontend database');
    } else {
      console.log('✅ Menu items table exists');
    }
    
    // Let's try to create a simple test business
    console.log('\n🧪 Creating test business...');
    const { data: testBusiness, error: testBusinessError } = await supabase
      .from('businesses')
      .insert({
        name: 'Test Business',
        city: 'Test City',
        owner_id: 'test-user-id',
        is_active: true
      })
      .select()
      .single();
    
    if (testBusinessError) {
      console.log('❌ Test business creation error:', testBusinessError.message);
    } else {
      console.log('✅ Test business created:', testBusiness);
      
      // Clean up test business
      await supabase
        .from('businesses')
        .delete()
        .eq('id', testBusiness.id);
      console.log('🧹 Test business cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

setupFrontendBusinesses();
