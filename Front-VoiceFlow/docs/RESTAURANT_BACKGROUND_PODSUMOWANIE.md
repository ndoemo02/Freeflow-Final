# RestaurantBackground - Podsumowanie Implementacji

## ✅ Co zostało zrobione

### 1. Instalacja bibliotek Three.js
```bash
npm install three @react-three/fiber @react-three/drei --legacy-peer-deps
npm install --save-dev @types/three
```

### 2. Utworzony komponent `RestaurantBackground.tsx`
Lokalizacja: `src/components/RestaurantBackground.tsx`

**Funkcjonalności:**
- ✅ Tło restauracji jako CSS background-image (`/images/background3d.png`)
- ✅ Efekt parallax (ruch za myszą/gyro) przeniesiony z `MotionBackground`
- ✅ Canvas 3D z React Three Fiber
- ✅ Model kieliszka wina (`/public/3d assets/red_wine_glass.glb`)
- ✅ Świecąca lampka nad kieliszkiem (mesh z `emissive`)
- ✅ `PointLight` o ciepłym kolorze (#ffaa66)
- ✅ Szczegółowe komentarze w języku polskim

## 📝 Główne miejsca do edycji (oznaczone 👈 w kodzie)

### Pozycja kieliszka (linia ~23)
```tsx
position={[0, -1.5, 0]} // x (lewo/prawo), y (góra/dół), z (przód/tył)
scale={1.2}              // wielkość
```

### Lampka - pozycja i kolor (linia ~36-48)
```tsx
position={[0, 0.5, 0]}        // wysokość nad kieliszkiem
emissive="#ff8822"            // kolor świecenia lampki
emissiveIntensity={2.5}       // jak mocno świeci (0-10)
```

### Światło punktowe (linia ~60-64)
```tsx
intensity={3}                 // siła światła (0-10+)
color="#ffaa66"               // ciepły kolor światła
distance={5}                  // zasięg
```

### Pozycja Canvas na ekranie (linia ~132-136)
```tsx
top: "50%",    // pozycja pionowa - DOSTOSUJ gdzie jest lampka na zdjęciu
left: "40%",   // pozycja pozioma - DOSTOSUJ gdzie jest lampka na zdjęciu
width: "400px",
height: "400px",
```

### Kamera 3D (linia ~142-145)
```tsx
position: [0, 0, 5], // odległość kamery od kieliszka
fov: 45,             // kąt widzenia (20-70)
```

## 🚀 Jak użyć w projekcie

### Opcja 1: Zamienić istniejące tło w App.tsx
```tsx
// PRZED:
import MotionBackground from "./components/MotionBackground";

// PO:
import RestaurantBackground from "./components/RestaurantBackground";

// W JSX:
<RestaurantBackground />
```

### Opcja 2: Dodać tylko na konkretnej stronie (np. Home.tsx)
```tsx
import RestaurantBackground from "../components/RestaurantBackground";

function Home() {
  return (
    <>
      <RestaurantBackground />
      {/* Reszta komponentów */}
    </>
  );
}
```

## 🔧 Testowanie i dostosowanie

### 1. Uruchom projekt
```bash
npm run dev
```

### 2. Włącz kontrolki OrbitControls do testów
W `RestaurantBackground.tsx` linia ~70 odkomentuj:
```tsx
<OrbitControls /> // Pozwala obracać kamerę myszą
```

### 3. Dostosuj pozycję:
- **Canvas na ekranie**: `top`, `left` (linia ~132)
- **Kieliszek w scenie**: `position`, `scale` (linia ~23)
- **Lampka**: `position` (linia ~36)
- **Światło**: `intensity`, `color` (linia ~60)

### 4. Usuń OrbitControls przed produkcją

## 📂 Struktura plików

```
src/
└── components/
    ├── RestaurantBackground.tsx  ✅ NOWY KOMPONENT
    └── MotionBackground.module.css (używany do stylu tła)

public/
├── 3d assets/
│   └── red_wine_glass.glb  ✅ Model 3D
└── images/
    └── background3d.png     ✅ Tło z usuniętą lampką

docs/
├── RESTAURANT_BACKGROUND_USAGE.md  📖 Pełna dokumentacja
└── INTEGRATION_EXAMPLE_App.tsx     📖 Przykład integracji
```

## 💡 Wskazówki

### Problem: Model się nie ładuje
- Sprawdź konsolę przeglądarki (F12)
- Upewnij się że `red_wine_glass.glb` jest w `/public/3d assets/`
- Ścieżka musi być względna do folderu public: `/3d assets/red_wine_glass.glb`

### Problem: Kieliszek jest zbyt mały/duży
Zmień `scale` w linii ~24:
```tsx
scale={1.5}  // większy
scale={0.8}  // mniejszy
```

### Problem: Kieliszek w złym miejscu na ekranie
Dostosuj pozycję CSS Canvas (linia ~132-136):
```tsx
top: "60%",   // niżej
left: "30%",  // bardziej w lewo
```

### Chcę animację pulsowania lampki
Dodaj w `WineGlassWithLight`:
```tsx
import { useFrame } from "@react-three/fiber";

const lightRef = useRef<THREE.PointLight>(null);

useFrame((state) => {
  if (lightRef.current) {
    lightRef.current.intensity = 3 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
  }
});

// Później:
<pointLight ref={lightRef} ... />
```

## 🎨 Dodatkowe możliwości

### Zmiana koloru lampki na zimny (niebieski)
```tsx
emissive="#3399ff"    // Niebieski
color="#6699ff"       // Dla PointLight
```

### Dodanie drugiego kieliszka
```tsx
<primitive
  object={scene.clone()}
  position={[2, -1.5, 0]}  // W innym miejscu
  scale={1.0}
/>
```

### Zmiana tła
```tsx
backgroundImage: "url('/images/inne-tlo.png')"
```

## 📚 Dodatkowa dokumentacja
- Pełna dokumentacja: `docs/RESTAURANT_BACKGROUND_USAGE.md`
- Przykład integracji: `docs/INTEGRATION_EXAMPLE_App.tsx`

## ✨ Podsumowanie
Komponent jest gotowy do użycia! 
- Zaimportuj `RestaurantBackground` zamiast `MotionBackground`
- Dostosuj pozycje zgodnie z komentarzami 👈 w kodzie
- Uruchom projekt i ciesz się efektem 3D! 🍷
