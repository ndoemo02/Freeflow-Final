# FreeFlow Design System — Unified v1.0
### Consumer ↔ Business Panel Unification / 2026-04-06

---

## 1. Aktualny problem

| Element | Consumer | Business | Gap |
|---|---|---|---|
| Tło | `#070A12` + radial gradient | `#0d1020` flat | Inny odcień, brak gradientu |
| Karty | glass blur 12–20px + orange border-glow | glass blur 25px + neutral border | Brak marki w borderze |
| CTA | orange gradient + box-shadow glow | neutral rgba | Brak spójności akcji |
| Typografia | Space Grotesk, orange accent | Space Grotesk, neon accent | Inny kolor akcentu |
| Status badges | kolorowe z glow shadow | bordered bez glow | Brak spójności |
| Tożsamość | premium, żywa | generic admin | Zupełnie inne odczucie |

---

## 2. Design Tokens — Single Source of Truth

Wszystkie tokeny poniżej obowiązują w **obu panelach**. Żadnych lokalnych override'ów kolorów.

### 2.1 Kolory bazowe

```
BACKGROUND
  --bg0:   #070A12   ← ciemniejszy base (consumer) — przyjąć jako standard
  --bg1:   #0B1222   ← surface layer
  --bg2:   #0F1830   ← elevated surface (cards, drawers)

FOREGROUND
  --fg0:   #EAF0FF   ← primary text
  --fg1:   #9AA7C2   ← secondary / muted text
  --fg2:   #5A6882   ← placeholder / disabled

BRAND
  --orange: #F97316  ← primary brand accent (consumer) → przeniesiony do business
  --neon:   #5B7CFF  ← secondary accent (neon blue)
  --neon2:  #38BDF8  ← tertiary accent (cyan)

SEMANTIC
  --good:  #22C55E   ← success / ready
  --warn:  #F59E0B   ← warning / preparing
  --bad:   #EF4444   ← error / cancelled
  --info:  #38BDF8   ← informational

GLASS / BORDER
  --glass:   rgba(255,255,255,0.06)
  --glass2:  rgba(255,255,255,0.09)
  --border:  rgba(255,255,255,0.10)
  --border2: rgba(255,255,255,0.06)   ← subtelniejszy
```

### 2.2 Promień i spacing

```
RADIUS
  --r-sm:   12px    ← badges, małe elementy
  --r-md:   16px    ← karty business, statsy
  --r-lg:   20px    ← consumer hero card, główne modale
  --r-xl:   28px    ← restaurant cards consumer
  --r-pill: 999px   ← status badges

SPACING (skala 4px)
  --s-1: 4px    --s-2: 8px    --s-3: 12px
  --s-4: 16px   --s-5: 20px   --s-6: 24px
  --s-8: 32px   --s-10: 40px

BLUR
  --blur-sm: 8px    ← floating navbars, sticky elements
  --blur-md: 12px   ← standardowe karty
  --blur-lg: 20px   ← consumer hero
  --blur-xl: 25px   ← business glassmorphism (zachowane)
```

### 2.3 Typografia

```
FONT: 'Space Grotesk', 'Inter', sans-serif  ← obie panele

SKALA
  --text-xs:   0.75rem  / 400  ← label, meta
  --text-sm:   0.875rem / 500  ← secondary
  --text-base: 1rem     / 500  ← body
  --text-lg:   1.125rem / 600  ← card title
  --text-xl:   1.375rem / 700  ← section header
  --text-2xl:  1.75rem  / 700  ← metric value, panel title
  --text-3xl:  2rem+    / 800  ← hero (consumer only)

ACCENT GRADIENT (shared)
  background: linear-gradient(135deg, var(--fg0) 0%, var(--orange) 100%)
  → używany w tytułach obu paneli
```

---

## 3. Business-Adapted Design Rules

Business panel dziedziczy **tożsamość**, nie kopiuje **dekoracji**.

### Zasada: Same Identity, Higher Clarity

| Aspekt | Consumer | Business |
|---|---|---|
| Tło | `--bg0` + dekoracyjny gradient | `--bg0` + subtelny gradient (nie glow, tylko depth) |
| Karty | glow border w kolorze kontekstu | glass border + color-left-stripe per status |
| Akcje | orange glow CTA | orange CTA bez glow, filled |
| Animacje | breathing, pulse, slow-glow | fade-in tylko, bez pulsowania |
| Noise | dopuszczalny (premium feel) | minimalizowany (clarity first) |
| Kontrast tekstu | fg0 na bg1 = ok | fg0 na bg2 = minimum, --fg1 dla meta |

