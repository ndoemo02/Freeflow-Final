# 🧪 FreeFlow Front v3 - Przewodnik Testowania

## 🚀 Szybki Start

### 1. Uruchomienie Aplikacji

```bash
# Terminal 1: Frontend
cd classic-ui-app3
npm run dev
```

Frontend dostępny na: **http://localhost:5175** (lub inny port jeśli 5175 jest zajęty)

```bash
# Terminal 2: Backend (opcjonalnie)
cd backend
npm start
```

Backend powinien być na: **http://localhost:3000**

---

## ✅ Checklist Testów

### 🎯 Test 1: Menu Dynamiczne (Role-Based)

**Cel:** Sprawdzenie czy menu zmienia się w zależności od roli użytkownika

**Kroki:**
1. ✅ Otwórz aplikację w przeglądarce
2. ✅ Kliknij ikonę menu (hamburger) w prawym górnym rogu
3. ✅ Sprawdź czy menu się otwiera z animacją
4. ✅ Sprawdź pozycje menu dla niezalogowanego użytkownika:
   - Home
   - Odkrywaj Jedzenie
   - Koszyk
   - FAQ
   - Zarejestruj Biznes

**Zaloguj się jako Client:**
5. ✅ Kliknij "Zaloguj się"
6. ✅ Po zalogowaniu otwórz menu ponownie
7. ✅ Sprawdź dodatkowe pozycje:
   - Zamówienia
   - Ulubione
   - Rezerwacje Stolików (z badge 🚧)
   - Profil & Ustawienia

**Zaloguj się jako Vendor/Admin:**
8. ✅ Zaloguj się jako vendor lub admin
9. ✅ Sprawdź czy pojawia się OrgSwitcher (lewy górny róg)
10. ✅ Sprawdź dodatkowe pozycje w menu:
    - Dashboard Biznesu / Admin Panel
    - Zarządzanie Zamówieniami
    - Analityka

**Tryb Development:**
11. ✅ Sprawdź czy w trybie DEV pojawiają się dodatkowe pozycje (Labs, Admin)

**Oczekiwany rezultat:**
- Menu otwiera się płynnie z animacją slide-in
- Pozycje menu zmieniają się w zależności od roli
- Hover effects działają (scale, gradient)
- Glassmorphism effect jest widoczny

---

### 🎤 Test 2: TTS Mode Toggle

**Cel:** Sprawdzenie przełączania trybu TTS i persistence

**Kroki:**
1. ✅ Znajdź przycisk TTS w prawym dolnym rogu ekranu
2. ✅ Sprawdź domyślny tryb (powinien być "Classic HD" - niebieski gradient)
3. ✅ Najedź myszką na przycisk - sprawdź tooltip
4. ✅ Kliknij przycisk aby przełączyć na "Chirp"
5. ✅ Sprawdź czy:
   - Gradient zmienił się na orange/pink
   - Pojawił się pulsing effect (animacja)
   - Tooltip pokazuje "Chirp Mode"
6. ✅ Otwórz DevTools (F12) → Application → Local Storage
7. ✅ Sprawdź czy klucz `freeflow_tts_mode` ma wartość "chirp"
8. ✅ Odśwież stronę (F5)
9. ✅ Sprawdź czy tryb "Chirp" jest zachowany
10. ✅ Przełącz z powrotem na "Classic HD"
11. ✅ Sprawdź localStorage ponownie (powinno być "classic")

**Oczekiwany rezultat:**
- Przycisk płynnie zmienia kolory i animacje
- Tryb jest zapisywany w localStorage
- Po odświeżeniu strony tryb jest zachowany
- Animacje są płynne (framer-motion)

**Backend Test (jeśli dostępny):**
12. ✅ Otwórz DevTools → Network
13. ✅ Przełącz tryb TTS
14. ✅ Sprawdź czy wysłano POST request do `/api/tts-mode`
15. ✅ Sprawdź payload: `{ mode: "chirp" }` lub `{ mode: "classic" }`

