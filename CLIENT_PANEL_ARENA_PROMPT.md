# FreeFlow ClientPanel — Opis funkcjonalności + Prompt dla ArenaLM

---

## 📋 FUNKCJONALNOŚCI PANELU (wyczerpująca lista)

### 🏠 1. Dashboard (strona główna panelu)
- **Powitanie** użytkownika z imieniem (pobrane z e-mail) + emoji 👋
- **4 kafelki szybkich usług** (Quick Services):
  - 🍔 Jedzenie — liczba dostępnych restauracji (live z Supabase)
  - 🚕 Taxi — dostępność 24/7
  - 🏨 Hotele — znajdź nocleg
  - 📋 Zamówienia — liczba aktywnych (badge)
- **3 karty statystyk** (stats cards):
  - Wydatki razem (suma z orders, w PLN)
  - Zamówienia — liczba z bieżącego miesiąca
  - Punkty lojalnościowe (placeholder, Gold tier)
- **Aktywne zamówienie** — live karta z:
  - Emoji kanału (🍔/🚕/🏨)
  - Nazwa restauracji lub pozycji
  - Numer zamówienia + kwota
  - Pasek postępu (Przyjęte → W realizacji → Gotowe)
- **Ostatnie zamówienia** — lista 3-5 ostatnich z ikoną, nazwą, datą, ceną
- **Promocje dla Ciebie** — banery z kodem rabatowym (np. -20%, FOOD20)
- **Pasek wyszukiwania** (desktop) — placeholder "Szukaj usług..."

### 🍔 2. Jedzenie (Food Section)
- Filtry kategorii (scroll poziomy): Wszystkie, Pizza, Sushi, Burgery, Azjatyckie, Desery
- Grid restauracji (responsywny: 1→2→3→4 kolumny):
  - Zdjęcie restauracji
  - Nazwa, kuchnia, ocena (gwiazdki)
  - Czas dostawy, status dostawy (Darmowa / cena)
  - Kliknięcie → przejście do szczegółów/zamawiania

### 🚕 3. Taxi Section
- Formularz zamawiania przejazdu:
  - Punkt odbioru (z zieloną kropką)
  - Cel podróży (z czerwoną kropką)
  - Wybór pojazdu (Economy / Comfort / XL) z ceną
  - Przycisk "Zamów taxi"
- Mapa placeholder (do integracji z Google Maps)
- Ostatnie adresy (zapisane lokalizacje z ikoną)

### 🏨 4. Hotele Section
- Formularz wyszukiwania:
  - Lokalizacja
  - Check-in / Check-out date picker
  - Liczba gości
  - Przycisk "Szukaj hoteli"
- Grid hoteli (1→2→3 kolumny):
  - Zdjęcie hotelu
  - Ocena (badge pozycja)
  - Nazwa, lokalizacja
  - Udogodnienia (tagi: WiFi, Śniadanie, Parking, Spa...)
  - Cena za noc + przycisk "Zarezerwuj"

