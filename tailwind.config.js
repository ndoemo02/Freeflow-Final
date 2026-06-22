/** @type {import('tailwindcss').Config} */
const freeflow = require('./freeflow-tailwind.cjs');

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      ...freeflow,
      fontFamily: {
        ...freeflow.fontFamily,
        orbitron: ['Orbitron', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-freeflow': 'linear-gradient(135deg, var(--ff-amber-500) 0%, #a855f7 50%, #3b82f6 100%)',
        'gradient-freeflow-reverse': 'linear-gradient(135deg, #3b82f6 0%, #a855f7 50%, var(--ff-amber-500) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'floatIn': 'floatIn 0.35s ease-out forwards',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 122, 28, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 122, 28, 0.8)' },
        },
        floatIn: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
