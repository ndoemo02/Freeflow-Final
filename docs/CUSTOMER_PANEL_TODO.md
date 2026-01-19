# ✅ CustomerPanel - TODO List

## 🚀 Priorytet: WYSOKI (Krytyczne funkcje)

### 1. 🛒 Koszyk i Składanie Zamówień
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~8h  
**Opis:** Pełna funkcjonalność dodawania pozycji do koszyka i składania zamówień

**Zadania:**
- [ ] Stwórz komponent `Cart.jsx`
- [ ] Dodaj state management dla koszyka (Context API lub Zustand)
- [ ] Implementuj dodawanie/usuwanie pozycji
- [ ] Dodaj licznik ilości dla każdej pozycji
- [ ] Obliczanie łącznej kwoty
- [ ] Formularz adresu dostawy
- [ ] Wybór metody płatności
- [ ] Potwierdzenie zamówienia
- [ ] Integracja z tabelą `orders` w Supabase
- [ ] Toast notifications dla akcji

**Pliki do stworzenia:**
- `src/components/Cart.jsx`
- `src/state/cart.js` (Context)
- `src/components/CartItem.jsx`
- `src/components/CheckoutForm.jsx`

---

### 2. 💳 Integracja Płatności
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~12h  
**Opis:** Integracja z Stripe lub PayU dla płatności online

**Zadania:**
- [ ] Wybór providera (Stripe vs PayU)
- [ ] Konfiguracja konta i API keys
- [ ] Instalacja SDK (`npm install @stripe/stripe-js`)
- [ ] Stwórz komponent `PaymentForm.jsx`
- [ ] Implementuj Stripe Elements
- [ ] Obsługa webhooków (backend)
- [ ] Zapisywanie transakcji w Supabase
- [ ] Potwierdzenie płatności (email, SMS)
- [ ] Obsługa błędów płatności
- [ ] Testowanie z kartami testowymi

**Pliki do stworzenia:**
- `src/components/PaymentForm.jsx`
- `src/lib/stripe.js`
- `api/webhooks/stripe.js` (backend)
- Tabela `transactions` w Supabase

---

### 3. 📜 Historia Płatności
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~4h  
**Opis:** Szczegółowa historia wszystkich transakcji użytkownika

**Zadania:**
- [ ] Stwórz komponent `PaymentHistory.jsx`
- [ ] Query do tabeli `transactions`
- [ ] Wyświetlanie listy transakcji
- [ ] Filtry (data, status, kwota)
- [ ] Szczegóły transakcji (modal)
- [ ] Eksport do PDF/CSV
- [ ] Paginacja dla dużych list
- [ ] Wyszukiwanie po numerze transakcji

**Pliki do stworzenia:**
- `src/components/PaymentHistory.jsx`
- `src/components/TransactionDetails.jsx`

---

## 🎯 Priorytet: ŚREDNI (Ważne funkcje)

### 4. 🪑 Formularz Nowej Rezerwacji
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~6h  
**Opis:** Formularz do składania nowych rezerwacji stolików

**Zadania:**
- [ ] Stwórz komponent `NewReservationForm.jsx`
- [ ] Wybór restauracji (dropdown)
- [ ] Date picker dla daty i godziny
- [ ] Input dla liczby osób
- [ ] Walidacja formularza
- [ ] Sprawdzanie dostępności stolików
- [ ] Zapisywanie do `table_reservations`
- [ ] Email/SMS potwierdzenie
- [ ] Integracja z kalendarzem restauracji

**Pliki do stworzenia:**
- `src/components/NewReservationForm.jsx`
- `src/lib/reservationValidation.js`

---

### 5. ⭐ System Ulubionych Restauracji
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~4h  
**Opis:** Zapisywanie i zarządzanie ulubionymi restauracjami

**Zadania:**
- [ ] Stwórz tabelę `favorites` w Supabase
- [ ] Przycisk "Dodaj do ulubionych" (❤️)
- [ ] Lista ulubionych w zakładce Restauracje
- [ ] Usuwanie z ulubionych
- [ ] Sortowanie ulubionych
- [ ] Powiadomienia o promocjach w ulubionych
- [ ] Statystyki (najczęściej zamawiane)

**Pliki do modyfikacji:**
- `src/pages/Panel/CustomerPanel.jsx` (RestaurantsTab)

**Tabela Supabase:**
```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);
```

---

### 6. ⭐ System Ocen i Recenzji
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~8h  
**Opis:** Ocenianie restauracji i dań, pisanie recenzji

