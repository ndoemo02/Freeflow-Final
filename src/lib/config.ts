const detectBackend = () => {
  // Lokalnie kieruj na port 3000 jeśli brak env
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    // Jeśli jesteśmy na Cloudflare tunnel, używaj względnych ścieżek (Vite proxy)
    if (h.includes('trycloudflare.com')) {
      return ''; // Pusty string = względne ścieżki, używa Vite proxy
    }
    if (h === 'localhost' || h === '127.0.0.1') {
      return 'http://localhost:3000';
    }
  }
  return 'https://backend-hrth4zsvt-freeflow-build.vercel.app';
};

export const CONFIG = {
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || detectBackend(),

  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,

  APP_MODE: import.meta.env.MODE || "development",
  DEBUG: true,

  AMBER_LOGS: true,
  AMBER_BRAIN: true,
  USE_BRAIN_V2: true, // Switch to modular pipeline (ETAP 6 Substitution)
};

export function getApiUrl(path: string): string {
  // Sprawdź aktualny hostname (dla Cloudflare tunnel)
  let baseUrl = CONFIG.BACKEND_URL;

  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    // Jeśli jesteśmy na Cloudflare tunnel, używaj względnych ścieżek (Vite proxy)
    if (h.includes('trycloudflare.com')) {
      baseUrl = ''; // Pusty string = względne ścieżki, używa Vite proxy
    }
  }

  // Remove trailing slashes from baseUrl
  const safeBase = baseUrl.replace(/\/+$/, '');
  // Remove leading slashes from path
  const safePath = path.replace(/^\/+/, '');

  // Join with single slash, or just return path if base is empty
  const url = safeBase ? `${safeBase}/${safePath}` : `/${safePath}`;

  if (CONFIG.DEBUG) {
    console.log('🔗 getApiUrl:', { hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A', baseUrl, path, finalUrl: url });
  }

  return url;
}

// Feature flags
// Używamy standardu Vite: VITE_* w .env/.env.local
export const ENABLE_IMMERSIVE_MODE: boolean =
  String(import.meta.env.VITE_IMMERSIVE_MODE || '').toLowerCase() === 'true';