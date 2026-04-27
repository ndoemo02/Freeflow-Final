const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)'
    });
    const page = await context.newPage();
    
    page.on('console', msg => {
        if (msg.text().includes('[CAROUSEL_LAYOUT]')) {
            console.log(msg.text());
        }
    });

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000); // let UI load
    
    // The voice dock has a text input after switching mode.
    // Let's just evaluate a click on the mode toggle, then type.
    await page.evaluate(() => {
        const toggle = document.querySelector('input.switch-input');
        if (toggle && toggle.checked) toggle.click(); // switch to text mode
    });
    
    await page.waitForTimeout(1000);
    await page.fill('input[type="text"]', 'Pokaz restauracje w piekarach');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(4000); // wait for initial layout
    
    // Simulate expand list
    // Drag down or up? "po zrobieniu expand -> collapse"
    // swipe up: dy < -60
    await page.mouse.move(180, 500);
    await page.mouse.down();
    await page.mouse.move(180, 200, { steps: 10 }); 
    await page.mouse.up();
    
    await page.waitForTimeout(2000);
    
    const closeBtn = page.locator('text="zamknij liste"').first();
    if (await closeBtn.isVisible()) {
        await closeBtn.click();
    } else {
        // fallback try clicking somewhere outside or evaluating state
        await page.evaluate(() => {
            const btn = document.querySelector('div[style*="zamknij liste"]');
            if (btn) btn.click();
        });
    }
    
    await page.waitForTimeout(3000); // wait for restored layout log
    
    await browser.close();
})();
