import type {
  ParserChipEvent,
  TaxonomyChip,
  TaxonomyChipState,
  TaxonomyDimension,
} from '../types/discoveryTaxonomy';

export interface PresentedTaxonomyChip extends TaxonomyChip {
  state: TaxonomyChipState;
  stateLabel: string;
}

type UnknownRecord = Record<string, unknown>;

const DIMENSION_PRIORITY: Record<TaxonomyDimension, number> = {
  variant: 0,
  dietary: 1,
  tag: 2,
  priceBand: 3,
  proximity: 4,
  sort: 5,
  category: 6,
  vibe: 7,
  topGroup: 8,
};

const STATE_LABELS: Record<TaxonomyChipState, string> = {
  recognized: 'Rozpoznano w zapytaniu',
  verified: 'Potwierdzone w menu',
  unknown: 'Brak danych w menu',
  no_match: 'Brak dopasowania',
  unresolved: 'Wymaga doprecyzowania',
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? value as UnknownRecord : null;
}

function getParserEvent(response: unknown): ParserChipEvent | null {
  const root = asRecord(response);
  if (!root) return null;
  const meta = asRecord(root.meta);
  const candidates = [
    ...(Array.isArray(root.events) ? root.events : []),
    ...(Array.isArray(meta?.events) ? meta.events : []),
  ];
  const event = candidates.find((candidate) => asRecord(candidate)?.type === 'parser_chips');
  return event ? event as ParserChipEvent : null;
}

function collectFeedback(response: unknown): Map<string, TaxonomyChipState> {
  const root = asRecord(response);
  const feedback = new Map<string, TaxonomyChipState>();
  const restaurants = Array.isArray(root?.restaurants) ? root.restaurants : [];

  for (const restaurant of restaurants) {
    const record = asRecord(restaurant);
    const entries = Array.isArray(record?.discovery_filter_feedback)
      ? record.discovery_filter_feedback
      : [];
    for (const entry of entries) {
      const item = asRecord(entry);
      if (typeof item?.id !== 'string') continue;
      const state = item.state;
      if (state === 'verified' || state === 'unknown' || state === 'no_match') {
        feedback.set(item.id, state);
      }
    }
  }

  return feedback;
}

function unresolvedChip(token: string): PresentedTaxonomyChip {
  return {
    id: `variant:${token}`,
    emoji: '?',
    labelPl: token,
    dimension: 'variant',
    state: 'unresolved',
    stateLabel: STATE_LABELS.unresolved,
  };
}

/**
 * Presents only constraints understood by discovery.
 * It intentionally does not inspect menu item names and never drives menu focus.
 */
export function derivePresentedTaxonomyChips(
  response: unknown,
  maxVisible = 3,
): PresentedTaxonomyChip[] {
  const event = getParserEvent(response);
  if (!event) return [];

  const feedback = collectFeedback(response);
  const unresolved = (event.unresolved ?? [])
    .filter((token): token is string => typeof token === 'string' && token.trim().length > 0)
    .map((token) => unresolvedChip(token.trim()));

  const recognized = (event.chips ?? []).map((chip): PresentedTaxonomyChip => {
    const state = feedback.get(chip.id) ?? chip.state ?? 'recognized';
    return {
      ...chip,
      state,
      stateLabel: STATE_LABELS[state],
    };
  });

  const hasNear = recognized.some((chip) => chip.dimension === 'proximity' && chip.id === 'near');
  return [...unresolved, ...recognized]
    .filter((chip) => !(hasNear && chip.dimension === 'sort' && chip.id === 'sort_distance'))
    .filter((chip, index, chips) => chips.findIndex((candidate) => candidate.id === chip.id) === index)
    .sort((a, b) => DIMENSION_PRIORITY[a.dimension] - DIMENSION_PRIORITY[b.dimension])
    .slice(0, Math.max(0, maxVisible));
}
