/**
 * discoveryTaxonomy.ts
 * ─────────────────────────────────────────────────────────────
 * Typy taksonomiczne dla frontendu.
 * Mirror typów z backend/api/brain/discovery/queryUnderstanding.ts
 *
 * Używane przez:
 *   - IntentChips (chipsy nad Voice Barem)
 *   - Discovery results rendering
 *   - Filter UI
 * ─────────────────────────────────────────────────────────────
 */

// ─── L1: Top Groups ──────────────────────────────────────────

export type TopGroupID =
  | 'fast_food'
  | 'pizza_italian'
  | 'asian'
  | 'polish'
  | 'grill'
  | 'desserts_cafe';

// ─── L2: Categories ──────────────────────────────────────────

export type CategoryID =
  | 'burgers' | 'kebab' | 'pizza_takeaway' | 'hot_snacks'
  | 'pizza' | 'pasta' | 'risotto'
  | 'sushi' | 'ramen_noodles' | 'vietnamese' | 'chinese' | 'thai'
  | 'pierogi' | 'zupy' | 'tradycyjne'
  | 'kebab_grill' | 'steak' | 'bbq'
  | 'cafe' | 'cake_bakery' | 'ice_cream';

// ─── Core Tags ───────────────────────────────────────────────

export type CoreTag = 'spicy' | 'vege' | 'quick' | 'open_now' | 'delivery';

// ─── Vibe ────────────────────────────────────────────────────

export type VibeID = 'romantic' | 'cozy' | 'business' | 'loud' | 'family';

// ─── Dietary ─────────────────────────────────────────────────

export type DietaryID = 'vegan' | 'vegetarian' | 'gluten_free' | 'keto' | 'halal' | 'lactose_free';

// ─── Taxonomy IDs (wszystkie wymiary w jednym union) ─────────

export type TaxonomyID = TopGroupID | CategoryID | CoreTag | VibeID | DietaryID;

// ─── Display Entry ───────────────────────────────────────────

export interface TaxonomyDisplayEntry {
  emoji: string;
  labelPl: string;
}

// ─── Parsed Query (z backendu) ───────────────────────────────

export interface ParsedQuery {
  topGroups: TopGroupID[];
  categories: CategoryID[];
  tags: CoreTag[];
  vibes: VibeID[];
  dietarys: DietaryID[];
  open_now: boolean;
  confidence: 'deterministic' | 'partial' | 'empty';
  rawText: string;
}

// ─── Chip (do renderowania w UI) ─────────────────────────────

export interface TaxonomyChip {
  id: TaxonomyID;
  emoji: string;
  labelPl: string;
  dimension: 'topGroup' | 'category' | 'tag' | 'vibe' | 'dietary';
}

// ─── Event z parsera do frontendu ────────────────────────────

export interface ParserChipEvent {
  type: 'parser_chips';
  chips: TaxonomyChip[];
  confidence: 'deterministic' | 'partial' | 'empty';
}
