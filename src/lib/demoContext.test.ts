import { describe, expect, it } from 'vitest';
import {
  createDemoContext,
  DEMO_CONTEXT_STORAGE_KEY,
  DEFAULT_DEMO_CONTEXT,
  isDemoLocale,
  isDemoScenarioId,
  resolveBrowserDemoContext,
  toDemoContextPayload,
} from './demoContext';

describe('demoContext', () => {
  it('preserves the current Piekary flow when no context is provided', () => {
    expect(createDemoContext()).toEqual(DEFAULT_DEMO_CONTEXT);
  });

  it('creates the Krakow tourist context without changing the default language', () => {
    expect(createDemoContext({
      scenarioId: 'krakow-tourist',
      preferredLocale: 'pl',
      source: 'launch',
    })).toEqual({
      scenarioId: 'krakow-tourist',
      preferredLocale: 'pl',
      source: 'launch',
    });
  });

  it('accepts English as a supported conversation preference', () => {
    expect(isDemoLocale('en')).toBe(true);
    expect(createDemoContext({ preferredLocale: 'en' }).preferredLocale).toBe('en');
  });

  it('rejects an explicit unknown scenario instead of silently changing city', () => {
    expect(isDemoScenarioId('warsaw-tourist')).toBe(false);
    expect(() => createDemoContext({
      scenarioId: 'warsaw-tourist' as never,
    })).toThrow('Unsupported demo scenario');
  });

  it('selects and persists the Krakow tourist context from the URL', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
    };

    const context = resolveBrowserDemoContext({
      search: '?scenario=krakow-tourist&locale=en',
      storage,
    });

    expect(context).toEqual({
      scenarioId: 'krakow-tourist',
      preferredLocale: 'en',
      source: 'query',
    });
    expect(data.get(DEMO_CONTEXT_STORAGE_KEY)).toContain('krakow-tourist');
  });

  it('restores and serializes a persisted context', () => {
    const context = resolveBrowserDemoContext({
      search: '',
      storage: {
        getItem: () => JSON.stringify({
          scenarioId: 'krakow-tourist',
          preferredLocale: 'pl',
        }),
        setItem: () => undefined,
      },
    });

    expect(context.source).toBe('persisted');
    expect(toDemoContextPayload(context)).toEqual({
      scenario_id: 'krakow-tourist',
      preferred_locale: 'pl',
      source: 'persisted',
    });
  });

  it('rejects an unsupported explicit URL scenario', () => {
    expect(() => resolveBrowserDemoContext({
      search: '?scenario=unknown-city',
      storage: {
        getItem: () => null,
        setItem: () => undefined,
      },
    })).toThrow('Unsupported demo scenario');
  });
});
