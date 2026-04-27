import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ezemaacyyvbpjlagchds.supabase.co';
const EXPECTED_PROJECT_REF = 'ezemaacyyvbpjlagchds';

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
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZW1hYWN5eXZicGpsYWdjaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODU1MzYsImV4cCI6MjA3NTM2MTUzNn0.uRKmqxL0Isx3DmOxmgc_zPwG5foYXft9WpIROoTTgGU';

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

