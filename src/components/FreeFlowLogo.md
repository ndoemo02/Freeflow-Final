# FreeFlowLogo Component

Nowoczesny, animowany komponent logo FreeFlow z obsługą stanów głosowych i reaktywnością na dźwięk.

## 🎯 Features

- ✅ **4 stany animacji**: idle, listening, speaking, off
- ✅ **Mic Reactive**: Reaguje na amplitudę dźwięku z mikrofonu
- ✅ **Płynne przejścia**: Smooth transitions między stanami
- ✅ **Pulsujące pierścienie**: Dla stanów aktywnych (listening, speaking)
- ✅ **Contra-pulse glow**: Dynamiczny efekt świecenia
- ✅ **Amplitude indicator**: Wizualizacja poziomu dźwięku
- ✅ **Accessibility**: Keyboard navigation, ARIA labels
- ✅ **Responsywny**: Skalowalny do dowolnego rozmiaru
- ✅ **Framer Motion**: Wykorzystuje istniejącą bibliotekę animacji

## 📦 Installation

Komponent jest już zintegrowany z projektem. Używa:
- `framer-motion` (już zainstalowany)
- `src/assets/Freeflowlogo.svg` (istniejący plik)

## 🚀 Basic Usage

```jsx
import FreeFlowLogo from './components/FreeFlowLogo';

function App() {
  return (
    <FreeFlowLogo 
      state="idle" 
      size={420} 
    />
  );
}
```

## 📖 Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `state` | `'idle' \| 'listening' \| 'speaking' \| 'off'` | `'idle'` | Stan animacji logo |
| `size` | `number` | `420` | Rozmiar logo w pikselach |
| `micReactive` | `boolean` | `false` | Czy logo ma reagować na mikrofon |
| `onClick` | `() => void` | `undefined` | Callback po kliknięciu logo |
| `className` | `string` | `''` | Dodatkowe klasy CSS |

## 🎭 States