### 📦 5. Zamówienia — Historia
- Filtry: Wszystkie / Aktywne / Zakończone / Anulowane
- Lista zamówień z kartami:
  - Ikona kanału (food/taxi/hotel) z kolorowym tłem
  - Nazwa, numer zamówienia (#xxxxxxxx), data i godzina
  - Kwota, status badge (In progress / Delivered / Cancelled)
  - Akcje: Oceń / Zamów ponownie (dla zakończonych)
  - Anuluj (dla aktywnych)
  - Trasa dostawy: adres odbioru → adres dostawy

### 💳 6. Płatności
- **Zapisane karty** (lista):
  - Typ karty (Visa/Mastercard), ostatnie 4 cyfry
  - Status (domyślna), data ważności
  - Akcje: Ustaw domyślną / Usuń
- **Inne metody płatności**:
  - BLIK, Apple Pay, Google Pay, Przelew bankowy
- **Adres rozliczeniowy**:
  - Wyświetlenie aktualnego adresu
  - Przycisk "Edytuj"
- **Modal dodawania karty**:
  - Numer karty, data ważności, CVV, właściciel
  - Przycisk "Dodaj kartę"

### 👤 7. Profil
- Avatar (generowany z ui-avatars.com na podstawie email)
- Edycja avatara (przycisk)
- Statystyki profilu: łączne zamówienia, wydatki, punkty
- **Formularz edycji danych**:
  - Imię, Nazwisko
  - Email (read-only jeśli przez Google)
  - Telefon
  - Adres dostawy
  - Przycisk "Zapisz zmiany"

### ⚙️ 8. Ustawienia
- **Powiadomienia** (toggle switches):
  - Powiadomienia push — zamówienia
  - Powiadomienia e-mail — promocje
  - Powiadomienia SMS — status dostawy
  - Dźwięk powiadomień
- **Prywatność**:
  - Historia wyszukiwania
  - Personalizacja reklam
  - Zbieranie danych analitycznych
- **Bezpieczeństwo** (lista klikalnych akcji):
  - Zmień hasło
  - Weryfikacja dwuetapowa
  - Aktywne sesje
  - Historia logowania
- **Strefa niebezpieczna** (danger zone):
  - Wyczyść historię zamówień
  - Usuń konto (z potwierdzeniem)

### 📱 9. Responsywność / Nawigacja
- **Desktop** (≥1024px): Sidebar 16rem po lewej, sticky
- **Mobile** (<1024px):
  - Mobilny header (hamburger + logo + dzwonek z badge)
  - Dolna nawigacja (5 przycisków: Start, Jedzenie, Taxi, Hotele, Profil)
  - Sidebar jako drawer (slide-in z overlay)

### 🔐 10. Auth / State
- Komponent: `useAuth()` — user.id, user.email
- Zamówienia: `useOrders({ userId })` — real-time z Supabase
- Restauracje: Supabase query `.from('restaurants')`
- Stats: useMemo z kalkulacją na orders array

---

## 🎨 OBECNY DESIGN SYSTEM (po update do dark theme)
```
Tło główne:      #070A12 (dark navy)
Tło sidebar:     rgba(11, 18, 34, 0.96) + backdrop-blur(20px)
Glass cards:     rgba(255, 255, 255, 0.04) + border rgba(255,255,255,0.08)
Brand color:     #f97316 (orange) → #f59e0b (gradient)
Text primary:    #EAF0FF
Text secondary:  rgba(234, 240, 255, 0.5)
Active nav:      linear-gradient(135deg, #f97316, #f59e0b)
Font:            Inter
```

---

---

# 🚀 PROMPT DLA ARENA LM — Prototypowanie nowoczesnego UI/UX

Poniżej gotowy prompt do wklejenia w ArenaLM (lub inne LLM areny). Testujesz różne modele (GPT-4o vs Claude vs Gemini) żeby zobaczyć który wygeneruje najbardziej nowoczesny, animowany, dopracowany interfejs.

---

## PROMPT (gotowy do skopiowania):

```
You are an expert frontend developer and UI/UX designer. Create a complete, single-file HTML prototype of a modern customer dashboard for "FreeFlow" — a voice-powered food delivery, taxi, and hotel booking service app.

## DESIGN REQUIREMENTS — PREMIUM DARK GLASSMORPHISM

The design must feel like a high-end iOS/macOS app or Vercel dashboard, NOT a generic admin panel:

**Color Palette:**
- Background: #070A12 (deep space dark)
- Sidebar/cards: rgba(11, 18, 34, 0.96) with backdrop-filter: blur(20px)
- Glass cards: rgba(255, 255, 255, 0.04) with border rgba(255,255,255,0.08)
- Brand gradient: linear-gradient(135deg, #f97316, #f59e0b) — ORANGE, not purple
- Text primary: #EAF0FF, secondary: rgba(234, 240, 255, 0.5)
- Accent glow: 0 0 20px rgba(249, 115, 22, 0.3)

**Typography:** Inter font from Google Fonts. Clean, modern.

**Animations (MANDATORY — this is key):**
- Sidebar nav items: slide-in with staggered delay (0.1s per item)
- Dashboard cards: fade-up on mount with spring easing
- Active nav button: animated orange gradient + subtle scale(1.02)
- Stats cards: number counter animation on load (0 → final value, 800ms)
- Service tiles: 3D tilt on hover (perspective transform)
- Progress bar: animated fill with glow
- Page transitions: fade between sections (opacity + translateY)
- Micro-interactions: ripple on click, hover lift on cards
- Mobile bottom nav: smooth indicator slide

## FUNCTIONALITY TO IMPLEMENT (all 8 sections, fully clickable):

### DASHBOARD (default view):
- Welcome header: "Witaj, [username]! 👋"
- 4 service tiles (Food/Taxi/Hotels/Orders) with gradient backgrounds, icons, subtitles
- 3 animated stat cards: Wydatki (PLN), Zamówienia (count), Punkty (loyalty)
- Active order card with animated progress bar (3 steps: Przyjęte → W realizacji → Gotowe)
- Recent orders mini-list (3 items max)
- Promo banners (2 colorful gradient banners with discount codes)

### FOOD SECTION:
- Horizontal category scroll: Wszystkie / Pizza / Sushi / Burgery / Azjatyckie / Desery
- Responsive restaurant grid (cards with image placeholder, name, rating stars, delivery time)
- Filter buttons with orange active state

### TAXI SECTION:
- Route form: pickup (green dot) + destination (red dot) inputs
- Vehicle selector: Economy / Comfort / XL (card-style with price)
- Map placeholder with location icon
- Recent addresses list

### HOTELS SECTION:
- Search form: location, check-in, check-out, guests count
- Hotel grid with: image, rating badge, amenity tags (WiFi, Parking, Spa), price/night, Book button

### ORDERS SECTION:
- Filter tabs: Wszystkie / Aktywne / Zakończone / Anulowane
- Order cards with status badge, route info, timestamps, "Zamów ponownie" button

### PAYMENTS SECTION:
- Saved cards list (Visa/Mastercard with masked number)
- Payment methods grid (BLIK, Apple Pay, Google Pay icons)
- Billing address display

### PROFILE SECTION:
- Large avatar (colorful gradient initials)
- Stats bar (orders count, total spent, points)
- Editable form (name, email, phone, delivery address)

### SETTINGS SECTION:
- Toggle switches for notifications (4 items)
- Privacy toggles (3 items)
- Security actions list (4 items with arrow icons)
- Danger zone (red border card)

## NAVIGATION STRUCTURE:

**Desktop sidebar (fixed, 16rem wide):**
- FreeFlow logo (orange icon)
- "Panel Klienta" subtitle
- Main nav: Dashboard, Jedzenie, Taxi, Hotele, Zamówienia
- Settings nav: Płatności, Profil, Ustawienia
- User avatar + name + email at bottom
- Orange gradient on active item

**Mobile (<768px):**
- Sticky top header (hamburger + logo + bell icon)
- Fixed bottom nav bar (5 tabs with icons + labels)
- Slide-in sidebar drawer

## TECHNICAL REQUIREMENTS:

- Single self-contained HTML file (inline CSS + JS, no external build tools)
- Use CSS custom properties (variables) for all design tokens
- Smooth section switching (no page reloads — pure JS state management)
- Dark scrollbar styling
- All interactive elements have hover/active states
- Keyboard accessible (focus rings)
- Mobile-first responsive (works on 375px screen)
- Use emoji icons where Font Awesome is unavailable
- Polish language throughout ("Zamów", "Szukaj", "Profil", etc.)

## SAMPLE DATA TO USE:

```javascript
const mockData = {
  user: { name: "Marek", email: "marek@example.com" },
  stats: { totalSpent: 847.50, monthOrders: 12, loyaltyPoints: 2340 },
  activeOrder: { id: "ff-8829", restaurant: "Burger House", status: "W realizacji", total: 67.90, progress: 60 },
  recentOrders: [
    { id: "ff-8821", name: "Sushi Paradise", date: "Dziś, 14:30", amount: 89.00, type: "food", status: "delivered" },
    { id: "ff-8819", name: "Przejazd Taxi", date: "Wczoraj, 22:15", amount: 34.50, type: "taxi", status: "delivered" },
    { id: "ff-8811", name: "Hotel Marriott", date: "12.02.2026", amount: 420.00, type: "hotel", status: "delivered" }
  ],
  restaurants: [
    { name: "Burger House", cuisine: "Burgery", rating: 4.8, time: "25-35 min", delivery: "Darmowa" },
    { name: "Sushi Paradise", cuisine: "Japońska", rating: 4.9, time: "40-50 min", delivery: "9.99 zł" },
    { name: "Pizza Roma", cuisine: "Włoska", rating: 4.6, time: "30-40 min", delivery: "Darmowa" },
    { name: "Pad Thai Express", cuisine: "Tajska", rating: 4.7, time: "35-45 min", delivery: "4.99 zł" }
  ],
  promos: [
    { title: "-20% na jedzenie", desc: "Min. zamówienie 50 zł", code: "FOOD20", days: 3, gradient: "linear-gradient(135deg, #a855f7, #ec4899)" },
    { title: "Darmowe taxi", desc: "Na pierwsze 3 przejazdy", code: "TAXI3", days: 7, gradient: "linear-gradient(135deg, #f97316, #facc15)" }
  ]
};
```

## JUDGING CRITERIA (what makes a GREAT response):

1. **Animation quality** — smooth, performant CSS animations, no jank
2. **Visual depth** — proper use of shadows, blur, gradients, glow effects
3. **Consistency** — orange brand color used cohesively throughout
4. **Interactivity** — ALL 8 sections work, forms have placeholders, tabs switch
5. **Responsive** — mobile and desktop both look premium
6. **Code quality** — clean, readable CSS with variables

Deliver the complete HTML file. Start directly with <!DOCTYPE html>.
```

---

## 💡 WSKAZÓWKI DO ARENY

**Jak używać w ArenaLM:**
1. Wklej prompt w lewym modelu (np. GPT-4o) i w prawym (np. Claude Sonnet)
2. Oceń oba outputs wg kryteriów:
   - Animacje (1-10)
   - Visual depth / glassmorphism (1-10)
   - Kompletność funkcjonalności (1-10)
   - Responsywność (1-10)
3. Możesz iterować — wyślij output do kolejnego modelu z poleceniem "improve animations" lub "make this more premium"

**Warianty promptu (zamiast całego):**
- `"Focus only on making the most stunning animated dashboard section with counter animations and glassmorphism. Use the color system above."`
- `"Improve the mobile experience — bottom nav with animated indicator slide"`
- `"Add Framer Motion-style animations to the sidebar navigation"`

---

_Plik wygenerowany: 2026-02-26 | FreeFlow Frontend_
