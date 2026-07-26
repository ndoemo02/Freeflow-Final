# classic-ui-app DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: Tailwind CSS 3.3.3 + React 18.3.1 + CSS-in-JS (styled-components) 6.1.19 + CSS Modules
> Colors: 20 · Fonts: 2 · Components: 152
> Icon library: Lucide · State: Zustand
> Primary theme: light · Dark mode toggle: no · Motion: expressive

---

## 1. Visual Theme & Atmosphere

This is a **light-themed** interface with a warm, approachable feel. The light background emphasizes content clarity. Typography pairs **Orbitron** for display/headings with **inherit** for body text, creating clear visual hierarchy through type contrast. Spacing follows a **4px base grid** (compact density), with scale: 2, 4, 6, 8, 10, 12, 14, 16px. The accent color **#ff7e00** anchors interactive elements (buttons, links, focus rings). Motion is expressive — spring physics, layout animations, and staggered reveals are part of the visual language.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| text-color | `#ffffff` | background | Page background, darkest surface |
| background-color | `#010101` | text-primary | Headings and body text |
| primary-color | `#ff7e00` | accent | CTAs, links, focus rings, active states |
| accent-color | `#ffa500` | accent | CTAs, links, focus rings, active states |
| danger | `#ff7a1c` | danger | Error states, destructive actions |
| success | `#22c55e` | success | Success states, positive indicators |
| warning | `#facc15` | warning | Warning states, caution indicators |
| info | `#e8eefc` | info | Informational highlights |
| grid-color | `#141414` | unknown | Palette color |
| unknown | `#0a0a0a` | unknown | Palette color |
| unknown | `#ff6a00` | unknown | Palette color |
| unknown | `#0b1222` | unknown | Palette color |
| unknown | `#ff5a4e` | unknown | Palette color |
| unknown | `#ef4444` | unknown | Palette color |
| unknown | `#00e0ff` | unknown | Palette color |
| unknown | `#ffb173` | unknown | Palette color |
| glow-color-1 | `#e33fb7` | unknown | Palette color |
| glow-color-2 | `#5a49d4` | unknown | Palette color |
| border-color-1 | `#ff64dc` | unknown | Palette color |
| border-color-2 | `#7864ff` | unknown | Palette color |

### CSS Variable Tokens

```css
--background-color: rgb(1,1,1);
--border-color-1: rgba(255,100,220,1);
--border-color-2: rgba(120,100,255,1);
--primary-color: #ff7e00;
--secondary-color: #cc5500;
--accent-color: #ffa500;
--muted: var(--ff-text-2);
--border: rgba(255,255,255,0.10);
--ff-radius-card: 18px;
--ff-shadow-card: 0 8px 28px rgba(0,0,0,0.45);
```


---

## 3. Typography Rules

**Font Stack:**
- **inherit** — Heading 1, Heading 2
- **Orbitron** — Body, Caption

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | inherit | 1.8rem | 700 |
| Heading 2 | inherit | 28px | 700 |
| Body | Orbitron | 18px | 400 |
| Caption | Orbitron | 13px | 400 |

**Typographic Rules:**
- Limit to 2 font families max per screen
- Use **inherit** for body/UI text, **Orbitron** for display/headings
- Maintain consistent hierarchy: no more than 3-4 font sizes per screen
- Headings use bold (600-700), body uses regular (400)
- Line height: 1.5 for body text, 1.2 for headings
- Use color and opacity for secondary hierarchy, not additional font sizes


---

## 4. Component Stylings

### Layout (37)

**ComparisonMode** — `src/components/admin/ComparisonMode.jsx`
- Variants: `previous`, `custom`, `revenue`, `yoy`
- Props: `currentData`, `onPeriodSelect`, `metrics`
- Key Styles: `rounded-xl`, `border-white/20`, `bg-gray-800/50`, `p-8`, `text-xs`, `font-semibold`, `hover:bg-purple-700`
- Animation: framer-motion, animate: {opacity: 1, y: 0}, tw-transitions: transition-all
- State: useState

```tsx
<div className="bg-gray-800/50 rounded-xl p-8 text-center text-gray-400">
        Brak danych do porównania
      </div>
```

**ConversationDebugView** — `src/components/admin/ConversationDebugView.jsx`
- Variants: `unknown`
- Props: `event`, `expanded`
- Key Styles: `rounded-lg`, `border-[var(--ff-stroke)]`, `bg-[rgba(0,0,0,0.2)]`, `px-4`, `text-xs`, `font-mono`, `hover:bg-[rgba(255,255,255,0.02)]`
- Animation: tw-transitions: transition-colors
- State: useState

```tsx
<div className="border border-[var(--ff-stroke
```

