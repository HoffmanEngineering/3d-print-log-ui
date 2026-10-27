import type { LabelFields } from 'src/app/shared/label-scanner/label-fields';
import type { CatalogMatch, TagSuggestionReason } from './tag-reading';

/** A barcode or QR code decoded from a spool label. `format` is the API's lowercase name. */
export interface Barcode {
  value: string;
  format: string;
}

/** A barcode stored on a spool. */
export interface FilamentBarcode extends Barcode {
  id: number;
}

/** What a label says: the phone's OCR fields plus the brand and color name the API found. */
export interface LabelReading {
  brand: string | null;
  materialType: string | null;
  colorName: string | null;
  netWeightG: number | null;
  diameterMm: number | null;
  hotendMinC: number | null;
  hotendMaxC: number | null;
  bedMinC: number | null;
  bedMaxC: number | null;
}

export type LabelMatchReason =
  | 'same-barcode'
  | 'same-color-name'
  | TagSuggestionReason;

/** One of the user's spools a label may be. */
export interface LabelOwnMatch {
  filamentId: string;
  score: number;
  reasons: LabelMatchReason[];
}

export interface LabelReadRequest {
  barcodes: Barcode[];
  ocrText?: string;
  fields?: LabelFields;
}

export interface LabelReadResponse {
  reading: LabelReading;
  catalogMatch: CatalogMatch | null;
  ownMatches: LabelOwnMatch[];
  /** The request's barcodes, normalized as the API stores them; invalid ones dropped. */
  barcodes: Barcode[];
}

/** What the brand re-match sends: what the add form knows. */
export interface CatalogMatchRequest {
  brand?: string | null;
  materialType?: string | null;
  colorName?: string | null;
  netWeightG?: number | null;
  diameterMm?: number | null;
}

/** What the Materials list passes to a new material in navigation state after a label scan. */
export interface ScannedLabelRead {
  reading: LabelReading;
  catalogMatch: CatalogMatch | null;
  barcodes: Barcode[];
}