---

## 4. Komponent Mapping: Consumer → Business

### 4.1 Card

**Consumer card (restaurant):**
```
background: linear-gradient(180deg, rgba(9,12,18,0.9), rgba(16,22,32,0.78))
border: 1px solid rgba(255,255,255,0.10)
border-radius: 28px
backdrop-filter: blur(12px)
box-shadow: 0 0 0 1px rgba(91,124,255,0.25), 0 12px 28px rgba(0,0,0,0.28)
```

**Business metric card:**
```
background: var(--glass)                      ← rgba(255,255,255,0.06)
border: 1px solid var(--border)               ← rgba(255,255,255,0.10)
border-radius: var(--r-md)                    ← 16px (czytelniejszy niż 28px)
backdrop-filter: blur(var(--blur-xl))         ← 25px (zachowane z business)
box-shadow: 0 4px 24px rgba(0,0,0,0.30)      ← głębokość bez glow
border-left: 3px solid var(--orange)          ← brand strip zamiast glow
```

Różnica: mniejszy radius dla danych (28px jest consumer-only), left-strip zamiast obwodowego glow.

---

### 4.2 Status Badge

**Consumer:**
```
px-4 py-1.5 rounded-full backdrop-blur-md
ordering:   bg: rgba(249,115,22,0.20)  text: #F97316  shadow: 0 0 15px rgba(249,115,22,0.2)
confirming: bg: rgba(34,197,94,0.20)   text: #22C55E  shadow: 0 0 15px rgba(34,197,94,0.2)
clarifying: bg: rgba(234,179,8,0.20)   text: #EAB308  shadow: 0 0 15px rgba(234,179,8,0.2)
```

**Business order status badge:**
```
px-3 py-1 rounded-full text-xs font-semibold tracking-wide
new:        bg: rgba(91,124,255,0.15)  text: var(--neon)   border: 1px solid rgba(91,124,255,0.30)
preparing:  bg: rgba(249,115,22,0.15)  text: var(--orange) border: 1px solid rgba(249,115,22,0.30)
ready:      bg: rgba(34,197,94,0.15)   text: var(--good)   border: 1px solid rgba(34,197,94,0.30)
cancelled:  bg: rgba(239,68,68,0.12)   text: var(--bad)    border: 1px solid rgba(239,68,68,0.25)
```

Różnica: bez box-shadow glow (KDS musi być czytelny w silnym świetle), border zamiast glow.

---

### 4.3 Action Button

**Consumer (voice CTA):**
```
width: 56px height: 56px border-radius: 50%
background: linear-gradient(135deg, #ff8822, #ffa500)
box-shadow: 0 4px 16px rgba(255,136,34,0.4), inset 0 1px 0 rgba(255,255,255,0.3)
```

**Business action button (Accept / Reject / Complete):**
```
PRIMARY (Accept / Potwierdź):
  background: rgba(249,115,22,0.15)
  border: 1px solid rgba(249,115,22,0.40)
  color: var(--orange)
  border-radius: var(--r-sm)            ← 12px, nie pill
  padding: 8px 16px
  font-weight: 600
  transition: background 0.15s
  hover: background: rgba(249,115,22,0.25)

DESTRUCTIVE (Anuluj):
  background: rgba(239,68,68,0.12)
  border: 1px solid rgba(239,68,68,0.30)
  color: var(--bad)
  hover: background: rgba(239,68,68,0.22)

NEUTRAL (Przekaż / Więcej):
  background: var(--glass)
  border: var(--border)
  color: var(--fg1)
  hover: background: var(--glass2)
```

Różnica: filled gradient zastąpiony bordered ghost button — zachowuje kolor marki, nie dominuje nad danymi.

---

### 4.4 KDS Card

**KDS order card:**
```
WRAPPER:
  background: var(--glass)
  border: 1px solid var(--border)
  border-top: 3px solid [status-color]   ← top-stripe zamiast obwodowego border
  border-radius: var(--r-md)             ← 16px
  padding: var(--s-4) var(--s-5)
  backdrop-filter: blur(var(--blur-md))

HEADER ROW:
  order ID:    font-size: var(--text-sm), color: var(--fg1)
  order name:  font-size: var(--text-lg), font-weight: 700, color: var(--fg0)
  time badge:  pill, var(--warn) gdy >10min, var(--good) gdy on-time

ITEMS LIST:
  background: var(--glass2)
  border-radius: var(--r-sm)
  padding: var(--s-3)
  item row:    font-size: var(--text-base), color: var(--fg0)
  qty:         font-weight: 700, color: var(--orange)   ← brand accent na ilości

FOOTER:
  action buttons w rzędzie
  border-top: 1px solid var(--border2)
  padding-top: var(--s-3)
```

