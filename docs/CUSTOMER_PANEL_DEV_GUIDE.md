# 🛠️ CustomerPanel - Developer Guide

## Architektura

### Struktura Pliku
```
src/pages/Panel/CustomerPanel.jsx (1264 linie)
├── Main Component: CustomerPanel
├── Tab Components:
│   ├── ProfileTab
│   ├── OrdersTab
│   ├── RestaurantsTab
│   ├── ReservationsTab
│   └── SettingsTab
├── UI Components:
│   ├── TabButton
│   ├── StatCard
│   ├── StatsCards
│   ├── FilterButton
│   ├── Field
│   ├── EditableField
│   └── SettingToggle
└── Helper Functions:
    ├── getStatusClass
    ├── getStatusText
    ├── getReservationStatusClass
    └── getReservationStatusText
```

## State Management

### Main State
```javascript
const [tab, setTab] = useState('profile')
const [profile, setProfile] = useState(null)
const [editingProfile, setEditingProfile] = useState(false)
const [savingProfile, setSavingProfile] = useState(false)
const [orders, setOrders] = useState([])
const [orderFilter, setOrderFilter] = useState('all')
const [restaurants, setRestaurants] = useState([])
const [selectedRestaurant, setSelectedRestaurant] = useState(null)
const [menuItems, setMenuItems] = useState([])
const [loadingMenu, setLoadingMenu] = useState(false)
const [loading, setLoading] = useState(false)
const [favorites, setFavorites] = useState([])
const [recentOrders, setRecentOrders] = useState([])
const [notifications, setNotifications] = useState([])
const [loyaltyPoints, setLoyaltyPoints] = useState(0)
```

## Data Flow

### 1. Initial Load
```javascript
useEffect(() => {
  if (!user?.id) return;
  
  const loadData = async () => {
    // 1. Load profile from auth metadata
    // 2. Load orders from Supabase
    // 3. Load restaurants
    // 4. Calculate loyalty points
    // 5. Set recent orders
  };
  
  loadData();
  
  // Setup realtime subscription
  const channel = supabase.channel(`orders-${user.id}`)...
}, [user?.id]);
```

### 2. Profile Update
```javascript
const saveProfile = async () => {
  // 1. Validate data
  // 2. Update user metadata in Supabase Auth
  // 3. Show success/error toast
  // 4. Exit edit mode
};
```

### 3. Order Cancellation
```javascript
const cancelOrder = async (orderId) => {
  // 1. Update order status to 'cancelled'
  // 2. Verify user ownership
  // 3. Refresh orders list
  // 4. Show toast notification
};
```

### 4. Restaurant Selection
```javascript
const selectRestaurant = (restaurant) => {
  // 1. Set selected restaurant
  // 2. Load menu items for restaurant
  // 3. Show loading state
};
```

## Supabase Integration

### Tables Schema

#### orders
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID,
  restaurant_name TEXT,
  dish_name TEXT,
  total_price DECIMAL,
  status TEXT,
  created_at TIMESTAMP
);
```

#### restaurants
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY,
  name TEXT,
  city TEXT,
  description TEXT
);
```

#### menu_items
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  name TEXT,
  price DECIMAL,
  description TEXT
);
```

#### table_reservations (NEW)
```sql
CREATE TABLE table_reservations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  reservation_date TIMESTAMP,
  party_size INTEGER,
  table_number INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### RLS Policies

```sql
-- Orders: Users can only see their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Reservations: Users can only see their own reservations
CREATE POLICY "Users can view own reservations"
  ON table_reservations FOR SELECT
  USING (auth.uid() = user_id);

-- Restaurants: Public read access
CREATE POLICY "Anyone can view restaurants"
  ON restaurants FOR SELECT
  USING (true);

-- Menu items: Public read access
CREATE POLICY "Anyone can view menu items"
  ON menu_items FOR SELECT
  USING (true);
```

## Component API

### CustomerPanel
```typescript
// No props - standalone component
// Uses hooks: useAuth, useToast, useNavigate
```

### ProfileTab
```typescript
interface ProfileTabProps {
  profile: Profile | null;
  user: User;
  editing: boolean;
  setEditing: (editing: boolean) => void;
  saving: boolean;
  saveProfile: () => Promise<void>;
  setProfile: (profile: Profile) => void;
}
```

