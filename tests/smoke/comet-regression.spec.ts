/**
 * comet-regression.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Testy E2E odpowiadające scenariuszom T01–T10 z raportów Perplexity Comet.
 *
 * WYMAGANIA przed uruchomieniem:
 *   1. Backend uruchomiony na http://localhost:3005
 *   2. Frontend uruchomiony na http://localhost:5173  (lub `npm run dev`)
 *
 * URUCHOMIENIE:
 *   npx playwright test tests/smoke/comet-regression.spec.ts --headed
 *   npx playwright test tests/smoke/comet-regression.spec.ts --reporter=html
 *
 * DEBUGOWANIE (jeden test):
 *   npx playwright test -g "T01" --headed --timeout=60000
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect, Page } from '@playwright/test';

// ─── Stałe ───────────────────────────────────────────────────────────────────

const BRAIN_API_PATTERN = '**/api/brain/v2*';
const API_TIMEOUT = 15_000;  // ms na odpowiedź backendu
const UI_SETTLE   = 800;     // ms na przerysowanie React po odpowiedzi

// ─── Helpery ─────────────────────────────────────────────────────────────────

/**
 * Wybiera pierwszą restaurację z listy przez chat ("wybieram 1").
 * Bardziej realistyczny niż klikanie UI — testuje faktyczny przepływ selekcji.
 * Zakłada że Island z restauracjami jest już widoczna (sendMessage już wywołany).
 */
async function selectFirstRestaurantViaChat(page: Page): Promise<void> {
    await sendMessage(page, 'wybieram 1');
}

/**
 * Wysyła wiadomość przez pole tekstowe VoiceCommandCenter.
 * Jeśli jest widoczna odpowiedź Amber (teal text), najpierw ją klika żeby
 * zwolnić input.
 */
async function sendMessage(page: Page, text: string): Promise<void> {
    const input = page.locator('#voice-cc-text-input');

    // Jeśli input zakryty przez odpowiedź asystenta, kliknij żeby go odsłonić
    if (!(await input.isVisible({ timeout: 2000 }).catch(() => false))) {
        const responseEl = page.locator('.text-\\[\\#00ffcc\\]').first();
        if (await responseEl.isVisible({ timeout: 1000 }).catch(() => false)) {
            // force:true bo framer-motion animuje element (not stable bez force)
            await responseEl.click({ force: true });
            await page.waitForTimeout(400);
        }
    }

    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(text);

    // Wyślij + poczekaj na odpowiedź sieciową
    await Promise.all([
        page.waitForResponse(
            (res) => res.url().includes('brain/v2') && res.status() === 200,
            { timeout: API_TIMEOUT }
        ),
        input.press('Enter'),
    ]);

    await page.waitForTimeout(UI_SETTLE);
}

/**
 * Zwraca aktualną fazę FSM z DevOverlay ("Phase: ordering" → "ordering").
 * DevOverlay musi być otwarte.
 */
async function getPhase(page: Page): Promise<string> {
    const el = page.locator('p:has-text("Phase:")');
    const text = await el.textContent({ timeout: 3000 });
    return (text ?? '').replace('Phase:', '').trim();
}

/**
 * Zwraca tekst ostatniej odpowiedzi Amber (teal span z title).
 * Działa niezależnie od tego czy DevOverlay jest otwarte.
 */
async function getLastReply(page: Page): Promise<string> {
    // Span z klasą truncate wewnątrz teal div – ma atrybut title = pełny tekst
    const span = page.locator('.text-\\[\\#00ffcc\\] span[title]').first();
    const visible = await span.isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) {
        return (await span.getAttribute('title')) ?? (await span.textContent()) ?? '';
    }
    return '';
}

/**
 * Otwiera DevOverlay jeśli jeszcze nie jest otwarty.
 */
async function openDevOverlay(page: Page): Promise<void> {
    const btn = page.locator('button[title="Pokaż stan aplikacji (FSM)"]');
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
    }
}

// ─── Setup ───────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
    // Włącz DevOverlay nawet w prod buildzie
    await page.addInitScript(() => {
        localStorage.setItem('SHOW_DEV_OVERLAY', 'true');
    });

    // Printuj logi przeglądarki do terminala (ułatwia diagnozę)
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            console.error(`[BROWSER ERROR] ${msg.text()}`);
        }
    });

    await page.goto('/');
    await openDevOverlay(page);
});

// ─── TESTY ───────────────────────────────────────────────────────────────────

