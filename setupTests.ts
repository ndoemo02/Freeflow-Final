import "@testing-library/jest-dom";

// Node 26 exposes an experimental global localStorage accessor which can be
// undefined without --localstorage-file. Install a deterministic test storage
// without reading that accessor first (reading it emits a warning and returns
// undefined in worker processes).
const storageData = new Map<string, string>();
const testLocalStorage: Storage = {
  get length() { return storageData.size; },
  clear: () => storageData.clear(),
  getItem: (key) => storageData.has(key) ? storageData.get(key)! : null,
  key: (index) => [...storageData.keys()][index] ?? null,
  removeItem: (key) => { storageData.delete(key); },
  setItem: (key, value) => { storageData.set(String(key), String(value)); },
};

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: testLocalStorage,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: testLocalStorage,
  });
}
