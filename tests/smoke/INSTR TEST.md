
       ✓   4 [chromium] › tests\smoke\comet-regression.spec.ts:246:5 › Comet Regression T01–T10 › T06 — Slang ASCII: "zamow pizze" bez ogonków → sensowna odpowiedź (5.2s)
     … +11 lines (ctrl+o to expand)
  ⎿  (timeout 3m)

● 10/10 PASS. 27 sekund, zero failures.

  ---
  Wyniki końcowe

  ✓ T01 — Onboarding: opis możliwości
  ✓ T02 — Wyszukiwanie: karty restauracji
  ✓ T03 — Odpowiedź kompletna (nie urwana)
  ✓ T04 — FSM: wybór → faza "ordering"
  ✓ T05 — Off-topic nie resetuje FSM
  ✓ T06 — Slang ASCII bez ogonków
  ✓ T07 — Zamówienie w ordering → zostaje
  ✓ T08 — Off-topic z idle → jest odpowiedź
  ✓ T09 — "cofnij" wychodzi z locked state
  ✓ T10 — Brak kart po F5

  Jak uruchamiać w przyszłości:

  cd "C:/Firerfox Portable/Freeflow brain/frontend"

  # Wszystkie testy (wymaga backend na :3005 + frontend na :5173)
  npx playwright test tests/smoke/comet-regression.spec.ts

  # Jeden test
  npx playwright test -g "T04"

  # HTML report ze screenshotami przy failach
  npx playwright test tests/smoke/comet-regression.spec.ts --reporter=html

  Playwright odpalał frontend sam (npm run dev przez webServer w configu), więc wystarczy tylko backend uruchomiony na :3005.

✻ Sautéed for 9m 6s