### OrdersTab
```typescript
interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  cancelOrder: (orderId: string) => Promise<void>;
  filter: 'all' | 'active' | 'completed';
  setFilter: (filter: string) => void;
}
```

### RestaurantsTab
```typescript
interface RestaurantsTabProps {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  menuItems: MenuItem[];
  loadingMenu: boolean;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onBack: () => void;
}
```

### ReservationsTab
```typescript
interface ReservationsTabProps {
  userId: string;
}
```

### SettingsTab
```typescript
interface SettingsTabProps {
  profile: Profile;
  loyaltyPoints: number;
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
}
```

## Styling Guide

### FreeFlow UI Theme
```javascript
const theme = {
  colors: {
    primary: '#00eaff',      // cyan neon
    secondary: '#ff6f00',    // orange neon
    accent: '#7b61ff',       // purple neon
    background: '#0b0e13',   // deep dark
    card: '#141820',         // dark card
  },
  effects: {
    blur: 'backdrop-blur-xl',
    glow: '0 20px 40px rgba(0, 255, 255, 0.3)',
    border: 'border-cyan-500/20',
  }
};
```

### Animation Patterns
```javascript
// Card hover
whileHover={{ 
  scale: 1.05,
  y: -5,
  boxShadow: "0 20px 40px rgba(0, 255, 255, 0.3)"
}}

// Button press
whileTap={{ scale: 0.95 }}

// Staggered list
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.1 }}
```

## Testing

### Unit Tests
```javascript
// Test profile update
test('should update profile successfully', async () => {
  // Mock Supabase
  // Call saveProfile
  // Assert success toast
});

// Test order cancellation
test('should cancel order', async () => {
  // Mock order
  // Call cancelOrder
  // Assert status changed
});
```

### Integration Tests
```javascript
// Test full flow
test('user can view and cancel order', async () => {
  // Render CustomerPanel
  // Navigate to Orders tab
  // Click cancel on order
  // Verify order cancelled
});
```

## Performance Optimization

### Memoization
```javascript
const stats = useMemo(() => ({
  totalOrders: orders.filter(o => o.status !== 'cancelled').length,
  completedOrders: orders.filter(o => 
    o.status === 'completed' || o.status === 'delivered'
  ).length,
  // ...
}), [orders]);
```

### Lazy Loading
```javascript
// Load menu only when restaurant selected
const loadMenu = async (restaurantId) => {
  setLoadingMenu(true);
  // Fetch menu items
  setLoadingMenu(false);
};
```

### Debouncing
```javascript
// For search/filter inputs
const debouncedSearch = useMemo(
  () => debounce((value) => {
    // Search logic
  }, 300),
  []
);
```

## Error Handling

### Try-Catch Pattern
```javascript
try {
  const { data, error } = await supabase...;
  if (error) throw error;
  // Success logic
} catch (e) {
  push('Error message', 'error');
  AmberLogger.error(e);
}
```

### Loading States
```javascript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    // Fetch logic
  } finally {
    setLoading(false);
  }
};
```

## Deployment Checklist

- [ ] All Supabase tables created
- [ ] RLS policies configured
- [ ] Environment variables set
- [ ] Error boundaries in place
- [ ] Loading states implemented
- [ ] Toast notifications working
- [ ] Realtime subscriptions tested
- [ ] Mobile responsive
- [ ] Accessibility checked
- [ ] Performance optimized

## Future Enhancements

1. **Cart Integration** - Add to cart from menu
2. **Payment Flow** - Stripe/PayU integration
3. **Push Notifications** - Web Push API
4. **Favorites** - Save favorite restaurants
5. **Reviews** - Rate orders and restaurants
6. **Search** - Search restaurants and dishes
7. **Filters** - Advanced filtering options
8. **Export Data** - GDPR compliance
9. **Dark/Light Mode** - Theme toggle
10. **Multi-language** - i18n support

## Troubleshooting

### Orders not loading
- Check RLS policies
- Verify user_id in orders table
- Check Supabase connection

### Realtime not working
- Verify channel subscription
- Check Supabase realtime enabled
- Inspect network tab for websocket

### Animations laggy
- Reduce motion complexity
- Use CSS transforms instead of layout changes
- Check for memory leaks

## Resources

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Router](https://reactrouter.com/)

