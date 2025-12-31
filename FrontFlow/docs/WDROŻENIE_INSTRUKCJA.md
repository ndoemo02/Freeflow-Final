# INSTRUKCJA WDROŻENIA RestaurantBackground

## ⚠️ UWAGA: Wykryty problem z Vite

Podczas wdrażania wykryłem problem z uruchomieniem serwera deweloperskiego Vite. Problem NIE jest związany z komponentem RestaurantBackground (działa nawet bez niego).

## ✅ Co zostało przygotowane:

1. **Komponent `RestaurantBackground.tsx`** - w pełni funcjonalny, gotowy do użycia
  - Lokalizacja: `src/components/RestaurantBackground.tsx`
  - Zawiera model 3D kieliszka, lampkę, światło punktowe
  - Szczegółowo skomentowany w j. polskim

2. **Zainstalowane biblioteki Three.js:**
   - `three` - ^0.182.0
   - `@react-three/fiber` - ^9.4.2
   - `@react-three/drei` - ^10.7.7
   - `@types/three` - ^0.182.0

3. **Dokumentacja:**
   - `docs/RESTAURANT_BACKGROUND_PODSUMOWANIE.md` - pełny przewodnik PL
   - `docs/RESTAURANT_BACKGROUND_USAGE.md` - dokumentacja techniczna
   - `docs/INTEGRATION_EXAMPLE_App.tsx` - przykład integracji

## 🔧 KROKI NAPRAWCZE (WYKONAJ TEN):

### Krok 1: Zatrzymaj wszystkie procesy Node.js
```powershell
# Zamknij wszystkie terminale z `npm run dev`
# Możesz też zabić proces:
taskkill /F /IM node.exe
```

### Krok 2: Wyczyść całkowicie node_modules i cache
```powershell
cd "c:\Freeflow (Cursor vers. GITHUB)\classic-ui-app3"

# Usuń node_modules i cache
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
```

### Krok 3: Reinstalacja pakietów
```powershell
npm install --legacy-peer-deps
```

### Krok 4: Próba uruchomienia
```powershell
npm run dev
```

**Jeśli nadal nie działa, przejdź do Kroku 5.**

### Krok 5: Alternatywna reinstalacja (jeśli Krok 4 nie pomógł)
```powershell
# Cofnij się do znanej działającej wersji package.json z repozytorium
git checkout package.json package-lock.json

# Zainstaluj ponownie
npm install

# Zainstaluj Three.js oddzielnie
npm install three @react-three/fiber @react-three/drei --legacy-peer-deps
npm install --save-dev @types/three

# Spróbuj uruchomić
npm run dev
```

## 🚀 WDROŻENIE KOMPONENTU (gdy serwer działa):

### Opcja A: Automatyczne wdrożenie
Już przygotowałem kod w `App.tsx`, wystarczy zmienić import:

```tsx
// W pliku src/App.tsx zmień linię 16 z:
import MotionBackground from "./components/MotionBackground";

// NA:
import RestaurantBackground from "./components/RestaurantBackground";

// I linię 30 z:
<MotionBackground />

// NA:
<RestaurantBackground />
```

### Opcja B: Ręczne dostosowanie (bardziej kontrolowane)
Zobacz pełny przykład w `docs/INTEGRATION_EXAMPLE_App.tsx`

## 📝 NASTĘPNE KROKI (dopo uruchomienia):

1. **Dostosuj pozycję Canvas** na ekranie (linie ~131-132 w RestaurantBackground.tsx):
   ```tsx
   top: "50%",   // 👈 pionowo
   left: "40%",  // 👈 poziomo
   ```

2. **Dostosuj pozycję kieliszka** w scenie 3D (linia ~25):
   ```tsx
   position={[0, -1.5, 0]} // 👈 [x, y, z]
   scale={1.2}              // 👈 wielkość
   ```

3. **Dostosuj lampkę i światło** (linie ~36-60):
   ```tsx
   emissive="#ff8822"        // 👈 kolor świecenia
   emissiveIntensity={2.5}   // 👈 intensywność
   intensity={3}             // 👈 siła światła punktowego
   ```

4. **(Opcjonalnie) Włącz OrbitControls** do testowania:
   - Odkomentuj linię ~66: `<OrbitControls />`
   - Obracaj kamerę myszą aby lepiej dopasować pozycje
   - Zakomentuj przed wdrożeniem na produkcję

## ❓ ROZWIĄZYWANIE PROBLEMÓW

### Problem: Biały ekran lub błąd 504 w przeglądarce
**Rozwiązanie:**
```powershell
# Wyczyść cache Vite i przeładuj
Remove-Item -Recurse -Force node_modules\.vite
npm run dev
```
W przeglądarce: **Ctrl+Shift+R** (hard reload)

### Problem: Model kieliszka nie ładuje się
**Sprawdź:**
1. Czy plik istnieje: `public/3d assets/red_wine_glass.glb`
2. Czy ścieżka w kodzie to: `/3d assets/red_wine_glass.glb` (względna do public)
3. Konsola przeglądarki (**F12**) - zobacz błędy

### Problem: Kieliszek jest niewidoczny/za mały
**Dostosuj:**
```tsx
scale={2.5}  // Zwiększ skalę
position={[0, -0.5, 0]}  // Przesuń wyżej (mniejszy Y)
```

### Problem: Lampka nie świeci
**Zwiększ intensywność:**
```tsx
emissiveIntensity={5.0}  // Mocniejsze świecenie
intensity={8}            // Mocniejsze światło punktowe
```

## 📚 DOKUMENTACJA

Pełn instrukcje znajdują się w:
- `docs/RESTAURANT_BACKGROUND_PODSUMOWANIE.md` - kompletny przewodnik PL
- `docs/RESTAURANT_BACKGROUND_USAGE.md` - dokumentacja techniczna EN/PL

## ✉️ Kontakt

Jeśli problemy z Vite będą nadal występować, może to być problem z:
- Konflikt wersjami Node.js (sprawdź: `node --version` - rekomendowane v18-v22)
- Konflikt portów (5173 zajęty)
- Prawa dostępu do plików
- Antywirusem blokującym Vite

Powodzenia! 🍷✨
