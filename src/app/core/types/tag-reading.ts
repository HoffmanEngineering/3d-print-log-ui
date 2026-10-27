import type { FilamentDetail } from '../services/filament.service';

/** A spool tag's decoded contents. Mirrors the API's TagReading; every field is optional. */
export interface TagReading {
  format?: string;
  /** 0 = none. */
  decoderVersion?: number;
  brand?: string;
  manufacturer?: string;
  materialType?: string;
  materialSubtype?: string;
  materialSubtypeCode?: number;
  colors?: string[];
  alpha?: number;
  diameterMm?: number;
  netWeightG?: number;
  lengthM?: number;
  hotendMinC?: number;
  hotendMaxC?: number;
  firstLayerHotendC?: number;
  hotendC?: number;
  bedMinC?: number;
  bedMaxC?: number;
  dryTempC?: number;
  dryHours?: number;
  sku?: string;
  /** ISO date string. */
  manufacturedOn?: string;
  extras?: Record<string, string>;
  warnings?: string[];
}

export interface CatalogMatch {
  id: string;
  confidence: number;
  spoolWeightG: number | null;
  colorName: string | null;
  name: string;
  manufacturer: string;
  /** g/cm³. Absent from an API older than the density field. */
  densityGramPerCubicCm?: number | null;
  source: 'SpoolmanDB';
  /** °C, when SpoolmanDB has them. Absent from an API older than label scanning. */
  extruderTempMinC?: number | null;
  extruderTempMaxC?: number | null;
  extruderTempC?: number | null;
  bedTempC?: number | null;
}

export type TagSuggestionReason =
  | 'same-material'
  | 'close-color'
  | 'same-brand'
  | 'same-weight'
  | 'untagged';

export interface TagSuggestion {
  filamentId: string;
  score: number;
  reasons: TagSuggestionReason[];
}

export interface TagReadResponse {
  status: 'linked' | 'unknown';
  filament: FilamentDetail | null;
  reading: TagReading | null;
  catalogMatch: CatalogMatch | null;
  suggestions: TagSuggestion[];
  hint: 'hold-still' | null;
}

export interface ReaderConfig {
  formats: { id: string; scheme: string; params: Record<string, string> }[];
}

export interface FilamentTagDetail {
  uid: string;
  format: string | null;
  reading: TagReading | null;
  lastReadAt: string | null;
}