**Zadania:**
- [ ] Stwórz tabelę `reviews` w Supabase
- [ ] Komponent `ReviewForm.jsx`
- [ ] Ocena gwiazdkowa (1-5 ⭐)
- [ ] Pole tekstowe na recenzję
- [ ] Zdjęcia do recenzji (opcjonalnie)
- [ ] Wyświetlanie recenzji w szczegółach restauracji
- [ ] Moderacja recenzji (admin)
- [ ] Średnia ocena restauracji
- [ ] Sortowanie recenzji (najnowsze, najlepsze)

**Pliki do stworzenia:**
- `src/components/ReviewForm.jsx`
- `src/components/ReviewList.jsx`
- `src/components/StarRating.jsx`

**Tabela Supabase:**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  order_id UUID REFERENCES orders(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 7. 🔔 Powiadomienia Push
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~10h  
**Opis:** Web Push Notifications dla aktualizacji zamówień

**Zadania:**
- [ ] Konfiguracja Service Worker
- [ ] Rejestracja Push Subscription
- [ ] Zapisywanie subscription w Supabase
- [ ] Backend do wysyłania push (Firebase Cloud Messaging)
- [ ] Powiadomienia o statusie zamówienia
- [ ] Powiadomienia o promocjach
- [ ] Ustawienia powiadomień (granularne)
- [ ] Testowanie na różnych przeglądarkach

**Pliki do stworzenia:**
- `public/service-worker.js`
- `src/lib/pushNotifications.js`
- `api/push/send.js` (backend)

---

## 💡 Priorytet: NISKI (Nice to have)

### 8. 🔒 Zmiana Hasła
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~2h  
**Opis:** Formularz zmiany hasła użytkownika

**Zadania:**
- [ ] Stwórz komponent `ChangePasswordForm.jsx`
- [ ] Walidacja hasła (min. 8 znaków, wielkie/małe, cyfry)
- [ ] Potwierdzenie starego hasła
- [ ] Integracja z Supabase Auth
- [ ] Email potwierdzający zmianę
- [ ] Wylogowanie po zmianie hasła

**Pliki do stworzenia:**
- `src/components/ChangePasswordForm.jsx`

---

### 9. 📥 Eksport Danych (GDPR)
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~4h  
**Opis:** Eksport wszystkich danych użytkownika (GDPR compliance)

**Zadania:**
- [ ] Endpoint do generowania eksportu
- [ ] Zbieranie danych z wszystkich tabel
- [ ] Format JSON lub CSV
- [ ] Kompresja do ZIP
- [ ] Link do pobrania (email)
- [ ] Automatyczne usuwanie po 7 dniach
- [ ] Logowanie żądań eksportu

**Pliki do stworzenia:**
- `api/export/user-data.js` (backend)

---

### 10. ⚠️ Usuwanie Konta
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~3h  
**Opis:** Proces trwałego usunięcia konta użytkownika

**Zadania:**
- [ ] Modal z potwierdzeniem (2-step)
- [ ] Wymaganie hasła do potwierdzenia
- [ ] Soft delete (archiwizacja) vs Hard delete
- [ ] Usuwanie powiązanych danych (zamówienia, rezerwacje)
- [ ] Email potwierdzający usunięcie
- [ ] Grace period (30 dni na przywrócenie)
- [ ] Logowanie usunięć

**Pliki do stworzenia:**
- `src/components/DeleteAccountModal.jsx`
- `api/account/delete.js` (backend)

---

### 11. 🔍 Wyszukiwanie Restauracji i Dań
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~5h  
**Opis:** Zaawansowane wyszukiwanie i filtrowanie

**Zadania:**
- [ ] Search bar w zakładce Restauracje
- [ ] Wyszukiwanie po nazwie restauracji
- [ ] Wyszukiwanie po nazwie dania
- [ ] Filtry:
  - [ ] Kuchnia (włoska, polska, azjatycka)
  - [ ] Cena (zakres)
  - [ ] Ocena (min. gwiazdki)
  - [ ] Czas dostawy
  - [ ] Darmowa dostawa
- [ ] Sortowanie (popularność, ocena, cena)
- [ ] Debouncing dla search input

**Pliki do modyfikacji:**
- `src/pages/Panel/CustomerPanel.jsx` (RestaurantsTab)

---

### 12. 📊 Dashboard Analityczny
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~8h  
**Opis:** Zaawansowane statystyki i wykresy dla użytkownika

**Zadania:**
- [ ] Instalacja biblioteki wykresów (`recharts` lub `chart.js`)
- [ ] Wykres wydatków w czasie
- [ ] Wykres najczęściej zamawianych dań
- [ ] Wykres ulubionych restauracji
- [ ] Statystyki:
  - [ ] Średnia wartość zamówienia
  - [ ] Najczęstsza pora zamawiania
  - [ ] Ulubiona kuchnia
  - [ ] Oszczędności z promocji
- [ ] Eksport statystyk do PDF

**Pliki do stworzenia:**
- `src/components/AnalyticsDashboard.jsx`
- `src/components/charts/SpendingChart.jsx`
- `src/components/charts/FavoritesChart.jsx`

---

### 13. 🎁 System Kuponów i Promocji
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~6h  
**Opis:** Kody rabatowe i promocje specjalne

**Zadania:**
- [ ] Stwórz tabelę `coupons` w Supabase
- [ ] Input do wpisywania kodu kuponu
- [ ] Walidacja kodu (data ważności, limit użyć)
- [ ] Obliczanie rabatu (%, kwota)
- [ ] Wyświetlanie aktywnych promocji
- [ ] Historia użytych kuponów
- [ ] Powiadomienia o nowych promocjach

**Tabela Supabase:**
```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  discount_type TEXT, -- 'percentage' or 'fixed'
  discount_value DECIMAL,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0
);
```

---

### 14. 🌍 Multi-język (i18n)
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~10h  
**Opis:** Wsparcie dla wielu języków

**Zadania:**
- [ ] Instalacja `react-i18next`
- [ ] Konfiguracja języków (PL, EN, DE)
- [ ] Tłumaczenie wszystkich tekstów
- [ ] Przełącznik języka w ustawieniach
- [ ] Zapisywanie preferencji w localStorage
- [ ] Formatowanie dat i walut
- [ ] RTL support (opcjonalnie)

**Pliki do stworzenia:**
- `src/i18n/config.js`
- `src/i18n/locales/pl.json`
- `src/i18n/locales/en.json`

---

### 15. 🌓 Dark/Light Mode Toggle
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~4h  
**Opis:** Przełącznik między trybem ciemnym a jasnym

**Zadania:**
- [ ] Stwórz Context dla theme
- [ ] Definicja kolorów dla light mode
- [ ] Toggle switch w ustawieniach
- [ ] Zapisywanie preferencji w localStorage
- [ ] Smooth transition między trybami
- [ ] Respektowanie preferencji systemowych

**Pliki do stworzenia:**
- `src/state/theme.js`
- `src/styles/themes.js`

---

## 🐛 Bugfixy i Optymalizacje

### 16. Performance Optimization
**Status:** 🟡 W trakcie  
**Czas:** ~6h  

**Zadania:**
- [ ] Lazy loading dla zakładek
- [ ] Memoization dla drogich obliczeń
- [ ] Virtual scrolling dla długich list
- [ ] Image optimization (WebP, lazy loading)
- [ ] Code splitting
- [ ] Bundle size analysis
- [ ] Lighthouse audit (cel: 90+)

---

### 17. Testing
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~12h  

**Zadania:**
- [ ] Unit tests dla komponentów (Jest + RTL)
- [ ] Integration tests dla flows
- [ ] E2E tests (Playwright)
- [ ] Coverage > 80%
- [ ] CI/CD pipeline z testami

---

### 18. Accessibility (A11y)
**Status:** 🟡 W trakcie  
**Czas:** ~4h  

**Zadania:**
- [ ] ARIA labels dla wszystkich elementów
- [ ] Keyboard navigation (Tab, Enter, Esc)
- [ ] Focus management
- [ ] Screen reader testing
- [ ] Color contrast (WCAG AAA)
- [ ] Skip links

---

## 📝 Dokumentacja

### 19. API Documentation
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~3h  

**Zadania:**
- [ ] Swagger/OpenAPI spec
- [ ] Endpoint documentation
- [ ] Request/Response examples
- [ ] Error codes

---

### 20. Video Tutorials
**Status:** 🔴 Nie rozpoczęte  
**Czas:** ~8h  

**Zadania:**
- [ ] Nagranie screencastów
- [ ] Tutorial dla użytkowników
- [ ] Tutorial dla deweloperów
- [ ] Publikacja na YouTube

---

## 📊 Podsumowanie

**Łączny czas:** ~140h (3-4 tygodnie pracy)

**Priorytety:**
- 🔴 Wysoki: 5 zadań (~42h)
- 🟡 Średni: 8 zadań (~52h)
- 🟢 Niski: 7 zadań (~46h)

**Status ogólny:**
- ✅ Zaimplementowane: 40%
- 🟡 W trakcie: 10%
- 🔴 Nie rozpoczęte: 50%

---

**Ostatnia aktualizacja:** 2025-10-16  
**Wersja:** 3.0.0

