import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const logs = [];
    page.on('console', msg => {
        const text = msg.text();
        logs.push({ type: msg.type(), text });
        console.log(`[BROWSER]: ${text}`);
    });

    console.log('Navigating to http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Wait for the UI to settle
    await page.waitForTimeout(2000);

    // Make sure we can always click the input or response back
    async function sendMessage(text) {
        console.log(`\\n>> Sending message: "${text}"`);

        // If the amber response is showing, we need to click it to reveal the input
        const responseSelector = '.fa-robot';
        const isResponseVisible = await page.isVisible(responseSelector);
        if (isResponseVisible) {
            console.log('Clearing previous response to show input...');
            await page.click(responseSelector);
            await page.waitForTimeout(500); // Wait for animation
        }

        const inputSelector = '#voice-cc-text-input';
        await page.waitForSelector(inputSelector, { state: 'visible', timeout: 5000 });
        await page.fill(inputSelector, text);
        await page.press(inputSelector, 'Enter');

        // Wait for response to settle (e.g. typing indicator to go away or some delay)
        await page.waitForTimeout(4000);
    }

    try {
        console.log('\\n--- STEP 1: IDLE ---');
        await page.screenshot({ path: 'step1_idle.png' });

        console.log('\\n--- STEP 2: SELECT RESTAURANT ---');
        await sendMessage('Znajdź pizzerię');
        await page.screenshot({ path: 'step2_restaurants.png' });

        await sendMessage('Wybieram pierwszą');
        await page.screenshot({ path: 'step3_restaurant_selected.png' });

        console.log('\\n--- STEP 3: ORDERING ---');
        await sendMessage('Zamawiam dużą pizzę margherita');
        await page.screenshot({ path: 'step4_ordering.png' });

        console.log('\\n--- STEP 4: CHECKOUT ---');
        await sendMessage('Chcę zapłacić');
        await page.screenshot({ path: 'step5_checkout.png' });

        console.log('\\n--- STEP 5: CONFIRM ---');
        await sendMessage('Tak, potwierdzam');
        await page.waitForTimeout(3000); // 3 sec for conversationClosed 1500ms delay
        await page.screenshot({ path: 'step6_confirmed.png' });

        console.log('\\n--- TEST COMPLETED ---');

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();

        console.log('\\n=== SUMMARY ===');
        const dispatcherLogs = logs.filter(l => l.text.includes('ActionDispatcher'));

        console.log('\\nSequential ActionDispatcher logs:');
        dispatcherLogs.forEach(l => console.log('  ', l.text));

        fs.writeFileSync('browser-logs.json', JSON.stringify(logs, null, 2));
    }

})();
