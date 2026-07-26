export const DEMO_SCENARIO_IDS = ['piekary-local', 'krakow-tourist'] as const;
export const DEMO_LOCALES = ['pl', 'en'] as const;
export const DEMO_CONTEXT_SOURCES = ['default', 'launch', 'query', 'persisted'] as const;
export const DEMO_CONTEXT_STORAGE_KEY = 'ff-demo-context-v1';

export type DemoScenarioId = (typeof DEMO_SCENARIO_IDS)[number];
export type DemoLocale = (typeof DEMO_LOCALES)[number];
export type DemoContextSource = (typeof DEMO_CONTEXT_SOURCES)[number];

export interface DemoContext {
  scenarioId: DemoScenarioId;
  preferredLocale: DemoLocale;
  source: DemoContextSource;
}

export interface DemoContextPayload {
  scenario_id: DemoScenarioId;
  preferred_locale: DemoLocale;
  source: DemoContextSource;
}

export const DEFAULT_DEMO_CONTEXT: Readonly<DemoContext> = Object.freeze({
  scenarioId: 'piekary-local',
  preferredLocale: 'pl',
  source: 'default',
});

export function isDemoScenarioId(value: unknown): value is DemoScenarioId {
  return typeof value === 'string' && DEMO_SCENARIO_IDS.includes(value as DemoScenarioId);
}

export function isDemoLocale(value: unknown): value is DemoLocale {
  return typeof value === 'string' && DEMO_LOCALES.includes(value as DemoLocale);
}

export function isDemoContextSource(value: unknown): value is DemoContextSource {
  return typeof value === 'string' && DEMO_CONTEXT_SOURCES.includes(value as DemoContextSource);
}

export function createDemoContext(input: Partial<DemoContext> = {}): DemoContext {
  const scenarioId = input.scenarioId ?? DEFAULT_DEMO_CONTEXT.scenarioId;
  const preferredLocale = input.preferredLocale ?? DEFAULT_DEMO_CONTEXT.preferredLocale;
  const source = input.source ?? DEFAULT_DEMO_CONTEXT.source;

  if (!isDemoScenarioId(scenarioId)) {
    throw new TypeError(`Unsupported demo scenario: ${String(scenarioId)}`);
  }
  if (!isDemoLocale(preferredLocale)) {
    throw new TypeError(`Unsupported demo locale: ${String(preferredLocale)}`);
  }
  if (!isDemoContextSource(source)) {
    throw new TypeError(`Unsupported demo context source: ${String(source)}`);
  }

  return { scenarioId, preferredLocale, source };
}

function readPersistedDemoContext(storage: Pick<Storage, 'getItem'>): DemoContext | null {
  try {
    const raw = storage.getItem(DEMO_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoContext>;
    return createDemoContext({
      scenarioId: parsed.scenarioId,
      preferredLocale: parsed.preferredLocale,
      source: 'persisted',
    });
  } catch {
    return null;
  }
}

function persistDemoContext(
  context: DemoContext,
  storage: Pick<Storage, 'setItem'>,
): void {
  try {
    storage.setItem(DEMO_CONTEXT_STORAGE_KEY, JSON.stringify({
      scenarioId: context.scenarioId,
      preferredLocale: context.preferredLocale,
    }));
  } catch {
    // Storage is optional. The active page still keeps its query-derived context.
  }
}

export function resolveBrowserDemoContext({
  search,
  storage,
}: {
  search: string;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
}): DemoContext {
  const params = new URLSearchParams(search);
  const explicitScenario = params.get('scenario');
  const explicitLocale = params.get('locale');

  if (explicitScenario !== null || explicitLocale !== null) {
    if (explicitScenario !== null && !isDemoScenarioId(explicitScenario)) {
      throw new TypeError(`Unsupported demo scenario: ${explicitScenario}`);
    }
    if (explicitLocale !== null && !isDemoLocale(explicitLocale)) {
      throw new TypeError(`Unsupported demo locale: ${explicitLocale}`);
    }

    const context = createDemoContext({
      scenarioId: explicitScenario ?? DEFAULT_DEMO_CONTEXT.scenarioId,
      preferredLocale: explicitLocale ?? DEFAULT_DEMO_CONTEXT.preferredLocale,
      source: 'query',
    });
    persistDemoContext(context, storage);
    return context;
  }

  return readPersistedDemoContext(storage) ?? { ...DEFAULT_DEMO_CONTEXT };
}

export function getActiveDemoContext(): DemoContext {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_DEMO_CONTEXT };
  }

  try {
    return resolveBrowserDemoContext({
      search: window.location.search,
      storage: window.localStorage,
    });
  } catch (error) {
    console.warn('[DEMO_CONTEXT] Invalid browser selection; using Piekary default.', error);
    return { ...DEFAULT_DEMO_CONTEXT };
  }
}

export function toDemoContextPayload(context: DemoContext): DemoContextPayload {
  return {
    scenario_id: context.scenarioId,
    preferred_locale: context.preferredLocale,
    source: context.source,
  };
}

export function getActiveDemoContextPayload(): DemoContextPayload {
  return toDemoContextPayload(getActiveDemoContext());
}
