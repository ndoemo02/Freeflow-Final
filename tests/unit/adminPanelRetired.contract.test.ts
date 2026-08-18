import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function present(relativePath: string) {
  return existsSync(resolve(process.cwd(), relativePath));
}

describe('retired experimental admin panel', () => {
  it('removes the panel page and its components', () => {
    expect(present('src/pages/AdminPanel.jsx')).toBe(false);
    expect(present('src/components/admin')).toBe(false);
  });

  it('removes the analytics client that called the retired admin dashboard', () => {
    expect(present('src/lib/analytics.ts')).toBe(false);
  });

  it('unmounts the panel route and its legacy aliases', () => {
    const app = source('src/App.tsx');
    const routes = source('src/app/routeConfig.ts');

    expect(app).not.toContain('AdminPanel');
    expect(routes).not.toContain('PANEL_ADMIN');
    expect(routes).not.toContain('"/admin"');
    expect(routes).not.toContain('"/admin-panel"');
  });

  it('drops the panel entries from navigation surfaces', () => {
    expect(source('src/components/BottomTabBar.tsx')).not.toContain('PANEL_ADMIN');
    expect(source('src/ui/MenuDrawer.jsx')).not.toContain('Analityka');
  });

  // Quality Lab byl zakladka wewnatrz AdminPanel i bez wlasnej trasy zostalby
  // osierocony przez wyciecie. Ma przetrwac jako samodzielny panel.
  it('re-homes Amber Quality Lab as a standalone route', () => {
    expect(present('src/pages/AmberQualityLab.tsx')).toBe(true);
    expect(present('src/pages/admin')).toBe(false);

    expect(source('src/app/routeConfig.ts')).toContain('QUALITY_LAB');
    expect(source('src/App.tsx')).toContain('AmberQualityLab');
  });

  it('moves Quality Lab off the retired /api/admin namespace', () => {
    const lab = source('src/pages/AmberQualityLab.tsx');

    expect(lab).not.toContain('/api/admin');
    expect(lab).toContain('/api/quality');
  });
});
