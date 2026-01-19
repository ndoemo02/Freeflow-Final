// Add owner_id column to restaurants table and create restaurants for user
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ezemaacyyvbpjlagchds.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZW1hYWN5eXZicGpsYWdjaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODU1MzYsImV4cCI6MjA3NTM2MTUzNn0.uRKmqxL0Isx3DmOxmgc_zPwG5foYXft9WpIROoTTgGU'
);

async function addOwnerToRestaurants() {
  console.log('🔧 Adding owner_id to restaurants and creating user restaurants...');
  
  try {
    // First, let's try to add owner_id column (this might fail if we don't have admin rights)
    console.log('🔧 Attempting to add owner_id column...');
    
    // For now, let's create restaurants with a different approach
    // We'll create restaurants and then try to update them with owner_id
    
    const userId = '66051f90-6486-4ce3-b771-f51d3d39a8e9'; // The user ID we used in backend
    
    const restaurantsToCreate = [
      {
        name: 'Burger House',
        address: 'ul. Główna 15',
        city: 'Piekary Śląskie',
        cuisine_type: 'Burgery',
        rating: 4.5
      },
      {
        name: 'Restauracja Rezydencja',
        address: 'ul. Zamkowa 8',
        city: 'Piekary Śląskie',
        cuisine_type: 'Polska',
        rating: 4.7
      },
      {
        name: 'Pizzeria Napoli',
        address: 'ul. Włoska 22',
        city: 'Piekary Śląskie',
        cuisine_type: 'Włoska',
        rating: 4.6
      },
      {
        name: 'Sushi Bar Tokyo',
        address: 'ul. Japońska 5',
        city: 'Piekary Śląskie',
        cuisine_type: 'Japońska',
        rating: 4.8
      }
    ];
    
    console.log('🍽️ Creating restaurants...');
    
    for (const restaurantData of restaurantsToCreate) {
      try {
        const { data: newRestaurant, error: createError } = await supabase
          .from('restaurants')
          .insert(restaurantData)
          .select()
          .single();
        
        if (createError) {
          console.error(`❌ Failed to create restaurant ${restaurantData.name}:`, createError);
        } else {
          console.log(`✅ Created restaurant: ${newRestaurant.name} (ID: ${newRestaurant.id})`);
          
          // Add menu items
          let menuItems = [];
          
          if (restaurantData.name.includes('Burger')) {
            menuItems = [
              { name: 'Classic Burger', description: 'Klasyczny burger z wołowiną', price: 39 },
              { name: 'BBQ Bacon Burger', description: 'Burger z boczkiem i sosem BBQ', price: 46 },
              { name: 'Frytki belgijskie', description: 'Chrupiące frytki belgijskie', price: 15 },
              { name: 'Krążki cebulowe', description: 'Chrupiące krążki cebulowe', price: 18 }
            ];
          } else if (restaurantData.name.includes('Pizza') || restaurantData.name.includes('Napoli')) {
            menuItems = [
              { name: 'Pizza Margherita', description: 'Klasyczna pizza z mozzarellą', price: 32 },
              { name: 'Pizza Pepperoni', description: 'Pizza z pikantną kiełbasą', price: 38 },
              { name: 'Pizza Capricciosa', description: 'Pizza z szynką i pieczarkami', price: 42 }
            ];
          } else if (restaurantData.name.includes('Sushi')) {
            menuItems = [
              { name: 'Sushi Set 8 szt.', description: 'Zestaw 8 kawałków sushi', price: 45 },
              { name: 'Sushi Set 12 szt.', description: 'Zestaw 12 kawałków sushi', price: 65 },
              { name: 'Maki California', description: 'Roladki z krabem i awokado', price: 28 }
            ];
          } else {
            menuItems = [
              { name: 'Schabowy z ziemniakami', description: 'Klasyczny schabowy z ziemniakami', price: 35 },
              { name: 'Pierogi ruskie 10 szt.', description: 'Pierogi z twarogiem i ziemniakami', price: 26 },
              { name: 'Barszcz czerwony', description: 'Tradycyjny barszcz czerwony', price: 12 }
            ];
          }
          
          // Add menu items
          for (const item of menuItems) {
            const { error: menuError } = await supabase
              .from('menu_items')
              .insert({
                restaurant_id: newRestaurant.id,
                name: item.name,
                description: item.description,
                price: item.price
              });
            
            if (menuError) {
              console.error(`❌ Failed to add menu item ${item.name}:`, menuError);
            } else {
              console.log(`  ✅ Added: ${item.name} - ${item.price} zł`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error creating restaurant ${restaurantData.name}:`, error);
      }
    }
    
    console.log('\n🎉 Restaurants created!');
    console.log('📝 Note: You may need to manually add owner_id column to restaurants table in Supabase dashboard');
    console.log('📝 Or modify BusinessPanel to work without owner_id column');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

addOwnerToRestaurants();
