-- Fixed schema that matches the application code
-- Run this in Supabase SQL Editor

-- 1. Create user_profiles table (as expected by the code)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name VARCHAR,
  last_name VARCHAR,
  phone VARCHAR,
  address TEXT,
  city VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create restaurants table with correct column names
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  city VARCHAR,
  owner UUID REFERENCES auth.users(id), -- Keep both owner and owner_id for compatibility
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create orders table with correct column names
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer UUID REFERENCES auth.users(id), -- Keep both customer and customer_id for compatibility
  customer_id UUID REFERENCES auth.users(id),
  restaurant UUID REFERENCES restaurants(id), -- Keep both restaurant and restaurant_id for compatibility
  restaurant_id UUID REFERENCES restaurants(id),
  driver_id UUID REFERENCES auth.users(id),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'completed', 'delivered', 'cancelled', 'accepted')),
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  items JSONB,
  order_name VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create taxi_drivers table
CREATE TABLE IF NOT EXISTS taxi_drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  driver_code VARCHAR,
  full_name VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  license_number VARCHAR,
  vehicle_type VARCHAR,
  vehicle_make VARCHAR,
  vehicle_model VARCHAR,
  vehicle_year INTEGER,
  vehicle_plate VARCHAR,
  vehicle_color VARCHAR,
  vehicle_capacity INTEGER,
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  status VARCHAR DEFAULT 'offline' CHECK (status IN ('offline', 'available', 'busy')),
  rating DECIMAL(3,2) DEFAULT 0,
  total_rides INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxi_drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- User profiles
CREATE POLICY "Users can view and update their own profile" ON user_profiles FOR ALL USING (id = auth.uid());

-- Restaurants
CREATE POLICY "Anyone can view restaurants" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Restaurant owners can manage their restaurants" ON restaurants FOR ALL USING (owner = auth.uid() OR owner_id = auth.uid());

-- Menu items
CREATE POLICY "Anyone can view menu items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Restaurant owners can manage their menu" ON menu_items FOR ALL USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner = auth.uid() OR owner_id = auth.uid())
);

-- Orders
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (customer = auth.uid() OR customer_id = auth.uid());
CREATE POLICY "Restaurant owners can view their orders" ON orders FOR SELECT USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner = auth.uid() OR owner_id = auth.uid())
);
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (customer = auth.uid() OR customer_id = auth.uid());
CREATE POLICY "Restaurant owners can update their orders" ON orders FOR UPDATE USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner = auth.uid() OR owner_id = auth.uid())
);

-- Taxi drivers
CREATE POLICY "Drivers can manage their own data" ON taxi_drivers FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Anyone can view available drivers" ON taxi_drivers FOR SELECT USING (status = 'available' AND is_active = true);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample data
INSERT INTO restaurants (name, city, owner_id) VALUES
('Pizzeria Calzone', 'Warszawa', (SELECT id FROM auth.users LIMIT 1)),
('Kebab King', 'Kraków', (SELECT id FROM auth.users LIMIT 1)),
('Sushi Yama', 'Gdańsk', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;

-- Get restaurant IDs for menu items
DO $$
DECLARE
    pizzeria_id UUID;
    kebab_id UUID;
    sushi_id UUID;
BEGIN
    SELECT id INTO pizzeria_id FROM restaurants WHERE name = 'Pizzeria Calzone' LIMIT 1;
    SELECT id INTO kebab_id FROM restaurants WHERE name = 'Kebab King' LIMIT 1;
    SELECT id INTO sushi_id FROM restaurants WHERE name = 'Sushi Yama' LIMIT 1;

    -- Insert menu items
    INSERT INTO menu_items (restaurant_id, name, price) VALUES
    (pizzeria_id, 'Pizza Margherita', 25.00),
    (pizzeria_id, 'Pizza Pepperoni', 30.00),
    (kebab_id, 'Kebab w picie', 18.00),
    (kebab_id, 'Kebab w bułce', 16.00),
    (sushi_id, 'Sałatka Cezar', 22.00),
    (sushi_id, 'Sushi Mix', 35.00)
    ON CONFLICT DO NOTHING;
END $$;

-- 8. Create system_logs table for watchdog monitoring
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level VARCHAR NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);