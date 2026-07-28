export type TopGroupID =
  | 'fast_food'
  | 'pizza_italian'
  | 'asian'
  | 'polish'
  | 'grill'
  | 'desserts_cafe';

export type CategoryID =
  | 'burgers' | 'kebab' | 'pizza_takeaway' | 'hot_snacks'
  | 'pizza' | 'pasta' | 'risotto'
  | 'sushi' | 'ramen_noodles' | 'vietnamese' | 'chinese' | 'thai'
  | 'pierogi' | 'zupy' | 'tradycyjne'
  | 'kebab_grill' | 'steak' | 'bbq'
  | 'cafe' | 'cake_bakery' | 'ice_cream';

export type CoreTag = 'spicy' | 'vege' | 'quick' | 'open_now' | 'delivery';
export type VibeID = 'romantic' | 'cozy' | 'business' | 'loud' | 'family';
export type DietaryID = 'vegan' | 'vegetarian' | 'gluten_free' | 'keto' | 'halal' | 'lactose_free';
export type PriceBand = 'budget' | 'mid' | 'premium';
export type DiscoverySort = 'distance' | 'price' | 'rating';
export type Proximity = 'near';
export type DiscoverySource = 'deterministic' | 'fallback';

export type TaxonomyDimension =
  | 'topGroup'
  | 'category'
  | 'tag'
  | 'vibe'
  | 'dietary'
  | 'priceBand'
  | 'proximity'
  | 'sort'
  | 'variant';

export type TaxonomyChipState =
  | 'recognized'
  | 'verified'
  | 'unknown'
  | 'no_match'
  | 'unresolved';

export type TaxonomyID =
  | TopGroupID
  | CategoryID
  | CoreTag
  | VibeID
  | DietaryID
  | PriceBand
  | Proximity
  | `sort_${DiscoverySort}`
  | `variant:${string}`;

export interface TaxonomyDisplayEntry {
  emoji: string;
  labelPl: string;
}

export interface ParsedQuery {
  topGroups: TopGroupID[];
  categories: CategoryID[];
  tags: CoreTag[];
  vibes: VibeID[];
  dietarys: DietaryID[];
  priceBand?: PriceBand | null;
  sort?: DiscoverySort | null;
  proximity?: Proximity | null;
  unresolved?: string[];
  source?: DiscoverySource;
  open_now: boolean;
  confidence: 'deterministic' | 'partial' | 'empty';
  rawText: string;
}

export interface TaxonomyChip {
  id: TaxonomyID;
  emoji: string;
  labelPl: string;
  dimension: TaxonomyDimension;
  state?: TaxonomyChipState;
}

export interface ParserChipEvent {
  type: 'parser_chips';
  chips: TaxonomyChip[];
  confidence: 'deterministic' | 'partial' | 'empty';
  unresolved?: string[];
  source?: DiscoverySource;
}
