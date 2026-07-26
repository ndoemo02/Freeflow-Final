# FreeFlow MVP Demo Test Scenarios

Cel: szybki smoke przed nagraniem 60-90 sekundowego demo. Testujemy produktowy flow, nie debugujemy Live runtime.

## Scenariusz 1 - szybkie zamówienie

Komenda:

> Pokaż Monte Carlo. Dodaj Capricciosę. Przejdź do koszyka.

Oczekiwane:

- restauracja Monte Carlo jest otwarta,
- produkt trafia do koszyka,
- checkout jest otwarty,
- UI nie pokazuje surowych ID ani napisów technicznych.

## Scenariusz 2 - eksploracja menu

Komenda:

> Pokaż menu Dwór Hubertus. Co polecasz dla dzieci? Dodaj kluski.

Oczekiwane:

- menu restauracji jest pokazane,
- focus karty zmienia się na polecaną lub dopasowaną pozycję,
- produkt zostaje dodany do koszyka,
- transkrypcja w Voice Dock wygląda produktowo jako `Ty: ...`, `Amber: ...` albo `Rozpoznano: ...`.

## Scenariusz 3 - odporność na błędną transkrypcję

Komenda:

> Chcę zamówić lody w Piekarach.

Oczekiwane:

- system nie mapuje tego na piekarnię/bakery,
- wynik dotyczy deserów, lodów albo lokali z deserami,
- jeśli rozpoznanie jest niepewne, system pyta o doprecyzowanie zamiast wymyślać lokal.

## Checklist przed nagraniem

- Odśwież aplikację twardo albo uruchom PWA od nowa.
- Zacznij od czystego koszyka.
- Mów jednym zdaniem na turn i poczekaj na kartę/odpowiedź.
- Nie nagrywaj paneli debug/admin, chyba że celowo pokazujesz diagnostykę.
- Jeśli STT wygląda krzywo, oceniaj flow po tool result i koszyku, nie po samej linijce transkrypcji.
