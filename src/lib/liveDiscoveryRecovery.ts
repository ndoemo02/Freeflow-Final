const FOOD_QUERY_PATTERNS: Array<[RegExp, string]> = [
  [/\bpizz(?:a|e|y|ie)?\b/i, 'pizza'],
  [/\blasagn(?:a|e|i)?\b/i, 'lasagne'],
  [/\bmakaron(?:u|em|y)?\b/i, 'makaron'],
  [/\bwolowin(?:a|e|y|a|ie)?\b/i, 'wołowina'],
  [/\bburger(?:a|y|ow|em)?\b/i, 'burger'],
  [/\bkebab(?:a|y|ow|em)?\b/i, 'kebab'],
  [/\bpierog(?:i|ow|ami)?\b/i, 'pierogi'],
  [/\bsushi\b/i, 'sushi'],
  [/\bnap(?:oj|oje|oju|ojow)\b/i, 'napój'],
  [/\bkaw(?:a|e|y|a|ie)?\b/i, 'kawa'],
];

export function normalizeLiveSpeech(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function looksLikeFoodDiscoveryIntent(text: string): boolean {
  const normalized = normalizeLiveSpeech(text);
  if (!normalized) return false;
  return /\b(w poblizu|poblizu|blisko|obok|nearby|w okolicy|zamow|zamowic|restaurac|jedzeni|kuchni|pizza|lasagn|makaron|wolowin|burger|kebab|pierog|sushi|napoj|kaw)\b/.test(normalized);
}

export function looksLikeFoodDiscoveryFailure(text: string): boolean {
  const normalized = normalizeLiveSpeech(text);
  if (!normalized) return false;

  const asksForLocation =
    /\b(miasto|kod pocztowy|lokalizacj|gdzie mieszkasz|gdzie jestes)\b/.test(normalized)
    && /\b(podaj|potrzebuje|musze znac|zebym mogla|zeby moc|zebym mogla zamowic)\b/.test(normalized);
  const refusesCapability = /\b(nie moge|nie mam mozliwosci|nie mam dostepu|nie potrafie|nie jestem w stanie|duzym modelem jezykowym|modelem jezykowym|jako model jezykowy|nie moge powiedziec gdzie|nie moge znalezc|nie znam twojej okolicy)\b/.test(normalized);

  return asksForLocation || refusesCapability;
}

export function extractFoodDiscoveryQuery(text: string): string | undefined {
  const normalized = normalizeLiveSpeech(text);
  for (const [pattern, canonical] of FOOD_QUERY_PATTERNS) {
    if (pattern.test(normalized)) return canonical;
  }
  return undefined;
}
