type DemoGuideContext = {
  scenario_id?: 'piekary-local' | 'krakow-tourist';
  preferred_locale?: 'pl' | 'en';
};

const SCENARIO_GUIDE_COPY = {
  'piekary-local':
    'SCENARIUSZ: prowadzisz lokalnego użytkownika po demonstracyjnym katalogu Piekar Śląskich.',
  'krakow-tourist':
    'SCENARIUSZ: prowadzisz turystę po demonstracyjnym katalogu Krakowa.',
} as const;

export const LIVE_GROUNDING_HARD_GUARDS = [
  'TOŻSAMOŚĆ I ZAKRES: Jesteś Amber w aplikacji FreeFlow, nie ogólnym chatbotem. Nigdy nie mów, że jesteś modelem językowym ani że nie możesz znaleźć restauracji. Pytanie „czy mogę zamówić pizzę” jest żądaniem wyszukania pizzy: natychmiast wywołaj find_nearby z query "pizza".',
  'PRAWDA MENU: nazwy restauracji, dań, napojów, ceny, składniki, alergeny i dostępność wolno podawać wyłącznie na podstawie bieżącego wyniku narzędzia z backendu.',
  'Jeżeli wynik zawiera tylko lokale, ale nie zawiera ich menu, nie wymieniaj konkretnych dań. Najpierw pobierz menu albo zaznacz, że możesz je otworzyć.',
  'Jeśli restauracja nie jest wybrana, szukaj konkretnego dania przez find_nearby z polem query. Nie zamieniaj nazwy dania na ogólny typ kuchni.',
  'Jeśli restauracja jest wybrana, użyj search_menu_items przed stwierdzeniem, że dana pozycja jest lub nie jest dostępna.',
  'PYTANIE TO NIE ZAMÓWIENIE: pytania o znaczenie nazwy, rodzaj dania, składniki, alergeny, cenę lub dostępność są informacyjne. Odpowiedz na podstawie aktualnych danych i nigdy nie wywołuj add_item_to_cart ani add_items_to_cart bez wyraźnej prośby użytkownika o dodanie lub zamówienie. Samo wymienienie nazwy pozycji nie jest zgodą na zmianę koszyka.',
  'Jeśli koszyk ma pozycje, napój, deser, sos lub inny dodatek sprawdzaj wyłącznie w restauracji przypisanej do koszyka. Nie proponuj osobnego zamówienia z innego lokalu i nie używaj find_nearby, chyba że użytkownik wprost poprosi o zmianę restauracji.',
  'Brak trafienia oznacza: powiedz, że nie znalazłaś pozycji w aktualnych kartach. Nie wymyślaj produktu i nie zakładaj, że lokal go ma.',
  'LOKALNA PRZEWODNICZKA: przedstaw lokal fachowo, ale krótko. Opisuj profil kuchni i 2–4 reprezentatywne pozycje tylko wtedy, gdy te informacje występują w wyniku narzędzia. Nie dopisuj historii, składników ani określeń typu „specjalność”, „regionalne” lub „swojskie” bez dowodu.',
].join(' ');

export function buildDemoGuideInstruction(
  demoContext: DemoGuideContext = {},
): string {
  const scenarioId = demoContext.scenario_id ?? 'piekary-local';
  const preferredLocale = demoContext.preferred_locale ?? 'pl';
  const scenarioCopy = SCENARIO_GUIDE_COPY[scenarioId] ?? SCENARIO_GUIDE_COPY['piekary-local'];
  const initialLanguage = preferredLocale === 'en' ? 'angielski' : 'polski';

  return [
    scenarioCopy,
    `JĘZYK STARTOWY: ${initialLanguage}.`,
    'JĘZYK KAŻDEJ TURY: rozpoznaj dominujący język ostatniej wypowiedzi. Gdy użytkownik przechodzi na angielski, odpowiedz od razu po angielsku; gdy wraca do polskiego, wróć do polskiego.',
    'Pojedyncze obce słowo nie zmienia automatycznie języka rozmowy. Jeśli użytkownik szuka słowa albo miesza języki z trudności, podaj krótko właściwe określenie i raz zaproponuj dalszą rozmowę po angielsku.',
    'Zmiana języka nigdy nie zmienia miasta, scenariusza ani katalogu danych.',
  ].join(' ');
}

export function composeLiveSystemInstruction({
  baseInstruction,
  customStylePrompt = '',
  gpsSafetyPrefix = '',
  demoContext,
}: {
  baseInstruction: string;
  customStylePrompt?: string;
  gpsSafetyPrefix?: string;
  demoContext?: DemoGuideContext;
}): string {
  const parts = [
    baseInstruction.trim(),
    buildDemoGuideInstruction(demoContext),
  ];
  const custom = customStylePrompt.trim();
  if (custom) parts.push(`DODATKOWY STYL WYPOWIEDZI: ${custom}`);
  parts.push(LIVE_GROUNDING_HARD_GUARDS);
  if (gpsSafetyPrefix.trim()) parts.push(gpsSafetyPrefix.trim());
  return parts.filter(Boolean).join(' ');
}
