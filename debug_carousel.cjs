const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)'
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    // Find voice dock input and type
    const input = await page.locator('input').first();
    await input.fill('Pokaz restauracje w piekarach');
    await input.press('Enter');
    await page.waitForTimeout(3000);
    
    // Function to extract active card info
    const extractInfo = async (label) => {
        return await page.evaluate((lbl) => {
            const cards = Array.from(document.querySelectorAll('div[style*="opacity: 1"]')).filter(el => {
                return el.style.transform && el.style.transform.includes('scale(1)');
            });
            let card = cards[0];
            if (!card) {
                // heuristic
                const all = Array.from(document.querySelectorAll('div[style*="opacity"]')).filter(el => parseFloat(el.style.opacity) > 0.9 && el.style.zIndex === '20');
                card = all[0];
            }
            if (!card) return lbl + ': Card not found';
            const rect = card.getBoundingClientRect();
            const cs = window.getComputedStyle(card);
            
            return {
                label: lbl,
                width: rect.width,
                height: rect.height,
                top: rect.top,
                bottom: rect.bottom,
                opacity: cs.opacity,
                transform: cs.transform
                // classes: card.className
            };
        }, label);
    };

    console.log(await extractInfo('INITIAL'));

    // Expand
    await page.mouse.move(180, 400);
    await page.mouse.down();
    await page.mouse.move(180, 200, { steps: 5 }); // swipe up (dy = -200)
    await page.mouse.up();
    
    await page.waitForTimeout(2000);
    
    // Collapse - close list
    const closeBtn = await page.locator('text="zamknij liste"').first();
    await closeBtn.click();
    
    await page.waitForTimeout(2000);
    
    console.log(await extractInfo('RESTORED'));

    await browser.close();
})();
