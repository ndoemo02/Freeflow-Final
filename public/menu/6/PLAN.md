 Przy dużych instrukcjach systemowych psuje się sessionResumption → model zapomina kontekst → halucynuje.
 Obecny prompt: LIVE_HARD_GUARDS (~13 reguł) + BASE_SYSTEM_INSTRUCTION (~15 reguł) + opcjonalnie SILESIAN_STYLE_INSTRUCTION
 = mocno ponad bezpieczny limit.

 Dodatkowo compactToolResponse został rozbudowany o image_url, opening_hours, city, dietary_flags, safety
 → 2-3× więcej payloadu w każdej odpowiedzi narzędziowej → dodatkowe przeciążenie kontekstu Gemini.

 Strategia: "Głupie LLM, Mądry Backend" — drastycznie zredukować prompt i payload,
 wszystkie biznesowe reguły zostają w deterministycznym backendzie (ToolRouter, IVL, ICM, singleCityPolicy, safety guards).

 Zmiany (1 plik, 2 obszary)

 Krok 1: System Instruction — redukcja do ~200 tokenów

 Plik: frontend/src/hooks/useGeminiLiveSession.ts

 1a. Zastąpić BASE_SYSTEM_INSTRUCTION (linie 78-115) minimalnym promptem:

 Nowy prompt (kluczowe elementy):
 - Tożsamość: "Jesteś Amber — asystentka głosowa FreeFlow do zamawiania jedzenia"
 - Język: polski, naturalnie, ciepło, konkretnie, formy żeńskie
 - ZASADA NADRZĘDNA: wykonuj narzędzia natychmiast, nie mów o nich
 - TRYBY: discovery → menu → order (po 1 zdaniu na tryb)
 - GPS: jeśli sesja ma współrzędne, NIE pytaj o miasto — od razu szukaj
 - Styl: krótko, maks 2 zdania, nie czytaj list, nie używaj nazw narzędzi w mowie
 - Menu grounding: proponuj tylko pozycje faktycznie w menu
 - Hard block: zakaz fraz "mogę sprawdzić", "pozwól że", "chwileczkę", "nie mam dostępu"

 1b. Usunąć LIVE_HARD_GUARDS (linie 117-130) w całości.
 Wszystkie reguły (GPS_RULE, NEARBY_RULE, SINGLE_CITY_RULE, SAFETY_CHECK_RULE, TAG_CHECK_RULE,
 SPECIAL_INSTRUCTIONS_RULE, ORDER_SCOPE_RULE, COMPARE_TOOL_RULE, TOOL_ARGS_RULE, PERSONA_GENDER_RULE)
 są już egzekwowane przez backend. Prompt ich nie potrzebuje.

 1c. Zmienić linię 805. Obecnie:
 activeInstruction = `${LIVE_HARD_GUARDS} ${activeInstruction}`.trim();
 Po zmianie — bez prependowania LIVE_HARD_GUARDS:
 // LIVE_HARD_GUARDS removed — backend enforces all rules deterministically

 1d. Zredukować SILESIAN_STYLE_INSTRUCTION (linie 132-133):
 Skrócić do 1-2 zdań opisujących styl + 3-5 kluczowych zwrotów (ja, niy, kaj, wiela, bydzie).
 Bez długich przykładów, bez listy zakazów góralskich.

 Krok 2: compactToolResponse — odchudzenie payloadu

 Plik: frontend/src/hooks/useGeminiLiveSession.ts — funkcja compactToolResponse (linie 351-467)

 2a. find_nearby (linie 376-388): Usunąć image_url i opening_hours.
 compact.restaurants = list.slice(0, 5).map((x: any) => ({
   id: x.id,
   name: x.name,
   cuisine: x.cuisine_type || x.cuisine || x.category || null,
   rating: x.maps_rating ?? x.rating ?? null,
   ratingsTotal: x.maps_ratings_total ?? null,
   distance: x.distance ?? null,
   city: x.city || null,
   // image_url i opening_hours usunięte — niepotrzebne dla Gemini
 }));

 2b. show_menu / select_restaurant (linie 397-411): Usunąć image_url. Zachować safety (jest krytyczne dla SAFETY_CHECK_RULE — ale ta reguła jest już w backendzie... jednak Gemini nadal musi wiedzieć które
 składniki są removable przy podejmowaniu decyzji o wywołaniu add_item_to_cart z special_instructions).

 Decyzja: safety.removable zostaje — to jest krytyczna informacja dla Gemini przy decydowaniu czy przekazać special_instructions.removed. Bez tego Gemini nie wie które składniki można usunąć. image_url usuń —
  Gemini nie potrzebuje URL-i.

 2c. Cart items (wszystkie mutacje koszyka — linie 432-433, 447-448): Usunąć image_url. Zachować spicy, is_vege, dietary_flags, special_instructions — są potrzebne do TAG_CHECK_RULE i potwierdzeń.

 NIE ruszamy

 - Backend: Wszystkie guardy, ToolRouter, IVL, ICM, singleCityPolicy, safety guards — bez zmian
 - DialogManager.ts — już nie dotykamy (isFoodItem fix jest do osobnego commita)
 - normalizeData.ts — bez zmian
 - applyToolResultToStore — frontend dostaje pełne dane z response (nie z compact), bez zmian
 - VAD config — bez zmian (ActivityHandling, silenceDurationMs)

 Weryfikacja

 Przed commitem

 1. npx tsc --noEmit w frontend/ — tylko useGeminiLiveSession.ts (zero nowych błędów)
 2. node --check odpowiednika JS jeśli istnieje
 3. Backend testy: npx vitest run — 132/132 powinno przejść (backend nietknięty)

 Empiryczna na Vercel

 1. Uruchomić Live, powiedzieć "Piekary Śląskie" — sprawdzić czy Amber:
   - Nie pyta o miasto (GPS_RULE w backendzie)
   - Nie halucynuje "Ciechocinka"
   - Od razu pokazuje restauracje w Piekarach
 2. Dodać pozycję z personalizacją ("frytki bez cebuli") — sprawdzić czy safety_check działa
 3. Sprawdzić czy Amber nie ucina w pół zdania
 4. Sprawdzić logi [SESSION_INIT], [IVL], [TOOL_ROUTER] w Vercel

 Metryka

 - Nowy BASE_SYSTEM_INSTRUCTION: celować w < 250 tokenów
 - Payload compactToolResponse: ~30-40% mniejszy niż obecnie
 - Wszystkie backend testy: 132/132 PASS
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