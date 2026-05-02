function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isPrivateIpv4Host(hostname: string): boolean {
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  const d = Number(m[4]);
  if ([a, b, c, d].some((x) => !Number.isFinite(x) || x < 0 || x > 255)) return false;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function shouldUseDevProxy(hostname: string): boolean {
  return isLoopbackHost(hostname) || isPrivateIpv4Host(hostname) || isTunnelHost(hostname);
}

function isTunnelHost(hostname: string): boolean {
  return hostname.includes('trycloudflare.com')
    || hostname.includes('ngrok-free.dev')
    || hostname.includes('ngrok.io')
    || hostname.includes('ngrok.app');
}

function isAbsoluteNetworkUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^wss?:\/\//i.test(value);
}

function normalizeLoopbackUrlForClient(value: string): string {
  if (!value || typeof window === 'undefined' || !isAbsoluteNetworkUrl(value)) return value;
  const currentHost = window.location.hostname;
  const isCurrentLoopback = isLoopbackHost(currentHost);
  const isCurrentLan = isPrivateIpv4Host(currentHost);
  const isCurrentTunnel = isTunnelHost(currentHost);
  if (!isCurrentLoopback && !isCurrentLan && !isCurrentTunnel) return value;
  try {
    const parsed = new URL(value);
    const targetIsLocal = isLoopbackHost(parsed.hostname) || isPrivateIpv4Host(parsed.hostname);
    if (!targetIsLocal) return value;
    if (isCurrentLoopback) {
      // On localhost, rewrite any private/LAN target to localhost so
      // direct connections work (e.g. 192.168.x.x → localhost).
      parsed.hostname = 'localhost';
    } else {
      parsed.hostname = currentHost;
      if (isCurrentTunnel) {
        // Tunnel hosts terminate on their default ports (443/80), keep URL without :3000.
        parsed.port = '';
      }
    }
    if (window.location.protocol === 'https:') {
      if (parsed.protocol === 'http:') parsed.protocol = 'https:';
      if (parsed.protocol === 'ws:') parsed.protocol = 'wss:';
    }
    return parsed.toString();
  } catch {
    return value;
  }
}

const detectBackend = () => {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    // Local dev on localhost/LAN/tunnel: keep relative paths so Vite proxy handles routing.
    if (shouldUseDevProxy(h)) {
      return '';
    }
  }
  // Production backend URL
  return 'https://backend-one-gilt-89.vercel.app';
};

export const CONFIG = {
  BACKEND_URL: normalizeLoopbackUrlForClient(String(import.meta.env.VITE_BACKEND_URL || detectBackend()).trim()),
  LIVE_WS_URL: normalizeLoopbackUrlForClient(String(import.meta.env.VITE_LIVE_WS_URL || '').trim()),
  LIVE_HTTP_URL: normalizeLoopbackUrlForClient(String(import.meta.env.VITE_LIVE_HTTP_URL || '').trim()),

  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,

  APP_MODE: import.meta.env.MODE || 'development',
  DEBUG: import.meta.env.DEV || String(import.meta.env.VITE_DEBUG || '').toLowerCase() === 'true',

  AMBER_LOGS: import.meta.env.DEV || String(import.meta.env.VITE_AMBER_LOGS || '').toLowerCase() === 'true',
  AMBER_BRAIN: import.meta.env.DEV || String(import.meta.env.VITE_AMBER_BRAIN || '').toLowerCase() === 'true',
  USE_BRAIN_V2: true, // Switch to modular pipeline (ETAP 6 Substitution)
};

function toWsBase(value: string): string | null {
  if (!value || !isAbsoluteNetworkUrl(value)) return null;
  if (/^wss?:\/\//i.test(value)) return value.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(value)) {
    return value
      .replace(/^http:\/\//i, 'ws://')
      .replace(/^https:\/\//i, 'wss://')
      .replace(/\/+$/, '');
  }
  return null;
}

export function resolveLiveWsBase(): { base: string | null; source: string } {
  const fromLiveWsEnv = toWsBase(CONFIG.LIVE_WS_URL);
  if (fromLiveWsEnv) {
    // Blacklist: Railway URLs nie działają po migracji na Vercel
    if (/railway\.app/i.test(fromLiveWsEnv)) {
      console.warn('[config] ⛔ Railway WS URL odrzucony — używam HTTP fallback (Vercel)');
      return { base: null, source: 'blocked:railway' };
    }
    return { base: fromLiveWsEnv, source: 'env:VITE_LIVE_WS_URL' };
  }

  const fromLiveHttpEnv = toWsBase(CONFIG.LIVE_HTTP_URL);
  if (fromLiveHttpEnv) {
    if (/railway\.app/i.test(fromLiveHttpEnv)) {
      console.warn('[config] ⛔ Railway HTTP URL odrzucony — używam HTTP fallback (Vercel)');
      return { base: null, source: 'blocked:railway' };
    }
    return { base: fromLiveHttpEnv, source: 'env:VITE_LIVE_HTTP_URL' };
  }

  const backendEnv = normalizeLoopbackUrlForClient(String(import.meta.env.VITE_BACKEND_URL || '').trim());
  const fromBackendEnv = toWsBase(backendEnv);
  if (fromBackendEnv) {
    if (/railway\.app/i.test(fromBackendEnv)) {
      console.warn('[config] ⛔ Railway backend URL odrzucony — używam HTTP fallback (Vercel)');
      return { base: null, source: 'blocked:railway' };
    }
    return { base: fromBackendEnv, source: 'env:VITE_BACKEND_URL' };
  }

  const fromDetectedBackend = toWsBase(CONFIG.BACKEND_URL);
  if (fromDetectedBackend) {
    return { base: fromDetectedBackend, source: 'config:BACKEND_URL' };
  }

  if (import.meta.env.DEV) {
    // Explicit dev default: backend service, never frontend origin.
    const devDefault = toWsBase(normalizeLoopbackUrlForClient('ws://localhost:3000'));
    return { base: devDefault, source: 'dev-default:localhost:3000' };
  }

  return { base: null, source: 'missing_live_ws_config' };
}

export function getApiUrl(path: string): string {
  let baseUrl = normalizeLoopbackUrlForClient(CONFIG.BACKEND_URL);

  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    // For localhost/LAN/tunnel dev, keep relative paths and use Vite proxy.
    if (shouldUseDevProxy(h)) {
      baseUrl = '';
    }
  }

  const safeBase = baseUrl.replace(/\/+$/, '');
  const safePath = path.replace(/^\/+/, '');
  const url = safeBase ? `${safeBase}/${safePath}` : `/${safePath}`;

  if (CONFIG.DEBUG) {
    console.log('[config] getApiUrl:', {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
      baseUrl,
      path,
      finalUrl: url,
    });
  }

  return url;
}

// Feature flags
export const ENABLE_IMMERSIVE_MODE: boolean =
  String(import.meta.env.VITE_IMMERSIVE_MODE || '').toLowerCase() === 'true';
