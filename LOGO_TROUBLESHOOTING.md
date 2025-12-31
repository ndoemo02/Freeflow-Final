# 🔧 FreeFlow Logo - Troubleshooting

## Problem: Logo jest czarno-białe

### Przyczyna
Oryginalny plik SVG (`Freeflowlogo.svg`) ma wszystkie elementy w kolorze białym (`fill="#fff"`).

### Rozwiązanie
Komponent używa **CSS filters** do kolorowania SVG:

```jsx
// W komponencie FreeFlowLogo.jsx
style={{
  filter: `invert(1) sepia(1) saturate(5) hue-rotate(${getHueRotation()}deg)`,
}}
```

**Jak to działa:**
1. `invert(1)` - odwraca kolory (białe → czarne)
2. `sepia(1)` - dodaje efekt sepii
3. `saturate(5)` - zwiększa nasycenie
4. `hue-rotate(X)` - obraca odcień koloru

**Mapowanie stanów na kolory:**
- `idle` → 20° (Orange)
- `listening` → 180° (Cyan)
- `speaking` → 280° (Purple)
- `off` → 210° (Slate/Blue-gray)

---

## Problem: Kolory nie są dokładnie takie jak oczekiwane

### Rozwiązanie 1: Dostosuj hue rotation

Edytuj `src/components/FreeFlowLogo.jsx`:

```jsx
const getHueRotation = () => {
  const hueMap = {
    idle: 20,      // Zmień wartość dla Orange
    listening: 180, // Zmień wartość dla Cyan
    speaking: 280,  // Zmień wartość dla Purple
    off: 210       // Zmień wartość dla Slate
  };
  return hueMap[state] || 0;
};
```

**Pomocne wartości hue:**
- 0° = Czerwony
- 30° = Pomarańczowy
- 60° = Żółty
- 120° = Zielony
- 180° = Cyan
- 240° = Niebieski
- 280° = Fioletowy
- 300° = Magenta

### Rozwiązanie 2: Użyj kolorowego SVG

Jeśli masz kolorową wersję SVG:

1. Zapisz jako `Freeflowlogo-color.svg` w `src/assets/`
2. Zmień import w komponencie:
```jsx
import logoSvg from "../assets/Freeflowlogo-color.svg";
```
3. Usuń filtry `invert`, `sepia`, `hue-rotate`

### Rozwiązanie 3: Użyj PNG

Jeśli wolisz PNG:

```jsx
// Zmień import
import logoImg from "../assets/Freeflowlogo.png";

// W komponencie użyj:
<img src={logoImg} alt="FreeFlow Logo" />
```

---

## Problem: Logo nie wyświetla się wcale

### Sprawdź:

1. **Czy plik SVG istnieje?**
```bash
ls src/assets/Freeflowlogo.svg
```

2. **Czy import jest poprawny?**
```jsx
import logoSvg from "../assets/Freeflowlogo.svg";
```

3. **Czy nie ma błędów w konsoli?**
Otwórz DevTools (F12) → Console

4. **Czy Vite obsługuje SVG?**
Vite automatycznie obsługuje SVG jako URL. Jeśli masz problemy, sprawdź `vite.config.ts`.

---

## Problem: Animacje są laggy

### Rozwiązanie:

1. **Zmniejsz rozmiar logo:**
```jsx
<FreeFlowLogo size={320} /> // Zamiast 460
```

2. **Wyłącz mic reactive:**
```jsx
<FreeFlowLogo micReactive={false} />
```

3. **Zmniejsz intensywność animacji:**

Edytuj `stateConfig` w komponencie:
```jsx
idle: {
  speed: 3,              // Wolniejsza animacja
  pulseIntensity: 0.02,  // Mniejsze pulsowanie
}
```

4. **Użyj `will-change` CSS:**
```css
.ff-logo {
  will-change: transform, filter;
}
```

---

## Problem: Mikrofon nie działa

### Sprawdź:

1. **Czy przeglądarka ma dostęp do mikrofonu?**
   - Chrome: Settings → Privacy → Site Settings → Microphone
   - Firefox: Preferences → Privacy & Security → Permissions

2. **Czy strona jest na HTTPS lub localhost?**
   Web Audio API wymaga bezpiecznego kontekstu.

3. **Czy użytkownik wyraził zgodę?**
   Przeglądarka powinna pokazać prompt o dostęp do mikrofonu.

### Debug:

Dodaj do komponentu:
```jsx
useEffect(() => {
  if (micReactive) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => console.log('✅ Mic access granted'))
      .catch(err => console.error('❌ Mic error:', err));
  }
}, [micReactive]);
```

---

## Problem: Pierścienie nie pulsują

### Sprawdź:

Czy stan to `listening` lub `speaking`?

```jsx
// Pierścienie pokazują się tylko dla:
state === 'listening' || state === 'speaking'
```

### Jeśli chcesz pierścienie dla wszystkich stanów:

Edytuj komponent:
```jsx
{/* Usuń warunek */}
{true && (
  <>
    <motion.div ... />
  </>
)}
```

---

## Problem: Glow effect nie działa

### Sprawdź:

1. **Czy `backdrop-filter` jest wspierany?**
   - Chrome/Edge: ✅
   - Firefox: ✅ (od wersji 103)
   - Safari: ✅

2. **Czy element ma `overflow: visible`?**

3. **Czy blur jest wystarczająco duży?**

Zwiększ blur:
```jsx
style={{
  filter: `blur(${60 + amplitude * 50}px)`, // Większy blur
}}
```

---

## Problem: Logo nie reaguje na kliknięcia

### Sprawdź:

1. **Czy przekazałeś `onClick`?**
```jsx
<FreeFlowLogo onClick={handleClick} />
```

2. **Czy element nie jest zasłonięty?**
Sprawdź z-index innych elementów.

3. **Czy `pointer-events` nie jest wyłączony?**

---

## Problem: Kolory są zbyt jasne/ciemne

### Dostosuj brightness i saturate:

```jsx
style={{
  filter: `
    invert(1) 
    sepia(1) 
    saturate(3)  // Zmniejsz dla mniej nasyconych kolorów
    brightness(0.8)  // Dodaj dla ciemniejszych kolorów
    hue-rotate(${getHueRotation()}deg)
  `,
}}
```

---

## Problem: Performance na mobile

### Optymalizacja:

1. **Wyłącz mic reactive na mobile:**
```jsx
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

<FreeFlowLogo
  micReactive={!isMobile && isRecording}
/>
```

2. **Zmniejsz rozmiar:**
```jsx
const logoSize = window.innerWidth < 768 ? 280 : 460;
```

3. **Uproszcz animacje:**
```jsx
const config = {
  ...stateConfig[state],
  speed: isMobile ? 3 : 1.5,  // Wolniej na mobile
};
```

---

## Przydatne komendy

### Sprawdź czy SVG jest poprawny:
```bash
cat src/assets/Freeflowlogo.svg | head -20
```

### Sprawdź rozmiar bundle:
```bash
npm run build
ls -lh dist/assets/*.js
```

### Testuj w różnych przeglądarkach:
- Chrome DevTools → Device Mode
- Firefox Responsive Design Mode
- Safari Web Inspector

---

## Kontakt i wsparcie

Jeśli problem nadal występuje:

1. Sprawdź konsolę przeglądarki (F12)
2. Sprawdź terminal Vite
3. Przejrzyj dokumentację: `src/components/FreeFlowLogo.md`
4. Przetestuj na `/logo-demo`

---

**Ostatnia aktualizacja:** 2025-10-16

