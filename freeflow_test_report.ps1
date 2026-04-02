# ============================================================
#  RAPORT TESTOWY - FreeFlow
#  URL: https://freeflow-final.vercel.app
#  Data: 2026-03-29 | Tester: Comet
# ============================================================

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  FREEFLOW - WYNIKI TESTOW UI / NLU   " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[SEKCJA 1] MAPA UI" -ForegroundColor Yellow
Write-Host "  [OK] Logo FreeFlow - klikalny, uruchamia mikrofon"
Write-Host "  [OK] Input 'Napisz lub powiedz...' - id=voice-cc-text-input"
Write-Host "  [OK] Hamburger menu (prawy gorny rog) - dziala"
Write-Host "  [OK] Toggle voice/tiles (lewy dolny rog) - przelacza tryb"
Write-Host "  [OK] Orb/kula - wizualny przycisk glosowy"
Write-Host "  [OK] Badge Odkrywanie / Precyzowanie - stan asystenta"
Write-Host "  [!!] BRAK elementu LIVE / Gemini Live / Live Toggle w UI"
Write-Host ""

Write-Host "[SEKCJA 2] TEST CHAT / NLU" -ForegroundColor Yellow
Write-Host ""
Write-Host "  KROK 2 - Input: Czesc, co potrafisz?" -ForegroundColor White
Write-Host "  [FAIL] Odpowiedz: Nie rozumiem tego polecenia." -ForegroundColor Red
Write-Host "         Przyczyna: brak intencji greeting / help w NLU"
Write-Host ""
Write-Host "  KROK 3 - Input: Znajdz restauracje w Piekarach" -ForegroundColor White
Write-Host "  [PASS] Wynik: 10 restauracji znalezionych" -ForegroundColor Green
Write-Host "  [PASS] Karty restauracji renderuja sie poprawnie" -ForegroundColor Green
Write-Host "  [PASS] Encoding nazw: OK (Piekary Slaskie, Miedzynarodowa itd.)" -ForegroundColor Green
Write-Host "  [FAIL] Brak restauracji Vien-Thien w bazie danych" -ForegroundColor Red
Write-Host ""
Write-Host "  KROK NLU - Input: Pokaz wszystkie restauracje" -ForegroundColor White
Write-Host "  [FAIL] Bot odczytal Poka jako nazwe miasta" -ForegroundColor Red
Write-Host "         Odpowiedz: Nie znalazlam restauracji w Poka. Moze inna kuchnia?"
Write-Host "         Przyczyna: brak intencji show_all / list_all"
Write-Host ""

Write-Host "[SEKCJA 3] LIVE TOGGLE SEARCH" -ForegroundColor Yellow
Write-Host "  [FAIL] LIVE_TOGGLE_FOUND: NIE" -ForegroundColor Red
Write-Host "         - Brak badge LIVE lub podobnego"
Write-Host "         - Brak window.__LIVE_MODE__ w DOM"
Write-Host "         - Brak atrybutu data-live na jakimkolwiek elemencie"
Write-Host "         - Toggle voice/tiles != Gemini Live (to tylko przelacznik layoutu)"
Write-Host "  [N/A] DevTools Console niedostepne w srodowisku testowym"
Write-Host ""

Write-Host "[SEKCJA 4] ENCODING CHECK" -ForegroundColor Yellow
Write-Host "  [PASS] Glowne UI - polskie znaki OK" -ForegroundColor Green
Write-Host "  [PASS] Nazwy restauracji - polskie znaki OK" -ForegroundColor Green
Write-Host "  [FAIL] Tryb Precyzowanie - BROKEN encoding" -ForegroundColor Red
Write-Host "         Przyklad: zamowic zamiast zamowic-z-ogonkiem" -ForegroundColor DarkRed
Write-Host "         Przyklad: Mozesz zamiast Mozesz-z-ogonkiem" -ForegroundColor DarkRed
Write-Host "         Przyczyna: hardcoded string bez UTF-8 lub LLM bez instrukcji PL"
Write-Host ""

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  PODSUMOWANIE" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

$pass = @("Ladowanie strony","Znajdowanie restauracji","Renderowanie kart","Encoding UI","Toggle voice/tiles","Klik w karte otwiera menu")
$fail = @("Greeting intent brak","Vien-Thien brak w bazie","Encoding w trybie Precyzowanie","NLU show_all","Odkrywaj Jedzenie wymaga logowania","LIVE toggle nieobecny")
$blok = @("Vien-Thien = brak danych testowych","Mobile viewport = desktop session","DevTools = niedostepne")

Write-Host ""
Write-Host "  PASS ($($pass.Count)):" -ForegroundColor Green
$pass | ForEach-Object { Write-Host "    [+] $_" -ForegroundColor Green }

Write-Host ""
Write-Host "  FAIL ($($fail.Count)):" -ForegroundColor Red
$fail | ForEach-Object { Write-Host "    [-] $_" -ForegroundColor Red }

Write-Host ""
Write-Host "  BLOKERY ($($blok.Count)):" -ForegroundColor Magenta
$blok | ForEach-Object { Write-Host "    [!] $_" -ForegroundColor Magenta }

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  REKOMENDACJE (priorytety)" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [P0] Fix encoding w trybie Precyzowanie (UTF-8 / LLM system prompt PL)" -ForegroundColor Red
Write-Host "  [P0] Dodaj intencje: greeting, help, show_all do NLU" -ForegroundColor Red
Write-Host "  [P1] Dodaj Vien-Thien do seed/fixtures bazy danych" -ForegroundColor Yellow
Write-Host "  [P1] Odkrywaj Jedzenie - tryb goscia bez hard logowania" -ForegroundColor Yellow
Write-Host "  [P2] LIVE toggle - dodac jezeli Gemini Live planowany" -ForegroundColor White
Write-Host "  [P2] Testy mobile: uzyj Playwright z device emulation lub BrowserStack" -ForegroundColor White
Write-Host ""
Write-Host "  Koniec raportu." -ForegroundColor Cyan
Write-Host ""
