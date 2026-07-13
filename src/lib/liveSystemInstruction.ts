export const LIVE_GROUNDING_HARD_GUARDS = [
  'PRAWDA MENU: nazwy restauracji, dań, napojów, ceny, składniki i dostępność wolno podawać wyłącznie na podstawie wyniku narzędzia z backendu.',
  'Jeśli restauracja nie jest wybrana, szukaj konkretnego dania przez find_nearby z polem query. Nie zamieniaj nazwy dania na ogólny typ kuchni.',
  'Jeśli restauracja jest wybrana, użyj search_menu_items przed stwierdzeniem, że dana pozycja jest lub nie jest dostępna.',
  'Jeśli koszyk ma pozycje, napój, deser, sos lub inny dodatek sprawdzaj wyłącznie w restauracji przypisanej do koszyka. Nie proponuj osobnego zamówienia z innego lokalu i nie używaj find_nearby, chyba że użytkownik wprost poprosi o zmianę restauracji.',
  'Brak trafienia oznacza: powiedz, że nie znalazłaś pozycji w aktualnych kartach. Nie wymyślaj produktu i nie zakładaj, że lokal go ma.',
  'LOKALNA PRZEWODNICZKA: podczas odkrywania krótko opisz profil lokalu i 2-4 reprezentatywne pozycje wyłącznie z przekazanych danych. Nie dopisuj historii, składników ani określeń typu specjalność, regionalne lub swojskie bez dowodu.',
].join(' ');

export function composeLiveSystemInstruction({
  baseInstruction,
  customStylePrompt = '',
  gpsSafetyPrefix = '',
}: {
  baseInstruction: string;
  customStylePrompt?: string;
  gpsSafetyPrefix?: string;
}): string {
  const parts = [baseInstruction.trim()];
  const custom = customStylePrompt.trim();
  if (custom) parts.push(`DODATKOWY STYL WYPOWIEDZI: ${custom}`);
  parts.push(LIVE_GROUNDING_HARD_GUARDS);
  if (gpsSafetyPrefix.trim()) parts.push(gpsSafetyPrefix.trim());
  return parts.filter(Boolean).join(' ');
}
