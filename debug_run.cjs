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
    
    await page.evaluate(() => {
        const toggle = document.querySelector('input.switch-input');
        if (toggle && toggle.checked) toggle.click();
    });
    await page.waitForTimeout(1000);
    await page.fill('input[type="text"]', 'Pokaz restauracje w piekarach');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000); // Wait for the carousel
    
    const extraction = async (tag) => {
        const res = await page.evaluate(() => {
            const getCard = () => {
                const els = Array.from(document.querySelectorAll('div'));
                const cards = els.filter(el => {
                    const transform = el.style.transform;
                    return transform && transform.includes('translateX') && transform.includes('scale');
                });
                for (let card of cards) {
                    if (parseFloat(card.style.opacity) > 0.9 && parseInt(card.style.zIndex) >= 15) return card;
                }
                return null;
            };
            const card = getCard();
            if (!card) return 'Card not found';
            const rect = card.getBoundingClientRect();
            const cs = window.getComputedStyle(card);
            
            const cont = card.parentElement;
            const crect = cont ? cont.getBoundingClientRect() : null;
            
            return {
                cardRect: { w: rect.width, h: rect.height, t: rect.top, b: rect.bottom, l: rect.left },
                contRect: crect ? { w: crect.width, h: crect.height, t: crect.top, b: crect.bottom } : null,
                style: {
                    transform: card.style.transform,
                    opacity: card.style.opacity,
                    width: card.style.width,
                    height: card.style.height
                }
            };
        });
        console.log(tag, JSON.stringify(res, null, 2));
    };

    await extraction('INITIAL');

    // expand
    await page.mouse.move(180, 500);
    await page.mouse.down();
    await page.mouse.move(180, 200, {steps: 5});
    await page.mouse.up();
    await page.waitForTimeout(2000);

    // collapse
    await page.evaluate(() => {
        const close = Array.from(document.querySelectorAll('div')).find(el => el.textContent === 'zamknij liste');
        if (close) close.click();
    });
    await page.waitForTimeout(2000);

    await extraction('RESTORED');

    await browser.close();
})();
