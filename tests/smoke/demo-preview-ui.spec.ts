import { expect, Page, test } from '@playwright/test';

const RESTAURANT = {
  id: 'demo-restaurant',
  name: 'Śląski Szynk',
  city: 'Piekary Śląskie',
  cuisine_type: 'Nowoczesna kuchnia śląska',
  rating: 4.8,
  distance: 0.8,
};

const MENU = [
  { id: 'dish-1', restaurant_id: RESTAURANT.id, name: 'Rolada wołowa', category: 'Dania główne', price_pln: 42, description: 'Kluski śląskie, modra kapusta i sos pieczeniowy' },
  { id: 'dish-2', restaurant_id: RESTAURANT.id, name: 'Żur śląski', category: 'Zupy', price_pln: 21, description: 'Zakwas, biała kiełbasa i jajko' },
];

async function mockDemoFlow(page: Page) {
  let request = 0;
  await page.route('**/api/brain/v2*', async (route) => {
    request += 1;
    await route.fulfill({
      json: request === 1
        ? {
            ok: true,
            session_id: 'demo-preview-session',
            reply: 'Znalazłam miejsce w pobliżu.',
            intent: 'find_nearby',
            restaurants: [RESTAURANT],
            context: { conversationPhase: 'idle', last_restaurants_list: [RESTAURANT] },
          }
        : {
            ok: true,
            session_id: 'demo-preview-session',
            reply: 'Oto menu Śląskiego Szynku.',
            intent: 'show_menu',
            menuItems: MENU,
            currentRestaurant: RESTAURANT,
            context: { conversationPhase: 'restaurant_selected', currentRestaurant: RESTAURANT, last_menu: MENU },
          },
    });
  });
}

test.describe('Demo Preview UI', () => {
  test.describe.configure({ mode: 'serial' });

  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    test(`header and Voice Dock remain inside a ${width}px viewport`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const label = page.locator('[data-voice-context="order"]');
      const menuButton = page.getByRole('button', { name: 'Otwórz menu' }).last();
      const dock = page.locator('[data-ui-role="voice-dock-bar"]');
      await expect(label).toBeVisible();
      await expect(menuButton).toBeVisible();
      await expect(dock).toBeVisible();

      const [labelBox, buttonBox, dockBox] = await Promise.all([
        label.boundingBox(),
        menuButton.boundingBox(),
        dock.boundingBox(),
      ]);
      expect(labelBox && buttonBox && labelBox.x + labelBox.width <= buttonBox.x).toBeTruthy();
      expect(dockBox && dockBox.x >= 0 && dockBox.x + dockBox.width <= width).toBeTruthy();
      expect(dockBox && dockBox.y + dockBox.height <= (width <= 430 ? 844 : 900)).toBeTruthy();

      await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`) });
    });
  }

  test('moves Order → Places → Menu without a compact header logo', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockDemoFlow(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const input = page.getByRole('textbox', { name: /tekstowa wiadomość/i });
    await input.fill('Pokaż restauracje w pobliżu');
    await input.press('Enter');

    await expect(page.locator('[data-voice-context="places"]')).toBeVisible();
    await expect(page.locator('[data-ui-role="header-logo-target"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /otwórz menu restauracji śląski szynk/i })).toBeVisible();
    await page.getByRole('button', { name: /otwórz menu restauracji śląski szynk/i }).click();

    await expect(page.locator('[data-voice-context="menu"]')).toHaveCount(1);
    await expect(page.locator('[data-voice-context="menu"]')).toBeVisible();
    await expect(page.getByText('Śląski Szynk').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /rolada wołowa/i })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('menu-390.png') });
  });

  test('respects reduced motion while keeping the context readable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-voice-context="order"]')).toHaveAttribute('aria-label', 'Voice to Order');
  });
});
