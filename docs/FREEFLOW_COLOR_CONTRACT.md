# FREEFLOW — COLOR-JOB CONTRACT
**Cel:** zatrzymać dryf kolorów między iteracjami. Każdy kolor ma JEDNĄ robotę → agent przestaje zgadywać.
**Dla:** Claude Code. **Źródło prawdy kolorów:** `freeflow-tokens.css` — każdy kolor przez token semantyczny, **ZERO hex inline w komponentach**.

---

## ZASADA NACZELNA
3 kolory, 3 role, zero wyjątków.
**Glow należy wyłącznie do zimnego (głos), tylko na momentach głosu. Jedzenie zostaje ciepłe i płaskie.**

---

## TOKENY → ROLA → GRANICE
Wprowadź warstwę **semantyczną** (raw paleta → tokeny roli). Komponenty odwołują się TYLKO do roli, nigdy do surowej palety ani hex.

| Token | Hex | JEDYNA robota | NIGDY |
|---|---|---|---|
| `--ff-action` | `#FF7A1C` amber | co robi **USER**: Dodaj, aktywna kategoria, ilość +/−, checkout, główne CTA | ceny, tła kart, glow dekoracyjny |
| `--ff-price` | `#F6B73C` gold | **wyłącznie ceny** (tabular-nums) | przyciski, ikony, akcenty, bordery |
| `--ff-voice` | `#3DDCC3` teal | **głos Amber + system**: orb, „Amber wybiera” + nitka, słucham, potwierdzenia, intent-tagi | przyciski akcji, ceny, bordery kart jedzenia |
| `--ff-bg` | `#0c0a09` warm black | tło | — |
| tekst | `#f4efe9` / dim / faint | hierarchia treści | jako kolor marki / akcent |

> Neutralne szarości = wszystko **bez roli**: nieaktywne chipsy, hairline, opisy dań.

---

## DECYZJA: „Dodaj” = AMBER (zablokowane)
Tap przycisku to akcja **usera** → `--ff-action`. Wszędzie: hero, okrągłe „+”, checkout.
Klaps (2A/2B) robi to dobrze. Rezydencja (teal „Dodaj”) = błąd do naprawy.

> **Jedyna dopuszczalna alternatywa** (wybierasz raz, globalnie): jeśli „dodaj” ma być **autonomiczną** akcją Amber („Amber dodaje za ciebie”) → wtedy WSZYSTKIE add na `--ff-voice`. Mieszać nie wolno. **Domyślnie: amber.**

---

## REGUŁA GLOW (operacyjna)
- Świecić wolno TYLKO elementom z `data-voice`. Glow = box-shadow w `--ff-voice`.
- **Maks. JEDEN** ambient/breathing glow na ekran = aktywny moment głosu („Amber poleca” / „Amber wybiera”).
- Jedzenie, ceny, przyciski akcji, karty: **glow = 0**. Karty: hairline 1px, **nigdy** neon outline.
- To samo prawo co przy gameappie — teraz egzekwowane przez **znaczenie**, nie przez „mniej neonu”.

---

## RETIRE / ZLEJ (źródło dryfu)
1. **Usuń cyan `#00E5FF`** (i `#A6F3FF`) z palety — duplikuje robotę `--ff-voice`. Jeden zimny ton, koniec.
2. Dock „listening blue” → ten sam `--ff-voice` (unifikacja).
   *Jedyny dopuszczalny wyjątek: jeśli świadomie chcesz oddzielić „user słucha” od „system mówi” — MAKSYMALNIE dwa zimne, nazwane, nigdzie więcej. Rekomendacja: jeden.*

---

## KONKRETNE SWAPY (z ekranów)
- **Rezydencja (obraz 1, 5):** „+Dodaj” teal → `--ff-action`; okrągłe „+” szare → `--ff-action`.
- **Paski przy miniaturach (obraz 1, 5):** usunąć — nic nie kodują, czysty szum.
- **Neon outline kart (obraz 3):** usunąć → hairline.
- **Cena hero floatująca na zdjęciu (obraz 5):** zejść do treści jako `--ff-price` tekst.
- **Ceny globalnie:** `--ff-price` tekst, tabular-nums, **nigdy** pill z glow.

---

## ŚWIĘTE — NIE RUSZAĆ
**„Amber wybiera” + nitka łącząca hero z daniem (obraz 2A).**
To twój signature voice-first. TU `--ff-voice` + delikatny glow są **zasłużone** (Amber mówi). Glow idzie za głosem — to jego jedyny dom.

---

## DEFINICJA GOTOWOŚCI (DoD)
- [ ] Zero surowych hex w komponentach — wszystko przez tokeny semantyczne
- [ ] Każde „dodaj” w jednym kolorze (amber)
- [ ] Jeden zimny ton w całej apce (cyan usunięty)
- [ ] Glow tylko na `data-voice`, maks. 1 ambient/ekran
- [ ] Zero neon outline na kartach jedzenia
- [ ] Ceny: gold tekst, tabular-nums

---

## PROMPT DO WKLEJENIA (Claude Code)
```
Color-job pass. Tylko warstwa koloru/stylu, zero zmian w pipeline/rdzeniu.
Źródło prawdy: freeflow-tokens.css.

1. Wprowadź tokeny semantyczne: --ff-action(#FF7A1C), --ff-price(#F6B73C),
   --ff-voice(#3DDCC3). Komponenty odwołują się TYLKO do nich. Wyszukaj i zastąp
   wszystkie surowe hex; usuń cyan #00E5FF / #A6F3FF z palety.

2. Każde "Dodaj" i okrągłe "+" → --ff-action (amber). Napraw teal Dodaj w menu
   Rezydencji. Ceny → --ff-price tekst, tabular-nums (nie pill).

3. Glow tylko na elementach data-voice, w kolorze --ff-voice, maks 1 breathing/ekran.
   Usuń neon outline kart → hairline 1px. Usuń kolorowe paski przy miniaturach.

4. NIE RUSZAJ "Amber wybiera" + nitki — to zostaje (voice signature).

Po każdym kroku: node --check + vitest PASS. Raport na górze RAPORTY w CLAUDE.md.
```

---
> **Osobno (poza tym dokumentem — nie zgubić):** #1 przeciek wiarygodności = niedeterministyczny pipeline zdjęć dań (mock dopasowany, produkcja losowa). To fix **danych**, nie koloru.
