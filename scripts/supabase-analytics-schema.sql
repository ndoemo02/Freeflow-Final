-- Schema dla tabel analitycznych w Supabase
-- Uruchom te zapytania w SQL Editor w Supabase

-- 1. Tabela restauracji
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  address TEXT,
  phone VARCHAR,
  email VARCHAR,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela pozycji menu
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela zamówień
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  customer_id UUID REFERENCES auth.users(id),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_address TEXT,
  customer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela pozycji zamówienia
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela profili użytkowników (jeśli nie istnieje)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email VARCHAR,
  user_type VARCHAR DEFAULT 'customer' CHECK (user_type IN ('customer', 'restaurant_owner', 'admin')),
  restaurant_id UUID REFERENCES restaurants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela ocen klientów (opcjonalnie)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES auth.users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON reviews(restaurant_id);

-- RLS (Row Level Security) dla bezpieczeństwa
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Polityki RLS (przykładowe - dostosuj do swoich potrzeb)

-- Restauracje - właściciele mogą zarządzać swoimi restauracjami
CREATE POLICY "Users can view restaurants" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Restaurant owners can update their restaurants" ON restaurants FOR UPDATE USING (owner_id = auth.uid());

-- Menu - właściciele restauracji mogą zarządzać swoim menu
CREATE POLICY "Anyone can view menu items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Restaurant owners can manage their menu" ON menu_items FOR ALL USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

-- Zamówienia - klienci widzą swoje zamówienia, restauracje widzą swoje zamówienia
CREATE POLICY "Customers can view their orders" ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Restaurant owners can view their orders" ON orders FOR SELECT USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
CREATE POLICY "Customers can create orders" ON orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Restaurant owners can update their orders" ON orders FOR UPDATE USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

-- Profile - użytkownicy mogą zarządzać swoimi profilami
CREATE POLICY "Users can view and update their own profile" ON profiles FOR ALL USING (id = auth.uid());

-- Funkcja do automatycznego tworzenia profilu po rejestracji
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, user_type)
  VALUES (NEW.id, NEW.email, 'customer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger do automatycznego tworzenia profilu
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Wstaw przykładowe dane testowe
INSERT INTO restaurants (name, address, phone, email) VALUES
('Pizzeria Calzone', 'Piekary Śląskie, ul. Główna 15', '123-456-789', 'calzone@example.com'),
('Kebab King', 'Centrum miasta, ul. Rynek 5', '987-654-321', 'kebab@example.com'),
('Sushi Yama', 'Osiedle Słoneczne, ul. Kwiatowa 8', '555-123-456', 'sushi@example.com'),
('Burger House', 'Galeria handlowa, lokal 42', '444-555-666', 'burger@example.com'),
('Pasta Milano', 'Stare miasto, ul. Kościelna 12', '777-888-999', 'pasta@example.com');

-- Pobierz ID restauracji dla dalszych wstawek
DO $$
DECLARE
    pizzeria_id UUID;
    kebab_id UUID;
    sushi_id UUID;
    burger_id UUID;
    pasta_id UUID;
BEGIN
    SELECT id INTO pizzeria_id FROM restaurants WHERE name = 'Pizzeria Calzone';
    SELECT id INTO kebab_id FROM restaurants WHERE name = 'Kebab King';
    SELECT id INTO sushi_id FROM restaurants WHERE name = 'Sushi Yama';
    SELECT id INTO burger_id FROM restaurants WHERE name = 'Burger House';
    SELECT id INTO pasta_id FROM restaurants WHERE name = 'Pasta Milano';

    -- Wstaw pozycje menu
    INSERT INTO menu_items (restaurant_id, name, description, price, category) VALUES
    (pizzeria_id, 'Pizza Margherita', 'Klasyczna, z mozzarellą', 25.00, 'Pizza'),
    (pizzeria_id, 'Pizza Pepperoni', 'Z salami pepperoni', 30.00, 'Pizza'),
    (kebab_id, 'Kebab w picie', 'Z sosem czosnkowym', 18.00, 'Kebab'),
    (sushi_id, 'Sałatka Cezar', 'Z kurczakiem grillowanym', 22.00, 'Sałatki'),
    (burger_id, 'Frytki', 'Chrupiące, solone', 12.00, 'Dodatki');

    -- Wstaw przykładowe zamówienia z ostatnich 30 dni
    FOR i IN 1..100 LOOP
        INSERT INTO orders (restaurant_id, status, total_amount, created_at) VALUES
        ((ARRAY[pizzeria_id, kebab_id, sushi_id, burger_id, pasta_id])[floor(random() * 5 + 1)],
         'completed',
         (random() * 50 + 10)::DECIMAL(10,2),
         NOW() - (random() * 30)::INTEGER * INTERVAL '1 day' - (random() * 24)::INTEGER * INTERVAL '1 hour');
    END LOOP;
END $$;

-- Sprawdź czy dane zostały wstawione
SELECT 'Restaurants:' as table_name, count(*) as count FROM restaurants
UNION ALL
SELECT 'Menu Items:', count(*) FROM menu_items
UNION ALL
SELECT 'Orders:', count(*) FROM orders;
