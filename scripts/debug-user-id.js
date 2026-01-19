// Debug user ID in frontend
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ezemaacyyvbpjlagchds.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZW1hYWN5eXZicGpsYWdjaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODU1MzYsImV4cCI6MjA3NTM2MTUzNn0.uRKmqxL0Isx3DmOxmgc_zPwG5foYXft9WpIROoTTgGU'
);

async function debugUserID() {
  console.log('🔍 Debugging user ID in frontend...');
  
  try {
    // Check if user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }
    
    if (!user) {
      console.log('❌ No user logged in');
      return;
    }
    
    console.log('✅ User logged in:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });
    
    // Check businesses for this user ID
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name, city, owner_id')
      .eq('owner_id', user.id);
    
    if (businessesError) {
      console.error('❌ Businesses error:', businessesError);
    } else {
      console.log('✅ Found businesses for user:', businesses);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugUserID();
