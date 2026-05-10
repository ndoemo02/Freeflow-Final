 mamy regresje  na vercel, nie łapie GPS od razu i myli pierwsze słowo, jak pyta o adres, a ja mówię Piekary Śląskie - to mówi zazwyczaj jakies miasto od czapki, np Ciechocinek, albo Zgierz, co nawet nie
  brzmui podobnie,  mam taakie wrażenie że często ją odcina gdzies z poczatku bo czasem też jakby jest okej ale powie pół zdania i stop np.

● To są trzy osobne problemy. Rozdzielmy je i zdiagnozujmy każde z osobna. Zaczynam od sprawdzenia, co mogło się zmienić w tych obszarach.

  Searched for 4 patterns, read 2 files (ctrl+o to expand)

● Przeanalizowałem trzy problemy. Wszystkie wskazują na przeciążenie kontekstu Gemini przez rozbudowane compactToolResponse.

  Root cause: Dodaliśmy image_url, opening_hours, safety itd. do compactowanych odpowiedzi dla Gemini. To są długie stringi — samo image_url to ~150 znaków × 12 pozycji menu = ~1800 znaków extra. opening_hours
   z weekday_text (7 stringów) to kolejne ~500 znaków na restaurację. Gemini dostaje 2-3× więcej danych niż wcześniej, a im więcej danych, tym bardziej degraduje:

  1. Lokalizacje z czapki — przy pełnym kontekście ASR zaczyna halucynować
  2. Ucinanie w pół zdania — generowanie odpowiedzi jest przerywane przy przeciążeniu
  3. GPS nie łapie — model ignoruje GPS na rzecz halucynowanej lokalizacji z kontekstu

  Kluczowe: Gemini nie potrzebuje image_url ani pełnego opening_hours. Frontend dostaje te dane z pełnej odpowiedzi (nie compactowanej). Compact jest tylko dla Gemini.

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 ☐ compactToolResponse trim

Jak chcesz odchudzić compactToolResponse?

❯ 1. Tylko image_url (zalecane)
     Usuwam image_url z compacta (find_nearby, show_menu, cart). opening_hours i safety zostają. To największy zysk (~30% mniej payloadu). Najmniejsze ryzyko.
  2. image_url + opening_hours
     Usuwam image_url i opening_hours z compacta. Zastępuję opening_hours prostym is_open: true/false. ~40% mniej payloadu.
  3. Agresywny trim
     Usuwam image_url, opening_hours, upraszczam safety do samego removable, skracam desc do 40 znaków. ~55% mniej payloadu. Większe ryzyko utraty danych dla reguł.
  4. Inne / opiszę w czacie
     Masz własny pomysł co usunąć/zostawić — opisz go.
  5. Type something.
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  6. Chat about this