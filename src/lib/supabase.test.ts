import { describe, expect, it } from 'vitest';
import { resolveSupabaseUrl } from './supabase';

describe('resolveSupabaseUrl', () => {
  it('uses env URL when project ref is expected', () => {
    const result = resolveSupabaseUrl('https://ezemaacyyvbpjlagchds.supabase.co');
    expect(result.url).toBe('https://ezemaacyyvbpjlagchds.supabase.co');
    expect(result.source).toBe('env');
  });

  it('falls back when env points to a different project', () => {
    const result = resolveSupabaseUrl('https://xdhlztmjktminrwmzcpl.supabase.co');
    expect(result.url).toBe('https://ezemaacyyvbpjlagchds.supabase.co');
    expect(result.source).toBe('env_mismatch');
    expect(result.reason).toContain('project_ref_mismatch');
  });

  it('falls back when env is missing', () => {
    const result = resolveSupabaseUrl('');
    expect(result.url).toBe('https://ezemaacyyvbpjlagchds.supabase.co');
    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('missing_env');
  });
});
