/**
 * FreeFlow — rozszerzenie Tailwind (Tailwind 3.3.x)
 * Użycie w tailwind.config.js:
 *
 *   const freeflow = require('./freeflow-tailwind.cjs');
 *   module.exports = {
 *     content: ['./index.html', './src/**\/*.{ts,tsx}'],
 *     theme: { extend: freeflow },
 *   };
 *
 * Wszystkie wartości wskazują na zmienne z freeflow-tokens.css,
 * więc zmiana koloru w jednym miejscu przemalowuje całą aplikację.
 */
module.exports = {
  colors: {
    ff: {
      amber: {
        DEFAULT: 'var(--ff-amber-500)',
        400: 'var(--ff-amber-400)',
        600: 'var(--ff-amber-600)',
      },
      gold: 'var(--ff-gold-400)',
      teal: {
        DEFAULT: 'var(--ff-teal-400)',
        300: 'var(--ff-teal-300)',
      },
      bg: {
        0: 'var(--ff-bg-0)',
        1: 'var(--ff-bg-1)',
      },
      glass: 'var(--ff-glass)',
      'glass-strong': 'var(--ff-glass-strong)',
      stroke: 'var(--ff-stroke)',
      text: {
        1: 'var(--ff-text-1)',
        2: 'var(--ff-text-2)',
        3: 'var(--ff-text-3)',
      },
      status: {
        new: 'var(--ff-status-new)',
        pending: 'var(--ff-status-pending)',
        progress: 'var(--ff-status-progress)',
        ready: 'var(--ff-status-ready)',
        error: 'var(--ff-status-error)',
      },
    },
  },
  fontFamily: {
    ui: 'var(--ff-font-ui)',
    display: 'var(--ff-font-display)',
  },
  fontSize: {
    eyebrow: ['var(--ff-text-eyebrow)', { letterSpacing: 'var(--ff-track-eyebrow)' }],
    price: ['var(--ff-text-price)', { fontWeight: '700' }],
  },
  borderRadius: {
    card: 'var(--ff-radius-card)',
    chip: 'var(--ff-radius-chip)',
    btn: 'var(--ff-radius-btn)',
  },
  backdropBlur: {
    ff: 'var(--ff-blur)',
  },
  boxShadow: {
    'ff-card': 'var(--ff-shadow-card)',
    'ff-glow-amber': 'var(--ff-glow-amber)',
    'ff-glow-teal': 'var(--ff-glow-teal)',
  },
  transitionDuration: {
    fast: 'var(--ff-dur-fast)',
    base: 'var(--ff-dur-base)',
    reorder: 'var(--ff-dur-reorder)',
  },
  transitionTimingFunction: {
    'ff-out': 'var(--ff-ease-out)',
    'ff-spring': 'var(--ff-ease-spring)',
  },
};