---

### 📦 Test 3: Panel Klienta - Filtry Zamówień

**Cel:** Sprawdzenie filtrowania zamówień w czasie rzeczywistym

**Kroki:**
1. ✅ Zaloguj się jako klient
2. ✅ Przejdź do `/panel/customer` (lub kliknij "Zamówienia" w menu)
3. ✅ Sprawdź czy panel się ładuje z animacją
4. ✅ Znajdź przyciski filtrów na górze:
   - Wszystkie (X)
   - Aktywne (Y)
   - Zakończone (Z)
   
   gdzie X, Y, Z to liczby zamówień

5. ✅ Kliknij "Wszystkie" - sprawdź czy wszystkie zamówienia są widoczne
6. ✅ Kliknij "Aktywne" - sprawdź czy:
   - Pokazują się tylko zamówienia ze statusem: pending, confirmed, preparing
   - Animacja przejścia jest płynna
   - Licznik jest poprawny
7. ✅ Kliknij "Zakończone" - sprawdź czy:
   - Pokazują się tylko zamówienia ze statusem: completed, delivered, cancelled
   - Animacja przejścia jest płynna
   - Licznik jest poprawny

**Sprawdź karty zamówień:**
8. ✅ Każda karta powinna zawierać:
   - Nazwę restauracji
   - Nazwę dania
   - Status (z kolorowym badge)
   - Cenę
   - Datę

**Oczekiwany rezultat:**
- Filtry działają natychmiastowo
- Animacje są płynne (AnimatePresence)
- Liczniki są poprawne
- Karty mają glassmorphism effect
- Hover effects działają

---

### 🏢 Test 4: OrgSwitcher (Vendor/Admin)

**Cel:** Sprawdzenie przełączania między organizacjami

**Kroki:**
1. ✅ Zaloguj się jako vendor lub admin
2. ✅ Sprawdź czy w lewym górnym rogu pojawia się OrgSwitcher
3. ✅ Sprawdź domyślną organizację (powinna być pierwsza z listy)
4. ✅ Kliknij na OrgSwitcher
5. ✅ Sprawdź czy:
   - Otwiera się dropdown z listą organizacji
   - Backdrop blur jest widoczny
   - Animacja jest płynna
6. ✅ Sprawdź każdą organizację w liście:
   - Nazwa organizacji
   - Slug
   - Plan (Free/Starter/Business/Enterprise)
   - Ikona branży (🍕 🚕 🏨)
   - Checkmark przy aktywnej organizacji
7. ✅ Kliknij na inną organizację
8. ✅ Sprawdź czy:
   - Dropdown się zamyka
   - Aktywna organizacja się zmienia
   - Checkmark przenosi się do nowej organizacji
9. ✅ Otwórz DevTools → Application → Local Storage
10. ✅ Sprawdź klucz `freeflow_current_org` (powinien zawierać ID organizacji)
11. ✅ Odśwież stronę
12. ✅ Sprawdź czy wybrana organizacja jest zachowana

**Jeśli użytkownik ma tylko 1 organizację:**
13. ✅ Sprawdź czy OrgSwitcher pokazuje tylko nazwę (bez dropdown)

**Oczekiwany rezultat:**
- OrgSwitcher jest widoczny tylko dla vendor/admin
- Lista organizacji ładuje się z mock data
- Przełączanie działa płynnie
- Wybór jest zapisywany w localStorage
- Animacje są płynne

---

### 📊 Test 5: Panel Admin - Analityka

**Cel:** Sprawdzenie wyświetlania statystyk i wykresów

**Kroki:**
1. ✅ Zaloguj się jako admin
2. ✅ Przejdź do `/admin` (lub kliknij "Admin Panel" w menu)
3. ✅ Sprawdź czy panel się ładuje

