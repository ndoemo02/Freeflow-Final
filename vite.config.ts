import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 🎮 Wymusza pre-bundling Three.js (naprawia błąd 504 Outdated Optimize Dep)
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true, // 💡 nie zmienia portu automatycznie (lepsza stabilność)
    allowedHosts: true, // 🔓 Akceptuje wszystkie hosty (wygodne dla Cloudflare tunnel w dev)
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 🔗 backend Express
        changeOrigin: true, // 🧠 zmienia nagłówek Host → backend akceptuje żądanie
        secure: false,      // 🔓 pozwala na HTTP (bez SSL)
        ws: true,           // 🔌 proxy WebSocket upgrades (required for /api/voice/live/ws)
        rewrite: (path) => path.replace(/^\/api/, '/api'), // 🔁 zachowuje ścieżkę
      },
    },
  },
  preview: {
    port: 4173, // 🔮 opcjonalnie, do build preview
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    include: ['tests/**/*.{test,spec}.{js,jsx,ts,tsx}', 'src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
        'dist/',
        '**/*.d.ts',
      ],
    },
  },
});