**Top-stripe per status:**
```
new:       border-top: 3px solid var(--neon)    ← niebieski
preparing: border-top: 3px solid var(--orange)  ← pomarańczowy
ready:     border-top: 3px solid var(--good)    ← zielony
cancelled: border-top: 3px solid var(--bad)     ← czerwony
```

---

### 4.5 Dashboard Layout

**Business dashboard layout:**
```
HEADER BAR (sticky):
  height: 64px
  background: rgba(7,10,18,0.88)
  backdrop-filter: blur(var(--blur-sm))
  border-bottom: 1px solid var(--border2)
  → logo / panel name (gradient text) / back button / nav links

CONTENT AREA:
  max-width: 1400px, centered, padding: var(--s-6)

  ROW 1 — Metrics (4 col grid):
    StatCards: glass + left-strip + metric value in --fg0

  ROW 2 — Split (2/3 + 1/3):
    LEFT:  Orders list (glass container)
    RIGHT: Quick actions / status summary

  ROW 3 — Full width:
    KDS preview / channel breakdown
```

---

## 5. Background — Unified Rule

**Consumer:**
```css
background: radial-gradient(ellipse 80% 60% at 50% -20%,
  rgba(249,115,22,0.12) 0%,
  transparent 60%),
  var(--bg0);
```

**Business:**
```css
background: radial-gradient(ellipse 100% 40% at 50% 0%,
  rgba(91,124,255,0.06) 0%,       ← neon zamiast orange, dużo słabszy
  transparent 60%),
  var(--bg0);
```

Zasada: consumer ma tożsamość koloru w tle, business ma głębokość bez koloru marki — kolor marki pojawia się tylko w danych i akcjach.

---

## 6. Orders List — Struktura

```
CONTAINER:
  background: var(--glass)
  border: 1px solid var(--border)
  border-radius: var(--r-md)
  padding: var(--s-5)

  TITLE ROW:
    "Aktywne zamówienia" — text-lg 700 fg0
    count badge — pill, neon background

  LIST:
    każdy ORDER ROW:
      background: var(--glass2)
      border: 1px solid var(--border2)
      border-radius: var(--r-sm)
      padding: var(--s-3) var(--s-4)
      margin-bottom: var(--s-2)

      LEFT:   order name + items preview (fg0 + fg1)
      CENTER: status badge (semantic color)
      RIGHT:  timestamp + action button

      hover: border-color → rgba(249,115,22,0.20) ← orange hint

  EMPTY STATE:
    centered, fg1 text, icon, bez heavy illustration
```

---

## 7. Czego NIE robić

| Zakaz | Powód |
|---|---|
| Flat grey cards `#1a1a2e` bez glass | Wygląd generic admin |
| `background: #2d2d2d` na kartach | Brak tożsamości systemu |
| Białe tło jakiegokolwiek elementu | Łamie dark theme |
| Kolorowe gradienty jako tło kart | To consumer-only (hero card) |
| Font-weight 400 na danych operacyjnych | Za mały kontrast czytelności |
| Status badge bez border | Traci czytelność na blur background |
| Box-shadow glow na KDS | Distraction w środowisku kuchni |
| Animacje pulse/breathing na business | Rozpraszające podczas pracy |
| Neon glow na każdym buttonie | Hierarchia tracona |

---

## 8. Quick Reference — Consumer → Business Mapping

| Element consumer | Element business | Zmiana |
|---|---|---|
| Restaurant card (28px, gradient bg, orange ring) | Metric card (16px, glass, orange left-strip) | Mniejszy radius, strip zamiast ring |
| Hero card (gradient orange bg, glow) | Dashboard header (gradient text, flat bg) | Gradient tylko w typografii |
| State badge (rounded-full, glow shadow) | Order status badge (rounded-full, border, no glow) | Usunięty shadow-glow |
| Voice CTA (filled orange gradient circle) | Action button (ghost orange bordered, rect) | Ghost zamiast filled, prostokąt |
| Glass card (blur 12px, thin border) | KDS card (blur 12px, top-color-strip) | Dodany status strip |
| Star/galaxy bg | Flat bg0 + neon gradient top | Usunięty wallpaper |
| Orange radial bg gradient | Neon radial bg gradient (6% opacity) | Zmieniony kolor, zmniejszona intensywność |

---

*v1.0 — 2026-04-06. Następny krok: implementacja w BusinessClientPanel.css, StatCard.css, ActiveOrdersList.css.*
