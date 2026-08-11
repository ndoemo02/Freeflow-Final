import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('production panels never substitute realistic mock data', () => {
  it('surfaces Business and KDS backend failures', () => {
    const business = source('src/lib/businessApi.ts');
    const kds = source('src/lib/kdsApi.ts');
    expect(business).not.toContain('falling back to mock');
    expect(business).not.toContain('MOCK_KPIS');
    expect(business).not.toMatch(/catch \(error\)[\s\S]{0,400}kpis:\s*MOCK_KPIS/);
    expect(business).toContain('api/owner/orders');
    expect(business).not.toContain('api/admin/orders');
    expect(kds).not.toContain('return getMockKDSData()');
    expect(kds).not.toContain('getMockKDSData');
    expect(kds).not.toContain('avg_time_minutes: 15');
    expect(kds).toContain('api/owner/orders');
    expect(kds).not.toContain('api/orders/');
  });

  it('does not synthesize satisfaction, charts, top lists, or accounts', () => {
    const analytics = source('src/lib/analytics.ts');
    const admin = source('src/pages/AdminPanel.jsx');
    expect(analytics).not.toContain('getMockAnalyticsKPI');
    expect(analytics).not.toContain('customerSatisfaction = 97.3');
    expect(analytics).not.toContain(".from('orders')");
    expect(analytics).toContain('/api/admin/internal-dashboard');
    expect(admin).not.toContain('getMockAccounts');
    expect(admin).not.toContain(".from('profiles')");
    expect(admin).toContain('label="Satysfakcja" value="N/D"');
    expect(admin).toContain('Panel nie podstawia wartości demonstracyjnych');
    expect(admin).not.toContain('EventSource');
    expect(admin).not.toContain('/api/amber/live');
  });
});
