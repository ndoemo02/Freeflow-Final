export function normalizeAssistantFocusText(value: unknown): string {
    return String(value ?? '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ł/g, 'l')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function itemId(item: any): string | null {
    const id = item?.id ?? item?.menuItemId ?? item?.menu_item_id ?? null;
    return id == null ? null : String(id);
}

function displayName(item: any): string {
    return String(item?.display_name || item?.name || item?.base_name || '').trim();
}

function stripMenuSize(name: string): string {
    return name
        .replace(/\b\d+\s*(cm|g|kg|ml|l|szt)\b/gi, ' ')
        .replace(/\b\d+\s*x\s*\d+\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function significantTokens(text: string): string[] {
    return normalizeAssistantFocusText(text)
        .split(' ')
        .filter((token) => token.length >= 3)
        .filter((token) => !['oraz', 'albo', 'jest', 'bedzie', 'menu', 'danie', 'dania', 'opcja', 'miejsce'].includes(token));
}

const LETTER_INDEX: Record<string, number> = {
    a: 0,
    b: 1,
    c: 2,
    d: 3,
    e: 4,
};

function findOptionIndex(text: string): number | null {
    const normalized = normalizeAssistantFocusText(text);
    const match = normalized.match(/\b(?:miejsce|opcja|wariant|restauracja|wybor)\s+([a-e])\b|\b([a-e])\s+(?:to|jest|bedzie)\b/);
    const letter = match?.[1] || match?.[2] || '';
    if (letter && letter in LETTER_INDEX) return LETTER_INDEX[letter];

    if (/\b(?:pierwsza|pierwsze|pierwszy|numer jeden)\b/.test(normalized)) return 0;
    if (/\b(?:druga|drugie|drugi|numer dwa)\b/.test(normalized)) return 1;
    if (/\b(?:trzecia|trzecie|trzeci|numer trzy)\b/.test(normalized)) return 2;

    return null;
}

export function findMentionedRestaurantId(text: unknown, restaurants: any[]): string | null {
    if (!Array.isArray(restaurants) || restaurants.length === 0) return null;
    const normalizedText = normalizeAssistantFocusText(text);
    if (!normalizedText) return null;

    const optionIndex = findOptionIndex(normalizedText);
    if (optionIndex != null && restaurants[optionIndex]) {
        return itemId(restaurants[optionIndex]);
    }

    let bestId: string | null = null;
    let bestIndex = Number.POSITIVE_INFINITY;
    let bestLength = 0;
    restaurants.forEach((restaurant) => {
        const id = itemId(restaurant);
        const name = normalizeAssistantFocusText(displayName(restaurant));
        if (!id || name.length < 3) return;
        const index = normalizedText.indexOf(name);
        if (index < 0) return;
        if (!bestId || index < bestIndex || (index === bestIndex && name.length > bestLength)) {
            bestId = id;
            bestIndex = index;
            bestLength = name.length;
        }
    });

    return bestId;
}

export function extractMentionedRestaurantIdsInOrder(text: unknown, restaurants: any[]): string[] {
    if (!Array.isArray(restaurants) || restaurants.length === 0) return [];
    const normalizedText = normalizeAssistantFocusText(text);
    if (!normalizedText) return [];

    const mentions: Array<{ id: string; index: number; listIndex: number }> = [];

    restaurants.forEach((restaurant, listIndex) => {
        const id = itemId(restaurant);
        const name = normalizeAssistantFocusText(displayName(restaurant));
        if (!id || name.length < 3) return;
        const index = normalizedText.indexOf(name);
        if (index >= 0) mentions.push({ id, index, listIndex });
    });

    ['a', 'b', 'c', 'd', 'e'].forEach((letter) => {
        const listIndex = LETTER_INDEX[letter];
        const id = restaurants[listIndex] ? itemId(restaurants[listIndex]) : null;
        if (!id) return;
        const match = normalizedText.match(new RegExp(`\\b(?:miejsce|opcja|wariant|restauracja)\\s+${letter}\\b|\\b${letter}\\s+(?:to|jest|bedzie)\\b`));
        if (match?.index != null) mentions.push({ id, index: match.index, listIndex });
    });

    const seen = new Set<string>();
    return mentions
        .sort((a, b) => a.index - b.index || a.listIndex - b.listIndex)
        .map((mention) => mention.id)
        .filter((id) => {
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
}

export function findMentionedMenuItemId(text: unknown, items: any[]): string | null {
    if (!Array.isArray(items) || items.length === 0) return null;
    const normalizedText = normalizeAssistantFocusText(text);
    if (!normalizedText) return null;

    let bestId: string | null = null;
    let bestIndex = Number.POSITIVE_INFINITY;
    let bestScore = 0;

    items.forEach((item) => {
        const id = itemId(item);
        const rawName = displayName(item);
        if (!id || !rawName) return;

        const variants = [
            normalizeAssistantFocusText(rawName),
            normalizeAssistantFocusText(stripMenuSize(rawName)),
        ].filter((variant, index, all) => variant.length >= 3 && all.indexOf(variant) === index);

        for (const variant of variants) {
            const index = normalizedText.indexOf(variant);
            if (index >= 0) {
                const score = 1000 + variant.length;
                if (!bestId || score > bestScore || (score === bestScore && index < bestIndex)) {
                    bestId = id;
                    bestIndex = index;
                    bestScore = score;
                }
            }
        }

        const tokens = significantTokens(stripMenuSize(rawName));
        if (tokens.length === 0) return;
        const matchedTokens = tokens.filter((token) => normalizedText.includes(token));
        const minTokens = tokens.length === 1 ? 1 : 2;
        if (matchedTokens.length < minTokens) return;

        const firstIndex = Math.min(...matchedTokens.map((token) => normalizedText.indexOf(token)).filter((index) => index >= 0));
        const score = matchedTokens.length * 100 + matchedTokens.join('').length;
        if (!bestId || score > bestScore || (score === bestScore && firstIndex < bestIndex)) {
            bestId = id;
            bestIndex = firstIndex;
            bestScore = score;
        }
    });

    return bestId;
}
