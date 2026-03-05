import { test, expect } from '@playwright/test';

// Helper: Wyślij wiadomość przez symulację wpisywania
async function sendMessage(page: any, text: string) {
    const input = page.locator('#voice-cc-text-input');

    // Jeśli input jest ukryty, to znaczy że widać odpowiedź asystenta. Klikamy ją żeby zniknęła.
    if (!(await input.isVisible())) {
        await page.locator('.text-\\[\\#00ffcc\\]').first().click();
    }

    await input.fill(text);

    // Wciśnij enter i poczekaj na odpowiedź sieciową v2/converse
    const [response] = await Promise.all([
        page.waitForResponse((res: any) => res.url().includes('v2/converse') && res.status() === 200),
        input.press('Enter'),
    ]);

    // Krótki czas na przerysowanie FSM i UI
    await page.waitForTimeout(1000);
}

// Helper: Otwórz panel deweloperski
async function openDevOverlay(page: any) {
    const btn = page.locator('button[title="Pokaż stan aplikacji (FSM)"]');
    if (await btn.isVisible()) {
        await btn.click();
    }
}

// Helper: Sprawdź fazę w DevOverlay
async function assertPhase(page: any, expectedPhases: string[]) {
    const phaseText = await page.locator('p:has-text("Phase:")').textContent();
    const currentPhase = phaseText?.replace('Phase:', '').trim() || '';
    expect(expectedPhases).toContain(currentPhase);
}

// Helper: Zwraca liczbę przedmiotów w koszyku z DevOverlay
async function getCartCount(page: any): Promise<number> {
    const cartText = await page.locator('p:has-text("Cart Items:")').textContent();
    const countStr = cartText?.replace('Cart Items:', '').trim() || '0';
    return parseInt(countStr, 10);
}

// Ustawienia wstępne (Setup) - np. wejście na główną stronę
test.beforeEach(async ({ page }) => {
    // Jeśli backend nie jest uruchomiony na CI, testy e2e muszą być odpalane na spiętym pełnym flow.
    // Tutaj zakładamy base url we frameworku: http://localhost:5173
    await page.goto('/');
    await page.evaluate(() => {
        // Force dev mode overlay
        localStorage.setItem('SHOW_DEV_OVERLAY', 'true');
    });
    await page.reload();
    await openDevOverlay(page);
});


test.describe('FSM Integrity & Regression Tests', () => {

    test('Sekcja 2: Phase Regression Test - ignorowanie nieznanych intencji', async ({ page }) => {
        // 1. Upewnij się że jesteśmy w 'idle'
        await assertPhase(page, ['idle']);

        // 2. Wyszukaj restauracje i wybierz pierwszą
        await sendMessage(page, 'Jakie masz restauracje?');

        // Kliknij "Wybierz" na pierwszej karcie restauracji
        const firstRestaurantBtn = page.locator('text=Wybierz').first();
        await firstRestaurantBtn.click();
        await page.waitForTimeout(1000);

        // Zapewniamy wejście w poprawny stan
        await assertPhase(page, ['restaurant_selected', 'ordering']);

        // 3. Rzuć intencję powitania
        await sendMessage(page, 'Cześć!');
        await assertPhase(page, ['restaurant_selected', 'ordering']);

        // 4. Zapytaj o godziny 
        await sendMessage(page, 'Do której otwarte?');
        await assertPhase(page, ['restaurant_selected', 'ordering']);

        // 5. Powiedz totalną głupotę (UNKNOWN_INTENT w backendzie)
        await sendMessage(page, 'Chciałbym kupić używane opony letnie do traktora z montażem.');

        // Asystent nie może zresetować nas z restauracji do zera!
        await assertPhase(page, ['restaurant_selected', 'ordering']);
    });

    test('Sekcja 3: Cart Integrity Test - produkty nie wyciekają', async ({ page }) => {
        // Szybkie przejście do restauracji
        await sendMessage(page, 'Pokaż Maka');
        const firstRestaurantBtn = page.locator('text=Wybierz').first();
        if (await firstRestaurantBtn.isVisible()) {
            await firstRestaurantBtn.click();
        }
        await page.waitForTimeout(1000);

        // Dodajmy konkretny produkt do koszyka
        await sendMessage(page, 'Poproszę big maca w zestawie powiększonym.');
        await assertPhase(page, ['ordering']);

        // Rejestrujemy ilość w koszyku po udanym dodaniu
        const startingCartItems = await getCartCount(page);
        expect(startingCartItems).toBeGreaterThan(0); // Coś musiało wpaść

        // Wywołaj UNKNOWN_INTENT
        await sendMessage(page, 'Gdzie jest najbliższy skup złomu?');

        // Koszyk nie może zostać wymyty
        const cartItemsAfterUnknown = await getCartCount(page);
        expect(cartItemsAfterUnknown).toEqual(startingCartItems);

        // Wywołaj intent edukacyjny (chitchat/hours)
        await sendMessage(page, 'Czy doliczacie opłatę pakową?');

        // Koszyk znów musi być zachowany
        const cartItemsAfterChitchat = await getCartCount(page);
        expect(cartItemsAfterChitchat).toEqual(startingCartItems);
    });

    test('Sekcja 4: UI Sync Test - czyszczenie dopiero po finalizacji', async ({ page }) => {
        // Przebicie przez flow
        await sendMessage(page, 'Chcę restaurację');
        await page.locator('text=Wybierz').first().click();
        await page.waitForTimeout(1000);

        // Zamów
        await sendMessage(page, 'Dodaj byle co do koszyka z pierwszego brzegu');

        // Przejdź do checkoutu
        await sendMessage(page, 'Złóż zamówienie to wszystko.');
        await assertPhase(page, ['checkout']);

        // Jesteśmy w Checkoucie.
        const cartItemsCheckout = await getCartCount(page);
        expect(cartItemsCheckout).toBeGreaterThan(0);

        // Celowe wprowadzanie zamętu
        await sendMessage(page, 'Podasz mi przepis na naleśniki w tej fazie?');
        await assertPhase(page, ['checkout']); // Dalej musimy być w Checkout!
        expect(await getCartCount(page)).toEqual(cartItemsCheckout); // Koszyk nienaruszony

        // Potwierdzenie zamówienia z sukcesem
        await sendMessage(page, 'Adres dowozu Krupówki 44 Zakopane, zapłacę gotówką i potwierdzam zamówienie.');

        // Może wymagać potwierdzenia, ew. dopytania (confirm). Wymuśmy po prostu sukces jeśli backend złapie.
        // Aby mieć pewność pomyślnego the endu:
        await sendMessage(page, 'Tak, zgadza się, zamawiam i potwierdzam zakup ostatecznie dziękuję.');

        // Uwaga: po order_success, stan MUST wrócić automatycznie do idle 
        // a store musi zostać fizycznie oczyszczony (post_order_reset).
        await page.waitForTimeout(3000); // UI timer to usually 1-3 seconds reset 

        await assertPhase(page, ['idle']);
        const finalCartItems = await getCartCount(page);
        expect(finalCartItems).toEqual(0);
    });
});
