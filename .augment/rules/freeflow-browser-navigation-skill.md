# FreeFlow — Skill nawigacji przeglądarkowej dla AI

## 🎯 Cel

Umożliwić Comet i każdemu AI-patcherowi sprawne poruszanie się po aplikacji FreeFlow
w środowisku przeglądarkowym — lokalnym i produkcyjnym — bez załadowania błędnych
elementów, złego viewportu lub pominięcia dynamicznego UI.

---

## 📱 Konfiguracja środowiska

| Parametr | Wartość |
|---|---|
| URL lokalne | http://localhost:5173/ |
| URL produkcja | https://freeflow-final.vercel.app/ |
| Viewport WYMAGANY | 390x844 (iPhone 13) |
| Touch simulation | ON |
| Pointer type | touch |
| CPU throttle testy | 2x |

UWAGA: Bottom-sheet i floating islands NIE renderują się w desktop viewport.
Zawsze testuj na 390x844.

---

## 🏗️ Struktura UI — mapa elementów

### Strona główna (/)

- Logo FreeFlow (centrum) — klik = uruchamia mikrofon
- Voice Bar (dół ekranu) — główny input
  - aria-label: "Napisz lub powiedz..."
  - find(): textbox "Napisz lub powiedz..."
  - Wysyłanie: klawisz Enter lub przycisk strzałki
- Pill "Odkrywanie" (lewy górny róg) — nawigacja do restauracji
- Menu hamburger ≡ (prawy górny róg) — sidebar nawigacyjny
- Debug icon 🐛 (lewy górny róg, pod pill) — tylko tryb dev
- Status indicator (lewy dolny róg):
  - ZIELONY = AI idle, gotowy na input
  - CZERWONY = AI przetwarza zapytanie
  - Pulsowanie = AI mówi / generuje odpowiedź
  - ZAWSZE czekaj na powrót do ZIELONEGO przed kolejną akcją

### Po komendzie głosowej — Island lewy (restauracje)

- Pojawia się floating island w lewym dolnym obszarze
- Header: "W POBLIZU" + "Polecane miejsca" + liczba opcji + przycisk "Rozwin"
- Karty restauracji: nazwa, dystans km, kuchnia, miasto, ocena
- Klik w kartę = wybór restauracji
- Oczekiwany czas pojawienia: 3-5 sekund od wysyłania komendy

### Po wyborze restauracji — Island prawy (menu)

- Header: "OBECNA RESTAURACJA" + nazwa
- Lista dań z ceną i przyciskiem "Wybierz"
- Przycisk "Rozwin" = pełna lista menu
- Komunikat w Voice Bar aktualizuje się automatycznie

### Panel boczny (hamburger)

- Główne, Odkrywaj Jedzenie, Rezerwacje Stolików
- Jedzenie → prowadzi do /restaurants (desktop panel)

### Dashboard (/restaurants)

- Desktop panel z bocznym menu
- Sekcja "Zamów jedzenie" z kafelkami restauracji
- Inny UI niż główna strona — BRAK bottom-sheet tutaj

---

## ⌨️ Komendy głosowe — skuteczne frazy

| Fraza | Efekt |
|---|---|
| "pokaż restauracje w [miasto]" | Lista restauracji w wybranym mieście |
| "szukaj [kuchnia]" | Filtruje restauracje po typie kuchni |
| "wybierz [nazwa restauracji]" | Ładuje menu wybranej restauracji |
| "zamów [nazwa dania]" | Dodaje do koszyka |
| "pokaż menu" | Rozwija listę dań aktywnej restauracji |

---

## 🧭 Przepływ testowy — krok po kroku

### 1. Otwarcie aplikacji
```
tabs_create: http://localhost:5173/
wait 3s
screenshot → sprawdz czy widac Voice Bar i logo
```

### 2. Wpisanie komendy
```
find("Voice Bar input text field Napisz lub powiedz")
→ ref: textbox
left_click na ref
type "pokaż restauracje w Piekarach Śląskich"
key "Return"
wait 4s (AI processing — indicator zmieni się na czerwony potem z powrotem na zielony)
screenshot
```

### 3. Rozpoznanie wyniku
```
Sprawdz czy pojawił się island lewy z kartami restauracji
Sprawdz komunikat na dole Voice Bar
Czekaj na status indicator = ZIELONY
```

### 4. Wybór restauracji
```
left_click na kartę restauracji w island lewym
wait 4s
Scrawdz czy pojawił się island prawy z menu
```

### 5. Wybór dania
```
left_click na przycisk "Wybierz" przy daniu
wait 2s
Sprawdz koszyk lub komunikat potwierdzenia
```

---

## ⚠️ Znane problemy i obejścia

### BŁĄD KRYTYCZNY: Vite overlay (ContextualIsland.tsx linia 410)
- Objaw: czerwony overlay z "Unexpected token (410:0)" po kliknięciu
- Obejście: kliknij poza overlayem, poczekaj na HMR reload
- NIE odświeżaj strony — stracisz stan UI

### Gesture conflicts (bottom-sheet)
- dragElastic = 0.5 domyślnie → scroll listy menu nie działa natywnie
- VELOCITY_THRESHOLD = 400 px/s za niski → przypadkowe expand/collapse
- Przy testach gestami: czekaj min. 400ms między swipami

### Dead zone na kartach restauracji
- Padding ~8-16px wokół kart jest niereaktywny
- Klikaj dokładnie w centrum karty, nie w padding

### DOM jest minimalny w read_page
- Większość UI jest dynamiczna (renderuje się po komendzie)
- Używaj find() dla Voice Bar zamiast selektorów
- Nie ufaj read_page na stronie głównej przed wysyłaniem komendy

---

## 📁 Ścieżki plikow (lokalne)

```
C:\Firerfox Portable\Freeflow brain\frontend\src\components\
├── IslandWrapper.tsx      — drag shell, snap logic, Framer Motion
├── ContextualIsland.tsx   — restaurant + menu islands, RAF spring
├── FocusStack.tsx         — depth carousel, wheel handler
├── DrawerMenu.jsx         — hamburger sidebar
└── ...
```

---

## ✅ Checklist przed każdym testem przeglądarkowym

- [ ] Viewport ustawiony na 390x844
- [ ] localhost:5173 zaladowany i responsywny
- [ ] Voice Bar widoczny na dole
- [ ] Status indicator ZIELONY
- [ ] Brak Vite error overlay
- [ ] Czekasz min. 400ms między gestami
- [ ] Po każdej komendzie czekasz na powrót indicator → ZIELONY

---

alwaysApply: true