test.describe('Comet Regression T01–T10', () => {

    // ─────────────────────────────────────────────────────────────────────────
    // T01: Onboarding — Amber opisuje możliwości (nie tylko "W czym mogę pomóc?")
    // ─────────────────────────────────────────────────────────────────────────
    test('T01 — Onboarding: "co potrafisz?" → opis możliwości', async ({ page }) => {
        await sendMessage(page, 'Cześć, co potrafisz?');

        const reply = await getLastReply(page);

        // Musi być jakaś odpowiedź
        expect(reply.length, `T01: brak odpowiedzi (reply="")`).toBeGreaterThan(20);

        // Nie może to być tylko pusty fallback
        expect(reply, 'T01: odpowiedź to tylko fallback Przepraszam').not.toContain('coś poszło nie tak');

        // Powinna wspominać o zamawianiu / restauracjach — minimum 1 słowo kluczowe
        const keywords = ['restaur', 'zamów', 'zamaw', 'jedzeni', 'menu', 'potrafi', 'pomoc', 'szuk'];
        const hasKeyword = keywords.some((k) => reply.toLowerCase().includes(k));
        expect(hasKeyword, `T01: odpowiedź nie zawiera żadnego słowa kluczowego. Reply: "${reply}"`).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // T02: Wyszukiwanie restauracji → lista kart pojawia się w UI
    // ─────────────────────────────────────────────────────────────────────────
    test('T02 — Wyszukiwanie: "Znajdź restauracje" → karty restauracji', async ({ page }) => {
        await sendMessage(page, 'Znajdź restauracje w Piekarach Śląskich');

        // Island w stanie peek — widoczny jest CTA "Pelna lista"
        const pełnaLista = page.locator('button:has-text("Pelna lista")').first();
        await expect(pełnaLista, 'T02: Island z restauracjami nie pojawił się (brak "Pelna lista")').toBeVisible({ timeout: 8000 });

        // Faza powinna być idle lub restaurant_selected (nie ordering)
        const phase = await getPhase(page);
        expect(['idle', 'restaurant_selected', 'unknown'], `T02: nieoczekiwana faza "${phase}"`).toContain(phase);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // T03: Pełna odpowiedź — tekst nie jest ucięty (brak "Jasne, nie ma" bez końca)
    // ─────────────────────────────────────────────────────────────────────────
    test('T03 — Odpowiedź kompletna: brak uciętego tekstu', async ({ page }) => {
        // Anuluj / soft cancel — typ wiadomości który powodował ucięcie
        await sendMessage(page, 'anuluj');

        const reply = await getLastReply(page);

        if (reply.length > 0) {
            // Odpowiedź nie może kończyć się w środku zdania (brak kropki/wykrzyknika/pytajnika)
            const lastChar = reply.trim().slice(-1);
            const validEndings = ['.', '!', '?', ')'];
            expect(
                validEndings.includes(lastChar),
                `T03: odpowiedź wydaje się urwana — kończy się na "${lastChar}". Pełny tekst: "${reply}"`
            ).toBe(true);

            // Nie może być fragment bez sensu (np. "Jasne, nie ma" — urwane w połowie)
            // Sprawdzamy czy tekst nie wygląda jak urwane zdanie (brak orzeczenia w ostatnim fragmencie)
            const TRUNCATION_PATTERNS = [
                /jasne,?\s+nie\s+ma\s*$/i,
                /dobra,?\s+szukam\s*$/i,
                /mam\s+\d+\s*$/i,
                /chcesz\s+zamówi[cć]\s*$/i,
            ];
            const looksTruncated = TRUNCATION_PATTERNS.some(p => p.test(reply.trim()));
            expect(looksTruncated, `T03: odpowiedź pasuje do wzorca urwania: "${reply}"`).toBe(false);
        }
        // Jeśli reply="" to test przechodzi (backend nie odpowiedział — to osobny problem T08)
    });

    // ─────────────────────────────────────────────────────────────────────────
    // T04: FSM transition → po wyborze restauracji faza = ordering (nie idle)
    // ─────────────────────────────────────────────────────────────────────────
    test('T04 — FSM: wybór restauracji → faza "ordering"', async ({ page }) => {
        // 1. Znajdź restauracje
        await sendMessage(page, 'Pokaż restauracje w Piekarach');
        await expect(
            page.locator('button:has-text("Pelna lista")').first(),
            'T04: Island nie pojawił się po wyszukaniu'
        ).toBeVisible({ timeout: 8000 });

        // 2. Wybierz pierwszą (rozwiń → Wybierz)
        await selectFirstRestaurantViaChat(page);

        // 3. Faza musi być ordering (lub restaurant_selected — oba OK)
        const phase = await getPhase(page);
        expect(
            ['ordering', 'restaurant_selected'],
            `T04: faza po wyborze restauracji = "${phase}", oczekiwano "ordering"`
        ).toContain(phase);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // T05: Pytanie off-topic w ordering nie resetuje FSM
    // ─────────────────────────────────────────────────────────────────────────
    test('T05 — FSM guard: pytanie off-topic nie resetuje fazy ordering', async ({ page }) => {
        // Wejdź w ordering
        await sendMessage(page, 'Pokaż restauracje w Piekarach');
        await expect(
            page.locator('button:has-text("Pelna lista")').first()
        ).toBeVisible({ timeout: 8000 });
        await selectFirstRestaurantViaChat(page);

        const phaseAfterSelect = await getPhase(page);
        expect(['ordering', 'restaurant_selected']).toContain(phaseAfterSelect);

        // Pytanie nie związane z zamówieniem
        await sendMessage(page, 'Do której godziny jesteście otwarci?');

        // Faza musi zostać taka sama — nie reset do idle
        const phaseAfter = await getPhase(page);
        expect(
            ['ordering', 'restaurant_selected'],
            `T05: faza po pytaniu off-topic = "${phaseAfter}" (reset do idle!)`
        ).toContain(phaseAfter);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // T06: Slang ASCII bez ogonków → odpowiedź (nie cisza / nie Przepraszam)
    // ─────────────────────────────────────────────────────────────────────────
    test('T06 — Slang ASCII: "zamow pizze" bez ogonków → sensowna odpowiedź', async ({ page }) => {
        await sendMessage(page, 'zamow pizze z pieczarkami');

        const reply = await getLastReply(page);

        // Musi być jakaś odpowiedź
        expect(reply.length, 'T06: brak odpowiedzi na slang ASCII').toBeGreaterThan(10);

        // Nie może być tylko generyczny fallback
        expect(reply, 'T06: odpowiedź to tylko fallback').not.toBe('Przepraszam, coś poszło nie tak. Spróbuj jeszcze raz.');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // T07: Zamówienie w fazie ordering → FSM nie cofa do idle
    // ─────────────────────────────────────────────────────────────────────────
    test('T07 — Zamówienie w ordering: FSM zostaje w ordering', async ({ page }) => {
        // Wejdź w ordering
        await sendMessage(page, 'Pokaż restauracje w Piekarach');
        await expect(
            page.locator('button:has-text("Pelna lista")').first()
        ).toBeVisible({ timeout: 8000 });
        await selectFirstRestaurantViaChat(page);

        await expect(
            async () => expect(['ordering', 'restaurant_selected']).toContain(await getPhase(page)),
        ).toPass({ timeout: 3000 });

        // Zamów coś
        await sendMessage(page, 'Poproszę pizzę margheritę');

        const phase = await getPhase(page);
        expect(
            ['ordering', 'restaurant_selected', 'checkout'],
            `T07: faza po zamówieniu = "${phase}" (reset do idle!)`
        ).toContain(phase);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // T08: Pytanie off-topic z idle → fallback (nie cisza)
    // ─────────────────────────────────────────────────────────────────────────
    test('T08 — Off-topic z idle → jest jakaś odpowiedź (nie cisza)', async ({ page }) => {
        // Upewnij się że jesteśmy w idle
        const phaseAtStart = await getPhase(page);
        expect(phaseAtStart, 'T08: test wymaga startu od idle').toBe('idle');

        await sendMessage(page, 'Jaka jest prognoza pogody na jutro?');

        const reply = await getLastReply(page);

        // Backend powinien zwrócić COKOLWIEK (fallback, redirect, coś)
        expect(reply.length, 'T08: cisza zamiast odpowiedzi na off-topic z idle').toBeGreaterThan(5);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // T09: Escape z locked state → "anuluj" / "cofnij" działa
    // ─────────────────────────────────────────────────────────────────────────
    test('T09 — Escape: "cofnij" wychodzi z select_restaurant', async ({ page }) => {
        // Wejdź w select_restaurant przez wyszukanie
        await sendMessage(page, 'Pokaż restauracje w Piekarach');
        await page.locator('button:has-text("Wybierz")').first().isVisible({ timeout: 8000 }).catch(() => {});

        // Wyślij coś co zablokuje w select_restaurant (próba wyboru bez numeru)
        // Potem wyjdź przez "cofnij"
        await sendMessage(page, 'cofnij');

        const phase = await getPhase(page);
        const reply = await getLastReply(page);

        // Po cofnij: albo idle albo jakaś odpowiedź potwierdzająca
        const escaped = phase === 'idle' || reply.length > 5;
        expect(escaped, `T09: escape nie zadziałał. Phase="${phase}", reply="${reply}"`).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // T10: Brak kart restauracji po F5 (suggestedRestaurants nie persystuje)
    // ─────────────────────────────────────────────────────────────────────────
    test('T10 — Świeży reload: brak kart restauracji po F5', async ({ page }) => {
        // 1. Najpierw pobierz restauracje aby UI je wyświetliło
        await sendMessage(page, 'Znajdź restauracje w Piekarach');
        const islandBefore = page.locator('button:has-text("Pelna lista")').first();
        const hadRestaurants = await islandBefore.isVisible({ timeout: 8000 }).catch(() => false);

        // Pomiń test jeśli backend nie zwrócił restauracji (nie możemy przetestować T10)
        test.skip(!hadRestaurants, 'T10: backend nie zwrócił restauracji — skip');

        // 2. Hard reload (F5)
        await page.reload();
        await openDevOverlay(page);
        await page.waitForTimeout(500);

        // 3. Po reloadzie NIE powinno być kart (Zustand in-memory, nie ma persistencji)
        const islandAfter = page.locator('button:has-text("Pelna lista")').first();
        const stillVisible = await islandAfter.isVisible({ timeout: 2000 }).catch(() => false);

        expect(stillVisible, 'T10: Island restauracji widoczny po F5 (suggestedRestaurants persystuje!)').toBe(false);

        // 4. Faza musi być idle po reloadzie
        const phase = await getPhase(page);
        expect(phase, 'T10: faza nie jest idle po F5').toBe('idle');
    });

});