### 1. **idle** (Spokojny)
- Kolor: Orange (#FF8A32)
- Delikatne pulsowanie
- Stan domyślny, oczekiwanie

```jsx
<FreeFlowLogo state="idle" />
```

### 2. **listening** (Nasłuchiwanie)
- Kolor: Cyan (#00E0FF)
- Intensywne pulsowanie
- Pulsujące pierścienie
- Idealny dla aktywnego rozpoznawania mowy

```jsx
<FreeFlowLogo state="listening" micReactive={true} />
```

### 3. **speaking** (Mówienie)
- Kolor: Purple (#A855F7)
- Najintensywniejsze animacje
- Pulsujące pierścienie
- Dla odpowiedzi głosowej AI

```jsx
<FreeFlowLogo state="speaking" />
```

### 4. **off** (Nieaktywny)
- Kolor: Slate (#64748B)
- Minimalne animacje
- Przygaszony wygląd

```jsx
<FreeFlowLogo state="off" />
```

## 🎤 Mic Reactive Mode

Gdy `micReactive={true}`, logo reaguje na dźwięk z mikrofonu:

```jsx
<FreeFlowLogo 
  state="listening" 
  micReactive={true}
  size={460}
/>
```

**Features:**
- Automatyczne pobieranie audio z mikrofonu
- Real-time analiza amplitudy
- Dynamiczne skalowanie i glow
- Wizualny wskaźnik poziomu dźwięku (5 pasków)
- Automatyczne czyszczenie zasobów

**Uwaga:** Wymaga zgody użytkownika na dostęp do mikrofonu.

## 🖱️ Interactive Mode

Logo może być interaktywne (klikalne):

```jsx
<FreeFlowLogo 
  state="idle"
  onClick={() => {
    console.log('Logo clicked!');
    startVoiceRecognition();
  }}
/>
```

**Accessibility:**
- Automatyczne `role="button"`
- Keyboard navigation (Enter, Space)
- ARIA labels
- Focus states

## 🎨 Styling

### Custom Size

```jsx
<FreeFlowLogo size={280} />  {/* Small */}
<FreeFlowLogo size={420} />  {/* Medium (default) */}
<FreeFlowLogo size={560} />  {/* Large */}
<FreeFlowLogo size={720} />  {/* XL */}
```

### Custom Classes

```jsx
<FreeFlowLogo 
  className="my-custom-class hover:scale-110 transition-transform"
/>
```

## 🔄 State Management Example

```jsx
import { useState } from 'react';
import FreeFlowLogo from './components/FreeFlowLogo';

function VoiceInterface() {
  const [logoState, setLogoState] = useState('idle');
  const [isRecording, setIsRecording] = useState(false);

  const handleLogoClick = () => {
    if (logoState === 'idle') {
      setLogoState('listening');
      setIsRecording(true);
      startRecording();
    } else {
      setLogoState('idle');
      setIsRecording(false);
      stopRecording();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <FreeFlowLogo
        state={logoState}
        size={460}
        micReactive={isRecording}
        onClick={handleLogoClick}
      />
      <p className="mt-4 text-slate-400">
        {logoState === 'idle' && 'Kliknij aby rozpocząć'}
        {logoState === 'listening' && 'Słucham...'}
        {logoState === 'speaking' && 'Odpowiadam...'}
      </p>
    </div>
  );
}
```

## 🎬 Animation Details

### Pulse Animation
- **Idle**: 2.5s, 3% scale
- **Listening**: 1.5s, 8% scale
- **Speaking**: 1.2s, 12% scale
- **Off**: 3s, 1% scale

### Glow Effect
- Contra-pulse (odwrotnie do głównego logo)
- Dynamiczny blur (40-70px)
- Radial gradient
- Opacity changes

### Rings (listening/speaking only)
- 3 pulsujące pierścienie
- Różne opóźnienia (0s, 0.3s, 0.6s)
- Scale: 1.2x, 1.3x, 1.4x
- Fade out effect

## 🧪 Testing

Odwiedź `/logo-demo` w trybie development aby przetestować wszystkie stany:

```
http://localhost:5173/logo-demo
```

**Demo features:**
- Przełączanie stanów
- Slider rozmiaru
- Toggle mic reactive
- Live code preview
- Feature list

## 🔧 Technical Details

### Dependencies
- `framer-motion` - Animacje
- `react` - Core
- Web Audio API - Mic reactive mode

### Performance
- Używa `useAnimation()` z Framer Motion
- Cleanup w `useEffect` dla audio context
- `requestAnimationFrame` dla smooth updates
- Minimal re-renders

### Browser Support
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (może wymagać user gesture dla mikrofonu)
- Mobile: ✅ Responsive, mic reactive może być ograniczony

## 🐛 Troubleshooting

### Mikrofon nie działa
```
Error: Microphone access denied
```
**Rozwiązanie:** Użytkownik musi wyrazić zgodę na dostęp do mikrofonu w przeglądarce.

### Logo nie animuje się
**Sprawdź:**
1. Czy `framer-motion` jest zainstalowany
2. Czy plik SVG istnieje w `src/assets/Freeflowlogo.svg`
3. Czy nie ma błędów w konsoli

### Niska wydajność
**Optymalizacja:**
1. Wyłącz `micReactive` gdy nie jest potrzebny
2. Zmniejsz `size` dla mobile
3. Użyj `state="off"` gdy logo nie jest widoczne

## 📝 Changelog

### v1.0.0 (2025-10-16)
- ✅ Initial release
- ✅ 4 stany animacji
- ✅ Mic reactive mode
- ✅ Accessibility features
- ✅ Demo page
- ✅ Full documentation

## 🤝 Contributing

Aby dodać nowe stany lub animacje:

1. Dodaj nowy stan do `stateConfig`
2. Zaktualizuj type w Props
3. Dodaj dokumentację
4. Przetestuj w `/logo-demo`

## 📄 License

Part of FreeFlow Business v3 project.

---

**Made with ❤️ using Framer Motion**

