# Komponent RestaurantBackground - Dokumentacja

## Opis
Komponent łączący tło restauracji (CSS background-image) z interaktywnym elementem 3D - kieliszkiem wina i świecącą lampką renderowaną w Three.js.

## Instalacja
Wymagane zależności (już zainstalowane):
```bash
npm install three @react-three/fiber @react-three/drei --legacy-peer-deps
```

## Użycie w projekcie

### Przykład 1: Podstawowe użycie w App lub Home
```tsx
import RestaurantBackground from './components/RestaurantBackground';

function App() {
  return (
    <div className="app">
      <RestaurantBackground />
      {/* Reszta komponentów aplikacji */}
    </div>
  );
}
```

### Przykład 2: Zamiana istniejącego MotionBackground
Jeśli obecnie używasz `MotionBackground`, możesz go zastąpić:

```tsx
// PRZED:
import MotionBackground from './components/MotionBackground';

// PO:
import RestaurantBackground from './components/RestaurantBackground';
```

## Dostosowanie pozycji i ustawień

### 1. Pozycja kieliszka na scenie 3D
W komponencie `WineGlassWithLight`, linia ~23:
```tsx
<primitive
  object={scene}
  position={[0, -1.5, 0]} // 👈 x (lewo/prawo), y (góra/dół), z (przód/tył)
  scale={1.2}              // 👈 wielkość modelu
/>
```

### 2. Pozycja i kolor lampki
Linie ~36-48:
```tsx
// Pozycja lampki (mesh)
<mesh position={[0, 0.5, 0]}> // 👈 wysokość nad kieliszkiem

// Kolor i intensywność świecenia
<meshStandardMaterial
  emissive="#ff8822"        // 👈 kolor świecenia
  emissiveIntensity={2.5}   // 👈 jak mocno świeci (0-10)
/>

// Światło punktowe (PointLight)
<pointLight
  intensity={3}             // 👈 siła światła (0-10+)
  color="#ffaa66"           // 👈 ciepły kolor światła
  distance={5}              // zasięg światła
/>
```

### 3. Pozycja Canvas na ekranie
Linia ~132-136 - dostosuj CSS aby dopasować do miejsca lampki na zdjęciu:
```tsx
style={{
  top: "50%",    // 👈 pozycja pionowa (%)
  left: "40%",   // 👈 pozycja pozioma (%)
  width: "400px",
  height: "400px",
}}
```

### 4. Ustawienia kamery 3D
Linia ~142-145:
```tsx
camera={{
  position: [0, 0, 5], // 👈 odległość kamery od obiektu
  fov: 45,             // 👈 kąt widzenia (20-70)
}}
```

## Wskazówki debugowania

### Włączenie kontrolek OrbitControls (do testów)
Odkomentuj linię ~70 w komponencie:
```tsx
<OrbitControls /> // Pozwala obracać kamerę myszą
```

### Zmiana tła
Linia ~123:
```tsx
backgroundImage: "url('/images/background3d.png')"
```

### Problemy z modelem GLB
- Upewnij się, że plik `red_wine_glass.glb` jest w `/public/3d assets/`
- Ścieżka w useGLTF: `/3d assets/red_wine_glass.glb` (względna do public)

## Struktura plików
```
public/
  ├── 3d assets/
  │   └── red_wine_glass.glb
  └── images/
      └── background3d.png

src/
  └── components/
      ├── RestaurantBackground.tsx  (nowy komponent)
      └── MotionBackground.module.css (używany dla tła)
```

## Optymalizacja wydajności
- Model GLB jest ładowany raz i cache'owany przez `useGLTF`
- Canvas ma `pointerEvents: "none"` - nie blokuje interakcji z UI
- `Suspense` zapewnia płynne ładowanie modelu
- Przezroczyste tło Canvas (`gl={{ alpha: true }}`)

## Najczęstsze modyfikacje

### Dodanie drugiego kieliszka
```tsx
<primitive
  object={scene.clone()} // Clone modelu
  position={[2, -1.5, 0]} // Inna pozycja
  scale={1.0}
/>
```

### Zmiana koloru lampki na zimny (niebieski)
```tsx
emissive="#3399ff"    // Niebieski
color="#6699ff"       // Dla PointLight
```

### Animacja lampki (pulsowanie)
Dodaj w `WineGlassWithLight`:
```tsx
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

const lightRef = useRef<THREE.PointLight>(null);
useFrame((state) => {
  if (lightRef.current) {
    lightRef.current.intensity = 3 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
  }
});

<pointLight ref={lightRef} ... />
```
