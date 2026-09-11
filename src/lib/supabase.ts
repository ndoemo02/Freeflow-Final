import { createClient } from '@supabase/supabase-js';

/**
 * Klient jest PRZYPIETY do jednego projektu Supabase.
 *
 * Przepiete na nowa baze w P5 (2026-08-20): `ezemaacyyvbpjlagchds` (eu-west-3)
 * -> `vvzpykgiyotgvaorpoqs` (eu-central-1).
 *
 * `resolveSupabaseUrl` ponizej ODRZUCA `VITE_SUPABASE_URL` wskazujacy na inny
 * projekt i wraca do wartosci domyslnej. To jest zabezpieczenie przed cicha
 * zmiana bazy przez zle ustawiona zmienna — nie przeszkoda do usuniecia.
 *
 * UWAGA PRZY KOLEJNEJ MIGRACJI: samo ustawienie `VITE_SUPABASE_URL` NIE
 * przepnie frontendu. Trzeba zmienic te dwie stale i fallback klucza nizej,
 * inaczej guard zwroci `env_mismatch` i aplikacja pojedzie po staremu,
 * zostawiajac po sobie tylko ostrzezenie w konsoli.
 */
const DEFAULT_SUPABASE_URL = 'https://vvzpykgiyotgvaorpoqs.supabase.co';
const EXPECTED_PROJECT_REF = 'vvzpykgiyotgvaorpoqs';

type SupabaseUrlResolution = {
  url: string;
  source: 'env' | 'fallback' | 'env_mismatch';
  reason?: string;
};

export function resolveSupabaseUrl(rawUrl?: string): SupabaseUrlResolution {
  const normalizedRaw = String(rawUrl || '').trim();
  if (!normalizedRaw) {
    return { url: DEFAULT_SUPABASE_URL, source: 'fallback', reason: 'missing_env' };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalizedRaw);
  } catch {
    return { url: DEFAULT_SUPABASE_URL, source: 'fallback', reason: 'invalid_env_url' };
  }

  const projectRef = parsed.hostname.split('.')[0]?.toLowerCase() || '';
  const normalizedOrigin = parsed.origin.replace(/\/+$/, '');
  if (projectRef === EXPECTED_PROJECT_REF) {
    return { url: normalizedOrigin, source: 'env' };
  }

  return {
    url: DEFAULT_SUPABASE_URL,
    source: 'env_mismatch',
    reason: `project_ref_mismatch:${projectRef || 'unknown'}`,
  };
}

const resolvedSupabase = resolveSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseUrl = resolvedSupabase.url;
// Fallback klucza musi wskazywac na TEN SAM projekt co DEFAULT_SUPABASE_URL —
// inaczej brak `VITE_SUPABASE_ANON_KEY` daje URL nowej bazy z kluczem starej
// i kazde zadanie konczy sie bledem uwierzytelnienia zamiast czytelna awaria.
// Klucz `anon` jest PUBLICZNY z definicji (trafia do bundla przegladarki);
// dostep ogranicza RLS i granty, nie tajnosc tej wartosci.
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2enB5a2dpeW90Z3Zhb3Jwb3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMjU5MjMsImV4cCI6MjEwMjYwMTkyM30.gEZTyAoMqojJpeF0iy8W_8ThDFmpI7I7iVSikZRIR_M';

export const SUPABASE_RUNTIME = {
  url: supabaseUrl,
  expectedProjectRef: EXPECTED_PROJECT_REF,
  source: resolvedSupabase.source,
  reason: resolvedSupabase.reason || null,
};

if (resolvedSupabase.source !== 'env' && typeof window !== 'undefined') {
  console.warn('[SUPABASE_URL_GUARD]', {
    source: resolvedSupabase.source,
    reason: resolvedSupabase.reason || null,
    runtimeUrl: supabaseUrl,
  });
}

// Singleton instance to avoid multiple GoTrue clients under same storage key
const g: any = globalThis as any;
export const supabase =
  g.__freeflow_supabase__ ||
  createClient(supabaseUrl, supabaseKey, {
    auth: {
      storageKey: 'freeflow-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

if (!g.__freeflow_supabase__) g.__freeflow_supabase__ = supabase;

/** Bieżący Supabase access_token (JWT) do nagłówka Authorization: Bearer dla
 * backendowych endpointów owner-scoped (np. GET /api/owner/restaurants). */
export async function getAccessToken(expectedUserId?: string): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (expectedUserId && data.session?.user?.id !== expectedUserId) return null;
  return data.session?.access_token ?? null;
}

