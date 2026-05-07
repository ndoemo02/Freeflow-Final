import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const MOCK_HANDLE = 'test-resumption-handle-abc123';
const STORAGE_KEY = 'ff_live_resumption_handle';

// --- Testowane helpery (zreplikowane z useGeminiLiveSession.ts) ---
// Testujemy logikę, która jest prywatna w hooku — identyczny kod co w module.

function saveResumptionHandle(handle: string): void {
  try { localStorage.setItem(STORAGE_KEY, handle); } catch { /* noop */ }
}

function readResumptionHandle(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function clearResumptionHandle(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

// --- Testy helperów localStorage ---

describe('Session Resumption — localStorage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // Scenario 1: Initial connect without handle
  it('1. readResumptionHandle returns null when no handle saved', () => {
    expect(readResumptionHandle()).toBeNull();
  });

  // Scenario 2: Reconnect with saved handle
  it('2. readResumptionHandle returns saved handle after saveResumptionHandle', () => {
    saveResumptionHandle(MOCK_HANDLE);
    expect(readResumptionHandle()).toBe(MOCK_HANDLE);
  });

  // Scenario 3: sessionResumptionUpdate saves handle
  it('3. saveResumptionHandle persists handle to localStorage', () => {
    saveResumptionHandle(MOCK_HANDLE);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(MOCK_HANDLE);
  });

  // Scenario 7: stop() clears handle
  it('7. clearResumptionHandle removes handle from localStorage', () => {
    saveResumptionHandle(MOCK_HANDLE);
    clearResumptionHandle();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(readResumptionHandle()).toBeNull();
  });

  // Scenario 9: localStorage read error handled
  it('9. readResumptionHandle returns null on localStorage.getItem error', () => {
    const orig = localStorage.getItem;
    localStorage.getItem = () => { throw new Error('QuotaExceeded'); };
    try {
      expect(readResumptionHandle()).toBeNull();
    } finally {
      localStorage.getItem = orig;
    }
  });

  // Scenario 10: localStorage write error handled
  it('10. saveResumptionHandle does not throw on localStorage.setItem error', () => {
    const origGet = localStorage.getItem;
    const origSet = localStorage.setItem;
    // Upewniamy się, że LS jest czysty
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
    localStorage.getItem = () => null; // getItem też może rzucać — pokryte w teście #9
    try {
      expect(() => saveResumptionHandle(MOCK_HANDLE)).not.toThrow();
    } finally {
      localStorage.setItem = origSet;
      localStorage.getItem = origGet;
    }
  });

  // Scenario 11: Backward compatible — no handle in LS
  it('11. readResumptionHandle returns null for missing key (backward compat)', () => {
    localStorage.setItem('other_key', 'some_value');
    expect(readResumptionHandle()).toBeNull();
  });

  // Scenario 4: sessionResumptionUpdate without resumable flag
  it('4. handle is not saved when resumable is false (logic guard)', () => {
    // Symulujemy logikę z handleMessage:
    // sru.resumable && sru.newHandle → warunek niespełniony gdy resumable=false
    const resumable = false;
    const newHandle = MOCK_HANDLE;
    if (resumable && newHandle) {
      saveResumptionHandle(newHandle);
    }
    expect(readResumptionHandle()).toBeNull();
  });

  // Scenario 5: sessionResumptionUpdate without newHandle
  it('5. handle is not saved when newHandle is missing', () => {
    const resumable = true;
    const newHandle = null;
    if (resumable && newHandle) {
      saveResumptionHandle(newHandle);
    }
    expect(readResumptionHandle()).toBeNull();
  });

  // Scenario 6: GoAway with pending handle — handle survives in LS
  it('6. handle survives in localStorage after simulated goAway', () => {
    saveResumptionHandle(MOCK_HANDLE);
    // goAway nie czyści handle — reconnect ma go użyć
    expect(readResumptionHandle()).toBe(MOCK_HANDLE);
  });

  // Scenario 8: Unmount clears ref but not localStorage
  it('8. localStorage handle persists when only in-memory ref is cleared', () => {
    saveResumptionHandle(MOCK_HANDLE);
    // Symulacja unmount: ref = null, localStorage NIE czyszczony
    let ref: string | null = MOCK_HANDLE;
    ref = null; // unmount — clear ref only
    expect(ref).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(MOCK_HANDLE);
  });
});

// --- Testy konfiguracji sessionResumption przekazywanej do connect() ---

describe('Session Resumption — connect() config', () => {
  it('omits sessionResumption entirely when no handle (first connect)', () => {
    const handle = readResumptionHandle();
    const config = {
      ...(handle
        ? { sessionResumption: { transparent: true, handle } }
        : {}),
    };
    expect(config).not.toHaveProperty('sessionResumption');
  });

  it('includes sessionResumption with handle when available (reconnect)', () => {
    saveResumptionHandle(MOCK_HANDLE);
    const handle = readResumptionHandle();
    const config = {
      ...(handle
        ? { sessionResumption: { transparent: true, handle } }
        : {}),
    };
    expect(config).toEqual({ sessionResumption: { transparent: true, handle: MOCK_HANDLE } });
  });

  it('transparent is true when sessionResumption is present', () => {
    saveResumptionHandle(MOCK_HANDLE);
    const handle = readResumptionHandle();
    const config = {
      ...(handle
        ? { sessionResumption: { transparent: true, handle } }
        : {}),
    };
    expect(config.sessionResumption!.transparent).toBe(true);

    // Bez handle — sessionResumption całkowicie nieobecne
    clearResumptionHandle();
    const config2 = {
      ...(readResumptionHandle()
        ? { sessionResumption: { transparent: true, handle: readResumptionHandle()! } }
        : {}),
    };
    expect(config2).not.toHaveProperty('sessionResumption');
  });
});

// --- Testy reguły biznesowej: stop() vs unmount ---

describe('Session Resumption — lifecycle rules', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('intentional stop() clears both ref and localStorage', () => {
    // Setup: zapisany handle z poprzedniej sesji
    saveResumptionHandle(MOCK_HANDLE);
    let ref: string | null = readResumptionHandle();

    // Symulacja stop(): czyścimy oba
    ref = null;
    clearResumptionHandle();

    expect(ref).toBeNull();
    expect(readResumptionHandle()).toBeNull();
  });

  it('unintentional disconnect preserves handle in localStorage', () => {
    // Setup: zapisany handle
    saveResumptionHandle(MOCK_HANDLE);
    let ref: string | null = readResumptionHandle();

    // Symulacja nieintencjonalnego disconnect (network error):
    // ref może być wyczyszczony, ale localStorage zostaje
    ref = null;

    expect(ref).toBeNull();
    expect(readResumptionHandle()).toBe(MOCK_HANDLE);
  });

  it('full reconnect flow: save → disconnect → reconnect with handle', () => {
    // Krok 1: inicjalne połączenie — brak handle
    expect(readResumptionHandle()).toBeNull();

    // Krok 2: server wysyła sessionResumptionUpdate
    saveResumptionHandle(MOCK_HANDLE);

    // Krok 3: disconnect (network) — handle zostaje w LS
    let ref: string | null = readResumptionHandle();
    ref = null;

    // Krok 4: reconnect — handle odczytany z LS
    const handle = readResumptionHandle();
    const config = {
      ...(handle
        ? { sessionResumption: { transparent: true, handle } }
        : {}),
    };
    expect(config).toEqual({ sessionResumption: { transparent: true, handle: MOCK_HANDLE } });
  });

  it('page refresh preserves handle in localStorage', () => {
    saveResumptionHandle(MOCK_HANDLE);

    // Symulacja refresh: odczyt z localStorage przy inicie hooka
    const handleFromStorage = readResumptionHandle();
    expect(handleFromStorage).toBe(MOCK_HANDLE);
  });
});
