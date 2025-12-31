/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // FreeFlow Brand Colors
        freeflow: {
          orange: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#f97316', // Primary orange
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
          },
          purple: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7', // Primary purple
            600: '#9333ea',
            700: '#7e22ce',
            800: '#6b21a8',
            900: '#581c87',
          },
          blue: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6', // Primary blue
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
          },
          cyan: {
            50: '#ecfeff',
            100: '#cffafe',
            200: '#a5f3fc',
            300: '#67e8f9',
            400: '#22d3ee',
            500: '#06b6d4', // Primary cyan
            600: '#0891b2',
            700: '#0e7490',
            800: '#155e75',
            900: '#164e63',
          },
        },
      },
      fontFamily: {
        // FreeFlow Fonts
        orbitron: ['Orbitron', 'sans-serif'],
        'space-grotesk': ['Space Grotesk', 'sans-serif'],
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        // FreeFlow Gradients
        'gradient-freeflow': 'linear-gradient(135deg, #f97316 0%, #a855f7 50%, #3b82f6 100%)',
        'gradient-freeflow-reverse': 'linear-gradient(135deg, #3b82f6 0%, #a855f7 50%, #f97316 100%)',
        'gradient-neon': 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
        'gradient-cyber': 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
      },
      boxShadow: {
        // FreeFlow Shadows
        neon: "0 0 20px rgba(0,255,255,0.4), 0 0 40px rgba(140,0,255,0.3)",
        'neon-orange': '0 0 20px rgba(249, 115, 22, 0.5)',
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.5)',
        'neon-blue': '0 0 20px rgba(59, 130, 246, 0.5)',
        'neon-cyan': '0 0 20px rgba(6, 182, 212, 0.5)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'floatIn': 'floatIn 0.35s ease-out forwards',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(249, 115, 22, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(249, 115, 22, 0.8)' },
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
