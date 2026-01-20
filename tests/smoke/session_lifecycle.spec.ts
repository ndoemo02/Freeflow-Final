import { test, expect } from '@playwright/test';

test.describe('UI SMOKE TESTS: Session Lifecycle', () => {

  test.beforeEach(async ({ page }) => {
    // DIAGNOSTICS: Print logs
    page.on('console', msg => console.log(`[BROWSER LOG] ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER EXCEPTION] ${err.message}`));

    // Default mock
    await page.route('**/api/brain/v2', async route => {
      await route.fulfill({
        json: {
            ok: true,
            session_id: 'default-session',
            reply: 'Domyślna odpowiedź.',
            intent: 'mock_default',
            meta: { source: 'playwright_default' }
        }
      });
    });

    await page.goto('/');
  });

  test('1️⃣ App loads and shows main elements', async ({ page }) => {
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
  });

  test('2️⃣ Can type and send message', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    await input.fill('Test input');
    await input.press('Enter');
    await expect(page.getByText('Domyślna odpowiedź.')).toBeVisible();
  });

  test.skip('3️⃣ conversationClosed resets dialog state', async ({ page }) => {
    let requestCount = 0;
    
    // Override route logic
    await page.route('**/api/brain/v2', async route => {
      requestCount++;
      console.log(`[TEST MOCK] Handling request #${requestCount}`);
      
      if (requestCount === 1) {
          await route.fulfill({
              json: {
                ok: true,
                session_id: 'sess_OLD_111',
                reply: 'Pierwsza odpowiedź.',
                conversationClosed: false
              }
          });
      } else {
          await route.fulfill({
              json: {
                ok: true,
                session_id: 'sess_OLD_111',
                newSessionId: 'sess_NEW_222',
                reply: 'Druga odpowiedź (Zamykająca).',
                conversationClosed: true,
                closedReason: 'ORDER_CONFIRMED'
              }
          });
      }
    });

    const input = page.locator('input[type="text"]');
    
    // 1. First interaction
    await input.fill('Hej');
    await input.press('Enter');
    await expect(page.getByText('Pierwsza odpowiedź.')).toBeVisible();

    // Wait for state
    await page.waitForTimeout(1000);
    console.log('[TEST] Sending second message...');

    // 2. Second interaction
    await input.fill('Potwierdzam');
    await input.press('Enter');

    // 3. Verify
    await expect(page.getByText('Druga odpowiedź (Zamykająca).')).toBeVisible({ timeout: 10000 });
  });

});