**KPI Cards:**
4. ✅ Sprawdź 4 karty KPI na górze:
   - Przychód (z ikoną 💰)
   - Liczba zamówień (z ikoną 📦)
   - Średnia wartość (z ikoną 📈)
   - Satysfakcja (z ikoną ⭐)
5. ✅ Sprawdź czy każda karta ma:
   - Wartość liczbową
   - Procent zmiany (zielony ↑ lub czerwony ↓)
   - Glassmorphism effect

**Filtry okresów:**
6. ✅ Znajdź przyciski filtrów: Dziś / 7 dni / 30 dni / 90 dni
7. ✅ Kliknij każdy filtr i sprawdź czy:
   - Przycisk się podświetla
   - Dane się aktualizują (lub pokazują mock data)

**Wykresy:**
8. ✅ Sprawdź wykres liniowy (Line Chart):
   - Oś X: dni
   - Oś Y: liczba zamówień
   - Linia jest widoczna i płynna
9. ✅ Sprawdź wykres kołowy (Doughnut Chart):
   - Kategorie zamówień
   - Kolory są widoczne
   - Legenda jest czytelna

**Top Dania i Restauracje:**
10. ✅ Sprawdź sekcję "Top Dania"
11. ✅ Sprawdź sekcję "Top Restauracje"
12. ✅ Każda pozycja powinna mieć:
    - Nazwę
    - Liczbę zamówień
    - Przychód

**Oczekiwany rezultat:**
- Wszystkie sekcje są widoczne
- Wykresy renderują się poprawnie (Chart.js)
- Filtry działają
- Mock data jest wyświetlana
- Styl jest spójny z FreeFlow design system

---

### 🪑 Test 6: Rezerwacje Stolików (Stub)

**Cel:** Sprawdzenie placeholder dla przyszłej funkcji

**Kroki:**
1. ✅ Przejdź do `/reservations` (lub kliknij "Rezerwacje Stolików" w menu)
2. ✅ Sprawdź czy strona się ładuje z animacją
3. ✅ Sprawdź elementy strony:
   - Nagłówek "Ruchome Stoliki" z gradientem
   - Badge "🚧 Funkcja w przygotowaniu"
   - Ikona 🪑 z animacją (rotate + scale)
   - Tekst "Wkrótce dostępne!"
4. ✅ Sprawdź 4 karty funkcji:
   - 🎯 Drag & Drop
   - 📅 Rezerwacje Online
   - 🤖 AI Optimization
   - 📊 Analityka
5. ✅ Sprawdź sekcję "Podgląd (Mock)":
   - 3 przykładowe stoliki (1, 2, 3)
   - Kolory statusów: zielony (dostępny), czerwony (zajęty), pomarańczowy (zarezerwowany)
   - Legenda statusów na dole
6. ✅ Sprawdź przycisk "Zapisz się na listę oczekujących" (powinien być disabled)
7. ✅ Sprawdź sekcję "Informacje techniczne" na dole

**Oczekiwany rezultat:**
- Strona wygląda profesjonalnie mimo że jest placeholder
- Wszystkie animacje działają
- Styl jest spójny z FreeFlow
- Użytkownik rozumie że funkcja jest w przygotowaniu

---

### 📱 Test 7: Responsywność

**Cel:** Sprawdzenie działania na różnych urządzeniach

**Kroki:**
1. ✅ Otwórz DevTools (F12) → Toggle Device Toolbar (Ctrl+Shift+M)
2. ✅ Wybierz preset: iPhone 12 Pro
3. ✅ Sprawdź:
   - Menu otwiera się poprawnie
   - TTS Toggle jest widoczny i klikalny
   - Wszystkie przyciski są wystarczająco duże (min 44x44px)
   - Tekst jest czytelny