**AmberIndicator** — `src/components/AmberIndicator.tsx`
- Variants: `idle`, `listening`, `thinking`, `speaking`, `presenting`, `error`, `ok`
- Props: `status`, `className`

```tsx
<div className={`relative flex items-center justify-center ${className}`} data-amber-status={status}>
             <div style={{ transform: 'scale(0.28
```

**AmberLiveMonitor** — `src/components/AmberLiveMonitor.tsx`
- Key Styles: `rounded-2xl`, `border-slate-700`, `bg-slate-900`, `p-4`, `text-lg`, `font-semibold`
- State: useState

**AmberStatus** — `src/components/AmberStatus.jsx`
- Props: `state`
- Key Styles: `rounded-full`, `gap-2`, `text-sm`, `shadow-md`
- Animation: tw-animate-pulse

```tsx
<div className="flex items-center gap-2 text-sm text-gray-200">
      <span>Amber:</span>
      <span
        className={`${color} w-3 h-3 rounded-full shadow-md animate-pulse`}
        title={`Status: ${label}`}
      />
      <span className="capitalize">{label}</span>
    </div>
```

**AnimatedCards** — `src/components/AnimatedCards.jsx`
- Variants: `Restaurant`, `R`
- Props: `items`, `onItemClick`, `className`, `cardType`
- Key Styles: `rounded-[32px]`, `bg-gradient-to-t`, `p-6`, `text-lg`, `font-semibold`, `opacity-60`, `pointer-events-none`
- Animation: motion-variant: variants={containerVariants}, motion-variant: variants={cardVariants}, framer-motion
- State: useState, useRef

**BusinessPanel** — `src/components/BusinessPanel.jsx`
- Props: `isOpen`, `onClose`
- Key Styles: `rounded-xl`, `border-gray-700/50`, `bg-gray-800/50`, `space-y-6`, `text-sm`, `font-bold`, `hover:bg-blue-600`
- Animation: framer-motion, animate: {opacity: 1}, tw-transitions: transition-colors
- State: useState

