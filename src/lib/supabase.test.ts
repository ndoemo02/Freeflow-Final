import { describe, expect, it } from 'vitest';
import { resolveSupabaseUrl } from './supabase';

/**
 * Guard `resolveSupabaseUrl` przypina klient do JEDNEGO projektu Supabase.
 * Przepiety na nowa baze `vvzpykgiyotgvaorpoqs` w P5 (2026-08-20).
 *
 * Guard NIE jest przeszkoda do usuniecia — jest zabezpieczeniem przed cicha
 * zmiana bazy przez zla zmienna srodowiskowa. Przy kolejnej migracji przestawic
 * `EXPECTED_PROJECT_REF` i `DEFAULT_SUPABASE_URL`, nie kasowac logiki.
 */
const NOWA = 'https://vvzpykgiyotgvaorpoqs.supabase.co';
const STARA = 'https://ezemaacyyvbpjlagchds.supabase.co';

describe('resolveSupabaseUrl', () => {
  it('uses env URL when project ref is expected', () => {
    const result = resolveSupabaseUrl(NOWA);
    expect(result.url).toBe(NOWA);
    expect(result.source).toBe('env');
  });

  it('odrzuca STARA baze — przepiecie ma byc nieodwracalne przez sama zmienna', () => {
    const result = resolveSupabaseUrl(STARA);
    expect(result.url).toBe(NOWA);
    expect(result.source).toBe('env_mismatch');
    expect(result.reason).toContain('ezemaacyyvbpjlagchds');
  });

  it('falls back when env points to a different project', () => {
    const result = resolveSupabaseUrl('https://xdhlztmjktminrwmzcpl.supabase.co');
    expect(result.url).toBe(NOWA);
    expect(result.source).toBe('env_mismatch');
    expect(result.reason).toContain('project_ref_mismatch');
  });

  it('falls back when env is missing', () => {
    const result = resolveSupabaseUrl('');
    expect(result.url).toBe(NOWA);
    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('missing_env');
  });

  it('falls back when env is not a valid URL', () => {
    const result = resolveSupabaseUrl('nie-jest-urlem');
    expect(result.url).toBe(NOWA);
    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('invalid_env_url');
  });
});