4. ✅ Wybierz preset: iPad
5. ✅ Sprawdź layout w orientacji portrait i landscape
6. ✅ Zmień szerokość okna ręcznie (resize)
7. ✅ Sprawdź breakpointy:
   - Mobile: < 640px
   - Tablet: 640px - 1024px
   - Desktop: > 1024px

**Oczekiwany rezultat:**
- Wszystkie komponenty są responsywne
- Nie ma horizontal scroll
- Przyciski są łatwe do kliknięcia na mobile
- Layout dostosowuje się do rozmiaru ekranu

---

### 🎨 Test 8: Style i Design System

**Cel:** Sprawdzenie spójności stylu FreeFlow

**Kroki:**
1. ✅ Sprawdź fonty:
   - Nagłówki: Orbitron (bold, futurystyczny)
   - Tekst: Space Grotesk (czytelny, nowoczesny)
2. ✅ Sprawdź gradienty:
   - Orange → Purple → Blue (główny gradient)
   - Neon effects na przyciskach
3. ✅ Sprawdź glassmorphism:
   - Backdrop blur na panelach
   - Semi-transparent backgrounds
   - Border z opacity
4. ✅ Sprawdź hover effects:
   - Scale 1.05 na przyciskach
   - Smooth transitions (300ms)
   - Glow effects
5. ✅ Sprawdź rounded corners:
   - Panele: rounded-2xl
   - Przyciski: rounded-xl
   - Karty: rounded-lg

**Oczekiwany rezultat:**
- Styl jest spójny na całej stronie
- Kolory FreeFlow są używane konsekwentnie
- Animacje są płynne i nie lagują
- Design wygląda premium i nowoczesny

---

## 🐛 Znane Problemy i Workarounds

### Problem 1: Backend nie działa
**Symptom:** Błędy 404 przy API calls  
**Workaround:** Aplikacja używa mock data, więc większość funkcji działa bez backendu

### Problem 2: TTS Mode nie zapisuje się na serwerze
**Symptom:** POST /api/tts-mode zwraca błąd  
**Workaround:** Tryb jest zapisywany lokalnie w localStorage i działa poprawnie

### Problem 3: OrgSwitcher pokazuje mock data
**Symptom:** Zawsze te same 3 organizacje  
**Workaround:** To jest oczekiwane zachowanie w wersji demo

---

## 📝 Raportowanie Błędów

Jeśli znajdziesz błąd, sprawdź:

1. **Console (F12 → Console)**
   - Błędy JavaScript
   - Warnings
   - Network errors

2. **Network (F12 → Network)**
   - Failed requests
   - Status codes
   - Response data

3. **Application (F12 → Application)**
   - localStorage values
   - Session storage
   - Cookies

4. **Performance**
   - Slow animations
   - Memory leaks
   - High CPU usage

---

## ✅ Checklist Końcowy

Przed zakończeniem testów upewnij się że:

- [ ] Frontend uruchamia się bez błędów
- [ ] Menu dynamiczne działa dla wszystkich ról
- [ ] TTS Toggle przełącza tryby i zapisuje w localStorage
- [ ] Panel Klienta filtruje zamówienia poprawnie
- [ ] OrgSwitcher działa dla vendor/admin
- [ ] Panel Admin wyświetla statystyki
- [ ] Rezerwacje pokazują placeholder
- [ ] Responsywność działa na mobile/tablet/desktop
- [ ] Style są spójne z FreeFlow design system
- [ ] Wszystkie animacje są płynne
- [ ] Nie ma błędów w console
- [ ] localStorage persistence działa

---

## 🎉 Gratulacje!

Jeśli wszystkie testy przeszły pomyślnie, FreeFlow Front v3 jest gotowy do dalszego rozwoju! 🚀

**Następne kroki:**
1. Integracja z backendem
2. Implementacja AI features
3. Real-time updates z Supabase
4. Production deployment

---

**Dokument stworzony:** 2025-10-16  
**Wersja:** 1.0  
**Autor:** Claude Sonnet 4.5 (Augment Agent)

