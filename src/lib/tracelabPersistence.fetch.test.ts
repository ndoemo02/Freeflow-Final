import { afterEach, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ pages: [] as Record<string, unknown>[][], ranges: [] as [number, number][] }));
vi.mock('./supabase', () => ({
  supabase: {
    from: () => {
      const query: any = {};
      query.select = () => query;
      query.eq = () => query;
      query.order = () => query;
      query.range = (from: number, to: number) => {
        db.ranges.push([from, to]);
        return Promise.resolve({ data: db.pages.shift() || [], error: null });
      };
      return query;
    },
  },
}));

import { fetchPersistedTraceRun } from './tracelabPersistence';

afterEach(() => {
  db.pages = [];
  db.ranges = [];
});

it('paginates beyond the Supabase 1000-row response limit without silent truncation', async () => {
  db.pages = [
    Array.from({ length: 1000 }, (_, index) => ({ event: 'cart_sync_attempt', index })),
    Array.from({ length: 1000 }, (_, index) => ({ event: 'ui_cart_committed', index: index + 1000 })),
    Array.from({ length: 37 }, (_, index) => ({ event: 'mutation_result', index: index + 2000 })),
  ];

  const events = await fetchPersistedTraceRun('run', 'session');

  expect(events).toHaveLength(2037);
  expect(db.ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
});
