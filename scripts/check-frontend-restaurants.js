// Check restaurants table structure in frontend database
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ezemaacyyvbpjlagchds.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZW1hYWN5eXZicGpsYWdjaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODU1MzYsImV4cCI6MjA3NTM2MTUzNn0.uRKmqxL0Isx3DmOxmgc_zPwG5foYXft9WpIROoTTgGU'
);

async function checkFrontendRestaurants() {
  console.log('🔍 Checking restaurants table in frontend database...');
  
  try {
    // Check restaurants table structure
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('*')
      .limit(3);
    
    if (restaurantsError) {
      console.error('❌ Restaurants error:', restaurantsError);
      return;
    }
    
    console.log('✅ Restaurants table structure:');
    if (restaurants && restaurants.length > 0) {
      console.log('Columns:', Object.keys(restaurants[0]));
      console.log('Sample records:', restaurants);
    } else {
      console.log('Restaurants table exists but is empty');
    }
    
    // Check menu_items table structure
    const { data: menuItems, error: menuItemsError } = await supabase
      .from('menu_items')
      .select('*')
      .limit(3);
    
    if (menuItemsError) {
      console.error('❌ Menu items error:', menuItemsError);
    } else {
      console.log('\n✅ Menu items table structure:');
      if (menuItems && menuItems.length > 0) {
        console.log('Columns:', Object.keys(menuItems[0]));
        console.log('Sample records:', menuItems);
      } else {
        console.log('Menu items table exists but is empty');
      }
    }
    
  } catch (error) {
    console.error('❌ Check error:', error);
  }
}

checkFrontendRestaurants();