```tsx
<div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard title="Zamówienia" value={mockData.overview.totalOrders} icon="📋" color="blue" />
              <StatCard title="Przychód" value={`${mockData.overview.revenue.toLocaleString(
```

**CartButton** — `src/components/CartButton.jsx`
- Key Styles: `rounded-full`, `border-cyan-500/30`, `bg-gradient-to-r`, `px-4`, `text-xl`, `font-semibold`, `shadow-lg`, `hover:shadow-[0_0_20px_rgba(0,234,255,0.4)]`
- Animation: framer-motion, transition: {type: 'spring', stiffness: 500, damping: 15}, animate: {scale: 1, opacity: 1}
- State: useState, useRef

```tsx
<motion.button
      onClick={(
```

*...and 29 more layout components.*

### Navigation (28)

**AppErrorBoundary** — `src/components/AppErrorBoundary.jsx`
- Key Styles: `opacity-80`

```tsx
<div style={{ padding:'24px 16px', maxWidth: 860, margin: '92px auto' }}>
          <div className="ff-card" style={{ padding: 16 }}>
            <h2 style={{ marginBottom: 8 }}>Coś poszło nie tak</h2>
            <p className="opacity-80">Spróbuj wrócić na stronę główną.</p>
            <div style={{ marginTop: 12 }}>
              <Link to="/" className="ff-btn ff-btn--primary">Powrót do strony głównej</Link>
            </div>
          </div>
        </div>
```

**BottomTabBar** — `src/components/BottomTabBar.tsx`
- Variants: `food`, `orders`, `home`, `profile`
- Key Styles: `mx-3`, `font-medium`
- Animation: framer-motion, transition: {fabActive ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut'}, animate-presence
- State: useState

**Drawer** — `src/components/Drawer.jsx`
- Props: `children`, `title`
- Animation: framer-motion, transition: {type: 'spring', stiffness: 420, damping: 36}, animate-presence
- State: useRef

**ElectricPanelTest** — `src/components/ElectricPanelTest.tsx`
- Props: `width`, `height`, `radius`, `speed`, `intensity`
- State: useRef

**FreeFunNearby** — `src/components/FreeFunNearby.jsx`
- Key Styles: `rounded-xl`, `border-slate-700`, `bg-slate-900`, `p-4`, `text-lg`, `font-semibold`, `hover:bg-indigo-700`
- State: useState

```tsx
<section className="p-4 bg-slate-900 rounded-xl text-white mt-4 border border-slate-700">
      <h3 className="text-lg font-semibold mb-2">🎉 FreeFun w Twojej okolicy</h3>
      <div className="flex gap-2 mb-2">
        <input className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white" placeholder="Miasto..." value={city} onChange={e=>setCity(e.target.value
```

**FreeFunSection** — `src/components/FreeFunSection.jsx`
- Key Styles: `rounded-lg`, `border-neutral-700`, `bg-neutral-900`, `mx-auto`, `text-2xl`, `font-bold`, `focus:outline-none`
- Animation: framer-motion, transition: {duration: 0.3}, animate-presence
- State: useState

```tsx
<div className="w-full max-w-5xl mx-auto p-6 text-white">
      <h2 className="text-2xl font-bold mb-4 text-indigo-400 flex items-center gap-2">
        🌆 FreeFun — Darmowe wydarzenia w okolicy
      </h2>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Miasto..."
          value={city}
          onChange={(e
```

**MenuButton** — `src/components/MenuButton.jsx`
- Props: `isOpen`, `onToggle`
- Animation: motion-variant: variants={{
            closed: { d: "M 2 2.5 L 20 2.5" }, motion-variant: variants={{
            closed: { opacity: 1 }, motion-variant: variants={{
            closed: { d: "M 2 16.346 L 20 16.346" }

```tsx
<button 
      onClick={onToggle} 
      style={{ 
        background: 'none', 
        border: 'none', 
        cursor: 'pointer', 
        zIndex: 101, // Na wierzchu
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
```

**MenuFlowView.test** — `src/components/MenuFlowView.test.tsx`
- Props: `default`
- State: forwardRef

```tsx
{
    useBottomSheetContext: (
```

*...and 20 more navigation components.*

### Data Display (9)

**AmberControlDeck** — `src/components/admin/AmberControlDeck.jsx`
- Variants: `tts_pitch`
- Props: `adminToken`
- Key Styles: `rounded-full`, `border-[var(--ff-stroke)]`, `bg-red-400/20`, `space-y-6`, `text-xs`, `font-semibold`, `backdrop-blur-sm`, `hover:bg-white/5`
- Animation: tw-animate-pulse, tw-transitions: transition-colors, transition-all
- State: useState

**StatCard** — `src/components/business/StatCard.tsx`
- Props: `icon`, `iconBgColor`, `value`, `label`, `trend`, `trendReversed`

```tsx
<div className="stat-card glass">
            <div className="stat-card__header">
                <div
                    className="stat-card__icon"
                    style={{ background: `${iconBgColor}20`, color: iconBgColor }}
                >
                    {icon}
                </div>
                {trend !== undefined && (
                    <span className={`stat-card__trend ${trendClass}`}>
                        {trendIcon} {Math.abs(trend
```

**StatsWidget** — `src/components/DashboardKit/StatsWidget.tsx`
- Variants: `up`, `down`, `neutral`
- Props: `title`, `value`, `subtitle`, `icon`, `trend`, `trendValue`, `className`
- Key Styles: `rounded-xl`, `border-slate-700`, `bg-slate-800`, `mb-4`, `text-sm`, `font-medium`, `hover:border-slate-600`
- Animation: tw-transitions: transition-colors, duration-200

```tsx
<div
            className={`
        bg-slate-800 border border-slate-700 rounded-xl p-6
        hover:border-slate-600 transition-colors duration-200
        ${className}
      `}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                    {title}
                </span>
```

**StatusBadge** — `src/components/DashboardKit/StatusBadge.tsx`
- Variants: `pending`, `preparing`, `ready`, `delivered`, `cancelled`
- Props: `status`, `className`
- Key Styles: `rounded-full`, `px-3`, `text-sm`, `font-bold`

```tsx
<span
            className={`
        inline-flex items-center px-3 py-1.5
        rounded-full font-bold text-sm uppercase tracking-wide
        ${config.bg} ${config.text}
        ${className}
      `}
        >
            {config.label}
        </span>
```

**StatusToggle** — `src/components/driver/StatusToggle.tsx`
- Props: `isOnline`, `onToggle`
- Key Styles: `rounded-2xl`, `border-white/10`, `gap-2`, `text-xs`, `font-medium`, `shadow-lg`, `select-none`
- Animation: framer-motion, transition: {type: "spring", stiffness: 300, damping: 25}, animate: {x: isOnline ? '0%' : '100%',
                        left: isOnline ? '4px' : 'auto',
                        right: isOnline ? 'auto' : '4px'}

```tsx
<div className="flex flex-col items-center gap-2">
            <motion.button
                onClick={onToggle}
                className={`relative w-48 h-12 rounded-2xl flex items-center px-1 cursor-pointer transition-colors duration-500 shadow-lg border border-white/10 ${isOnline ? 'bg-green-500/20 shadow-green-500/20' : 'bg-red-500/20 shadow-red-500/20'
                    }`}
                whileTap={{ scale: 0.98 }}
            >
                {/* Sliding pill */}
                <motion.div
                    className={`absolute w-[calc(50%-4px
```

**AdminPanel** — `src/pages/AdminPanel.jsx`
- Variants: `insights`, `control`, `STALE`, `learning`, `UNKNOWN`, `0`
- Props: `name`, `price`, `category`, `available`
- Key Styles: `rounded-2xl`, `border-[var(--ff-stroke)]`, `bg-[rgba(255,255,255,0.05)]`, `p-8`, `text-2xl`, `font-sans`, `shadow-2xl`, `cursor-help`
- Animation: tw-animate-spin, tw-animate-pulse, tw-transitions: transition-colors, transition-opacity, transition-shadow, transition-all
- State: useState

**BusinessPanel** — `src/pages/Panel/BusinessPanel.jsx`
- Variants: `delivered`, `pending`, `preparing`, `Klient`
- Props: `status`
- Key Styles: `rounded-full`, `bg-transparent`, `px-2`, `font-semibold`, `hover:opacity-80`
- Animation: tw-transitions: transition-opacity, ease-out, duration-150, ease-in, duration-100, transition-colors
- State: useState

```tsx
<span
      className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}
    >
      {m.label}
    </span>
```

**Leads** — `src/pages/Panel/Leads.jsx`
- Key Styles: `border-white/10`, `gap-3`, `text-sm`, `opacity-80`
- State: useState

```tsx
<div className="grid gap-3">
      <div className="flex items-end gap-2">
        <label className="grid gap-1">
          <span className="text-sm opacity-80">Od</span>
          <input type="date" className="ff-input" value={from} onChange={e=>setFrom(e.target.value
```

*...and 1 more data display components.*

### Data Input (8)

**AuthModal** — `src/components/AuthModal.jsx`
- Props: `onClose`
- Key Styles: `rounded-2xl`, `border-white/20`, `bg-black/80`, `mb-4`, `text-sm`, `font-medium`, `backdrop-blur-md`, `hover:text-white`
- Animation: tw-transitions: transition-opacity, duration-300, transition-all, transition-colors, hover-transforms
- State: useState

```tsx
<>
      {/* Tło (overlay
```

**Cart** — `src/components/Cart.jsx`
- Variants: `vege`, `checkout`
- Props: `name`, `phone`, `address`, `notes`
- Key Styles: `rounded-2xl`, `border-amber-500/15`, `bg-black/60`, `p-4`, `text-2xl`, `font-bold`, `backdrop-blur-sm`, `hover:text-white`
- Animation: framer-motion, transition: {delay: index * 0.05}, animate-presence
- State: useState, useRef

```tsx
<Transition appear show={isCartVisible} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose} initialFocus={closeButtonRef}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
```

**Switch** — `src/components/Switch.tsx`
- Variants: `ready`, `thinking`, `action`, `error`
- Props: `onToggle`, `checked`, `initial`, `amberReady`, `amberStatus`
- State: useState, useRef

**VoiceCommandCenterV2** — `src/components/VoiceCommandCenterV2.tsx`
- Variants: `bar`, `island`
- Props: `amberResponse`, `interimText`, `finalText`, `recording`, `visible`, `onMicClick`, `onTextSubmit`, `value` (+7 more)
- Key Styles: `rounded`, `border-none`, `bg-transparent`, `px-4`, `text-sm`, `font-medium`, `shadow-[0_0_15px_var(--ff-amber-500)]`, `pointer-events-auto`
- Animation: framer-motion, transition: {type: "spring", damping: 25, stiffness: 200}, animate-presence
- State: useState, useRef

```tsx
<AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0, x: "-50%" }}
          animate={{ y: 0, opacity: 1, x: "-50%" }}
          exit={{ y: 100, opacity: 0, x: "-50%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-2 left-[53%] sm:left-1/2 w-[92%] sm:w-[90%] md:w-full max-w-[600px] z-50 transform-gpu vcc-input-wrapper pointer-events-auto"
        >
          <div className="voice-cc-container" data-status={amberStatus === 'listening' ? 'listening' : ''}>
            <div className="voice-cc-inner-container">
              <div className="voice-cc-field">
```

**ClientPanel** — `src/pages/ClientPanel/ClientPanel.tsx`
- Variants: `dashboard`, `food`, `taxi`, `hotels`, `orders`, `payments`, `profile`, `green`, `yellow`, `ready`, `completed`, `pending`, `active`, `success`, `Enter`, `settings`, `blue`, `history`, `Guest`, `New`, `Kuchnia`, `pozycja`
- Props: `userId`
- Key Styles: `rounded-xl`, `border-amber-500/30`, `bg-amber-500/10`, `gap-2`, `text-sm`
- Animation: tw-animate-fade
- State: useState, useRef

**Orders** — `src/pages/Orders.jsx`
- Props: `restaurant_id`, `items`, `customer_name`, `customer_phone`, `delivery_address`, `notes`
- Key Styles: `rounded-full`, `border-indigo-600`, `bg-indigo-600`, `mt-6`, `text-xl`, `font-bold`, `hover:bg-indigo-700`
- Animation: tw-animate-spin, tw-transitions: transition-colors, transition-shadow
- State: useState

```tsx
cents / 100
```

**Profile** — `src/pages/Panel/Profile.jsx`
- Key Styles: `gap-4`

```tsx
<form className="grid gap-4">
      <label className="grid gap-2">
        <span>Imię i nazwisko</span>
        <input className="ff-input" placeholder="Jan Kowalski" />
      </label>
      <label className="grid gap-2">
        <span>E‑mail</span>
        <input type="email" className="ff-input" placeholder="email@domena.com" />
      </label>
      <label className="grid gap-2">
        <span>Telefon</span>
        <input className="ff-input" placeholder="+48..." />
```

**RegisterBusiness** — `src/pages/RegisterBusiness.jsx`
- Props: `name`, `email`, `phone`, `city`, `nip`, `note`
- Key Styles: `rounded-2xl`, `border-white/10`, `bg-slate-900/60`, `mx-auto`, `text-3xl`, `font-extrabold`, `disabled:opacity-50`
- State: useState

```tsx
<div className="mx-auto mt-24 max-w-2xl px-4 pb-20">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white">Rejestracja firmy</h1>
        <p className="mt-2 text-slate-300">Wypełnij formularz, aby dołączyć do naszej platformy.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <Field label="Nazwa firmy *" name="name" value={form.name} onChange={onChange} autoComplete="organization" aria-describedby={err.includes('firmy'
```

### Feedback (6)

**ErrorFallback** — `src/components/ErrorFallback.tsx`
- Key Styles: `rounded-2xl`, `border-white/10`, `bg-white/5`, `p-8`, `text-4xl`, `font-bold`, `backdrop-blur-md`, `hover:bg-brand-600`
- Animation: tw-transitions: transition-colors

```tsx
<div className="flex flex-col items-center justify-center p-8 text-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
            <i className="fas fa-exclamation-triangle text-4xl text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Błąd pobierania danych</h3>
            <p className="text-gray-400 mb-6">{message || 'Nie udało się załadować zawartości strony. Spróbuj ponownie później.'}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-black font-bold rounded-full transition-colors"
                >
                    Spróbuj ponownie
                </button>
```

**AlertsList** — `src/components/galaxy/AlertsList.jsx`
- Props: `alerts`
- Key Styles: `rounded-lg`, `border-l-2`, `bg-white/5`, `mb-4`, `text-sm`, `font-medium`, `shadow-[0_0_8px_currentColor]`, `hover:bg-white/10`
- Animation: tw-transitions: transition-all, hover-transforms

```tsx
<GlassCard className="h-full" glowColor="pink">
      <h3 className="text-gray-300 font-medium mb-4 flex items-center gap-2">
        <i className="ph ph-bell-ringing text-pink-400"></i>
        System Alerts
      </h3>
      <div className="space-y-3">
        {displayAlerts.map(alert => (
          <div
            key={alert.id}
            className="group flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border-l-2 border-transparent transition-all hover:translate-x-1 cursor-pointer"
            style={{
              borderLeftColor:
```

**LoadingScreen** — `src/components/LoadingScreen.jsx`
- Props: `onComplete`
- Key Styles: `rounded-full`, `border-4`, `bg-black`, `gap-12`, `text-lg`, `font-bold`, `opacity-30`, `cursor-pointer`
- Animation: tw-transitions: ease-in-out, transition-all, duration-1000, ease-out, duration-300, hover-transforms
- State: useState, useRef

**Toast** — `src/components/Toast.jsx`
- Props: `children`
- Key Styles: `gap-2`
- State: useState, useContext

```tsx
<ToastCtx.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 top-3 z-[120] flex flex-col items-center gap-2 px-3">
        {toasts.map((t
```

**ToastContext** — `src/components/ToastContext.jsx`

**Toast** — `src/ui/Toast.tsx`

```tsx
<div className="ff-toasts">
      {items.map(t => (
        <div key={t.id} className={`ff-toast ${t.type === 'success' ? 'ff-toast--success' : t.type === 'error' ? 'ff-toast--error' : ''}`}>
          <span>{t.message}</span>
          <button className="ff-toast__close" aria-label="Zamknij" onClick={(
```

### Overlay (25)

**AdvancedFilters** — `src/components/admin/AdvancedFilters.jsx`
- Props: `fromDate`, `toDate`, `intentFilter`, `restaurantFilter`, `onFilterChange`, `restaurants`, `intents`
- Key Styles: `rounded-lg`, `border-white/20`, `bg-white/10`, `px-4`, `text-xs`, `font-semibold`, `backdrop-blur-xl`, `hover:bg-white/15`
- Animation: framer-motion, animate-presence, animate: {opacity: 1, y: 0}
- State: useState

```tsx
<div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={(
```

**ConversationViewer** — `src/components/admin/ConversationViewer.jsx`
- Props: `stage`
- Key Styles: `rounded-full`, `border-[var(--ff-stroke)]`, `bg-[rgba(255,255,255,0.01)]`, `px-8`, `text-xs`, `font-bold`, `opacity-20`, `pointer-events-none`
- Animation: framer-motion, transition: {duration: 0.8, ease: "easeInOut"}, animate-presence
- State: useState

```tsx
<div className="flex items-center justify-between px-8 py-5 bg-[rgba(255,255,255,0.01
```

**ExportButton** — `src/components/admin/ExportButton.jsx`
- Props: `data`, `tableData`, `tableColumns`, `dashboardElementId`, `filename`
- Key Styles: `rounded-lg`, `border-white/20`, `bg-white/10`, `px-4`, `text-sm`, `backdrop-blur-xl`, `hover:bg-white/15`
- Animation: framer-motion, animate-presence, animate: {opacity: 1, y: 0}
- State: useState

```tsx
<div className="relative">
      <button
        onClick={(
```

**ChatBubbles** — `src/components/canonical/ChatBubbles.tsx`
- Props: `userMessage`, `amberResponse`, `restaurants`, `id`, `name`, `cuisine_type`, `city`, `menuItems` (+2 more)
- Key Styles: `px-4`, `text-base`, `font-medium`, `backdrop-blur-xl`, `pointer-events-none`
- Animation: framer-motion, transition: {type: "spring", stiffness: 400, damping: 30}, animate-presence
- State: useState, useRef

```tsx
<div className="fixed top-[100px] bottom-[120px] left-0 right-0 md:left-1/2 md:-translate-x-1/2 
                    w-full max-w-[1000px] px-4 md:px-6 pointer-events-none z-30 flex justify-center">
            <div className="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col gap-6 pb-4
                      scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <AnimatePresence initial={false}>
                    {messages.map((message, index
```

**FreeFlowMenu** — `src/components/canonical/FreeFlowMenu.tsx`
- Variants: `bottom`, `side`, `system`, `settings`, `advanced`, `orders`
- Props: `variant`, `onNavigate`, `route`
- Key Styles: `rounded-full`, `border-r`, `bg-[#0d0d1a]/95`, `p-6`, `text-2xl`, `font-bold`, `backdrop-blur-xl`, `group-hover:bg-fuchsia-500/30`
- Animation: motion-variant: variants={containerVariants}, motion-variant: variants={itemVariants}, motion-variant: variants={subMenuVariants}
- State: useState

```tsx
<motion.div
                className="fixed left-0 top-0 h-full w-80 bg-[#0d0d1a]/95 backdrop-blur-xl text-white border-r border-fuchsia-500/20 z-50"
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
            >
                <div className="p-6">
                    <motion.h2
                        className="text-2xl font-bold bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent mb-8"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
```

**ResultCarousel** — `src/components/canonical/ResultCarousel.tsx`
- Variants: `restaurant`, `menu`, `RESTAURACJA`, `DANIE`
- Props: `items`, `type`, `onItemClick`, `item`
- Key Styles: `rounded-[32px]`, `border-white/[0.08]`, `bg-[#0F0F16]/80`, `mt-4`, `text-xs`, `font-bold`, `backdrop-blur-2xl`, `cursor-pointer`
- Animation: framer-motion, transition: {delay: 0.2, duration: 0.4}, animate-presence
- State: useRef

```tsx
<motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="w-full mt-4 overflow-hidden relative z-10"
        >
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-8 pt-2 px-1 snap-x snap-mandatory 
                         scrollbar-hide mask-gradient"
                style={{
```

**CartBadge** — `src/components/CartBadge.jsx`
- Key Styles: `rounded-lg`, `border-orange-400/20`, `bg-black/20`, `p-4`, `text-xs`, `font-semibold`, `backdrop-blur-xl`, `hover:bg-black/30`
- Animation: framer-motion, transition: {type: 'spring', stiffness: 500, damping: 15}, animate-presence
- State: useState, useRef

**ChatBubbles** — `src/components/ChatBubbles.tsx`
- Props: `userMessage`, `amberResponse`, `restaurants`, `id`, `name`, `cuisine_type`, `city`, `menuItems` (+2 more)
- Key Styles: `px-4`, `text-base`, `font-medium`, `backdrop-blur-xl`, `pointer-events-none`
- Animation: framer-motion, transition: {type: "spring", stiffness: 400, damping: 30}, animate-presence
- State: useState, useRef

```tsx
<div className="fixed top-[100px] bottom-[120px] left-0 right-0 md:left-1/2 md:-translate-x-1/2 
                    w-full max-w-[1000px] px-4 md:px-6 pointer-events-none z-30 flex justify-center">
      <div className="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col gap-6 pb-4
                      scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <AnimatePresence initial={false}>
          {messages.map((message, index
```

*...and 17 more overlay components.*

### Media (1)

**LogoFreeFlow** — `src/components/LogoFreeFlow.jsx`
- Key Styles: `drop-shadow-[0_0_22px_rgba(255,145,0,0.18)]`, `select-none`

```tsx
<div className="flex items-center" aria-label="FreeFlow">
      <img
        src={logoPng}
        alt="FreeFlow"
        className="h-auto w-[min(15rem,58vw
```

### Other (38)

**ActionTiles** — `src/components/ActionTiles.jsx`
- Animation: framer-motion, transition: {type: "spring", stiffness: 200, damping: 15}

```tsx
<div className="tiles-container">
      {tiles.map((tile
```

**LiveHealthPanel** — `src/components/admin/LiveHealthPanel.jsx`
- Variants: `0`
- Props: `adminToken`
- Key Styles: `p-4`, `text-sm`
- State: useState, useRef

**AmberCore** — `src/components/AmberCore.tsx`
- Variants: `idle`, `listening`, `thinking`, `speaking`, `presenting`, `error`

```tsx
<svg
      width="100%"
      height="100%"
      viewBox="0 0 200 200"
      style={{ display: "block" }}
      className={className}
    >
      <defs>
        <filter id="amber-energy">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={s.freq}
```

**ActiveOrdersList** — `src/components/business/ActiveOrdersList.tsx`
- Props: `orders`, `onViewAll`

```tsx
<div className="orders-list">
                <div className="orders-list__header">
                    <h3 className="orders-list__title">Aktywne zamówienia</h3>
                </div>
                <div className="orders-list__empty">
                    <span className="orders-list__empty-icon">--</span>
                    <p>Brak aktywnych zamówień</p>
                </div>
            </div>
```

**ChannelBreakdownCard** — `src/components/business/ChannelBreakdownCard.tsx`
- Props: `data`

```tsx
<div className="channel-card glass">
            <h3 className="channel-card__title">Zamówienia wg kanału</h3>

            <div className="channel-card__bars">
                {channels.map(channel => (
                    <div key={channel.key} className="channel-bar">
                        <div className="channel-bar__header">
                            <span className="channel-bar__label">
                                <span className="channel-bar__icon">{channel.icon}</span>
                                {channel.label}
                            </span>
                            <span className="channel-bar__percentage">{channel.percentage}%</span>
```

**ContextualIsland** — `src/components/ContextualIsland.tsx`
- Variants: `restaurant`, `left`, `menu`, `right`, `item`
- Props: `items`, `type`, `position`, `onSelect`, `item`, `highlightedId`, `setHighlightedId`, `id` (+8 more)

```tsx
<BottomSheetContainer {...sheetProps}>
                {({ snap, setSnap }
```

**DebugPanel** — `src/components/DebugPanel.tsx`
- Variants: `controls`, `logs`, `state`, `export`
- Props: `x`, `y`
- State: useState, useRef

**DriverMap** — `src/components/driver/DriverMap.tsx`
- Props: `isOnline`
- Key Styles: `rounded-2xl`, `bg-[#1e1e1e]`
- Animation: tw-animate-pulse, tw-transitions: ease-in-out
- State: useState

```tsx
<GoogleMap
            mapContainerStyle={currentContainerStyle}
            center={center}
            zoom={13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={mapOptions}
        >
            {/* Heatmap Layer - Only show when Online? Or always show to entice? Keeping always for now, but grayscale handles the "offline" look */}
            {heatmapData.length > 0 && (
                <HeatmapLayer
                    data={heatmapData}
```

*...and 30 more other components.*



---

## 5. Layout Principles

- **Base spacing unit:** 4px
- **Spacing scale:** 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24
- **Border radius:** 0 0.5rem 0.5rem 0, 0.25rem, 0.375rem, 0.5rem, 0.625rem, 0.75rem, 1rem, 1.25rem, 2px, 3px, 4px, 6px, 8px, 10px, 12px, 14px, 16px, 20px, 24px, 24px 24px 0 0, 28px 28px 0 0, 30px 30px 0 0, 40px, 99px, 999px, inherit
- **Max content width:** 1024px
- **Grid usage:** `grid-cols-3`, `grid-cols-2`, `grid-cols-1`, `grid-cols-12`
- **Container:** Tailwind `container` class with responsive padding

**Spacing as Meaning:**
| Spacing | Use |
|---|---|
| 4-8px | Tight: related items within a group |
| 12-16px | Medium: between groups |
| 24-32px | Wide: between sections |
| 48px+ | Vast: major section breaks |


---

## 6. Depth & Elevation

### Flat — subtle depth hints

- `0 0 0 2px rgba(255,122,28,0.2)`
- `0 0 0 2px rgba(255,122,28,0.3)`
- `0 0 0 1px rgba(255,255,255,0.1) inset`

### Raised — cards, buttons, interactive elements

- **ff-card:** `var(--ff-shadow-card)`
- **ff-glow-amber:** `var(--ff-glow-amber)`
- **ff-glow-teal:** `var(--ff-glow-teal)`

### Floating — dropdowns, popovers, modals

- `0 0 15px rgba(255,100,220,0.3),0 0 15px rgba(120,100,255,0.3)`
- `0 0 15px rgba(120,100,255,0.5)`
- `0 0 20px rgba(0,255,255,0.4)`

### Overlay — full-screen overlays, top-level dialogs

- `0 8px 32px rgba(0,0,0,0.3),0 0 0 1px rgba(255,255,255,0.05)`
- `0 12px 40px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.1)`
- `0 0 30px rgba(255,102,0,0.5)`

### Z-Index Scale

`0, 1, 2, 3, 4, 5, 10, 25, 30, 40, 46, 48, 50, 51, 55, 60, 62, 100, 101, 200, 1000, 1001, 9000`



---

## 7. Animation & Motion

This project uses **expressive motion**. Animations are an integral part of the experience.

### Framer Motion Patterns

```tsx
// Standard enter animation
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
/>

// List stagger
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } }
}
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 }
}
```

### CSS Animations

- `@keyframes pulse`
- `@keyframes particleFloat`
- `@keyframes rotate`
- `@keyframes ambientLight`
- `@keyframes slideUp`
- `@keyframes fadeInUp`
- `@keyframes container-pulse`
- `@keyframes float-rotate`

### Animated Components

- **ActionTiles**: framer-motion, transition: {type: "spring", stiffness: 200, damping: 15}
- **AdvancedFilters**: framer-motion, animate-presence, animate: {opacity: 1, y: 0}
- **AmberControlDeck**: tw-animate-pulse, tw-transitions: transition-colors, transition-all
- **ComparisonMode**: framer-motion, animate: {opacity: 1, y: 0}, tw-transitions: transition-all
- **ConversationDebugView**: tw-transitions: transition-colors

### Motion Guidelines

- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for enters, `ease-in` for exits
- Always respect `prefers-reduced-motion`


---

## 8. Do's and Don'ts

### Do's

- Use `#ff7e00` for interactive elements (buttons, links, focus rings)
- Use `#ffffff` as the primary page background
- Pair **inherit** (body) with **Orbitron** (display) — these are the only allowed fonts
- Follow the **4px** spacing grid for all margins, padding, and gaps
- Use the defined shadow tokens for elevation — see Section 6
- Use border-radius from the scale: 0 0.5rem 0.5rem 0, 0.25rem, 0.375rem, 0.5rem, 0.625rem
- Reuse existing components from Section 4 before creating new ones
- Use **Lucide** for all icons

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't introduce additional font families beyond inherit and Orbitron
- Don't use arbitrary spacing values — stick to multiples of 4px
- Don't create custom box-shadow values outside the system tokens
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't duplicate component patterns — check Section 4 first
- Don't mix icon libraries — consistency matters


---

## 9. Responsive Behavior

| Name | Value | Source |
|---|---|---|
| sm | 640px | tailwind |
| md | 768px | tailwind |
| breakpoint-769px | 769px | css |
| lg | 1024px | tailwind |
| breakpoint-1025px | 1025px | css |
| xl | 1280px | tailwind |
| 2xl | 1536px | tailwind |

**Approach:** Mobile-first using Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`).
Always design for mobile first, then layer on responsive overrides.


---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #ffffff
Border: 1px solid var(--border)
Radius: 10px
Padding: 16px
Font: inherit
Use shadow tokens from Section 6.
```

### Build a Button

```
Primary: bg #ff7e00, text white
Ghost: bg transparent, border var(--border)
Padding: 8px 16px
Radius: 10px
Hover: opacity 0.9 or lighter shade
Focus: ring with #ff7e00
```

### Build a Page Layout

```
Background: #ffffff
Max-width: 1024px, centered
Grid: 4px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #ffffff
Label: var(--text-muted) (muted, 12px, uppercase)
Value: #010101 (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #ffffff
Input border: 1px solid var(--border)
Focus: border-color #ff7e00
Label: var(--text-muted) 12px
Spacing: 16px between fields
Radius: 10px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: inherit, type scale from Section 3
4. Spacing: 4px grid
5. Components: match patterns from Section 4
6. Elevation: shadow tokens
```
