import { create } from 'zustand';

export interface TaxonomyChip {
  id: string;
  emoji: string;
  labelPl: string;
  dimension: 'topGroup' | 'category' | 'tag' | 'vibe' | 'dietary';
}

interface IntentChipsState {
  chips: TaxonomyChip[];
  confidence: 'deterministic' | 'partial' | 'empty';
  setChips: (chips: TaxonomyChip[], confidence: string) => void;
  clearChips: () => void;
}

export const useIntentChipsStore = create<IntentChipsState>((set) => ({
  chips: [],
  confidence: 'empty',
  setChips: (chips, confidence) => set({ chips, confidence: confidence as IntentChipsState['confidence'] }),
  clearChips: () => set({ chips: [], confidence: 'empty' }),
}));
