import type { CatalogMatch, TagReading } from '../core/types/tag-reading';

/** The new-material form controls a tag or catalog entry can pre-fill. */
export type PrefillControl =
  | 'brand'
  | 'materialType'
  | 'displayName'
  | 'colors'
  | 'colorHex'
  | 'colorName'
  | 'diameterMm'
  | 'initialNominalWeightG'
  | 'initialNominalLengthM'
  | 'spoolWeightG'
  | 'tempRangeStart'
  | 'tempRangeEnd'
  | 'recommendedTemp'
  | 'recommendedBedTemp';

export type PrefillSource = 'tag' | 'catalog';

export interface TagPrefill {
  values: Partial<Record<PrefillControl, unknown>>;
  sources: Partial<Record<PrefillControl, PrefillSource>>;
}

/** What the Materials list passes to a new material in navigation state. */
export interface ScannedTagRead {
  reading: TagReading | null;
  catalogMatch: CatalogMatch | null;
}

/** The form holds at most this many color stops. */
const MAX_COLORS = 8;

const HEX_COLOR = /^#?([0-9a-f]{6})$/i;

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/**
 * What a scanned tag and its SpoolmanDB match say, as new-material form values, with where each
 * came from. Absent values are left out, never set to null. The form has no transparency, so a
 * tag's alpha is ignored.
 */
export function tagPrefill(
  reading: TagReading | null,
  match: CatalogMatch | null
): TagPrefill {
  const values: TagPrefill['values'] = {};
  const sources: TagPrefill['sources'] = {};

  const set = (
    control: PrefillControl,
    value: unknown,
    source: PrefillSource
  ) => {
    if (value === undefined) return;
    values[control] = value;
    sources[control] = source;
  };

  if (reading) {
    set('brand', text(reading.brand) ?? text(reading.manufacturer), 'tag');
    set('materialType', text(reading.materialType), 'tag');

    const colors = (Array.isArray(reading.colors) ? reading.colors : [])
      .map((c) => (typeof c === 'string' ? HEX_COLOR.exec(c.trim()) : null))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => '#' + m[1].toLowerCase())
      .slice(0, MAX_COLORS);
    if (colors.length > 0) {
      set('colors', colors, 'tag');
      set('colorHex', colors[0], 'tag');
    }

    set('diameterMm', num(reading.diameterMm), 'tag');
    set('initialNominalWeightG', num(reading.netWeightG), 'tag');
    set('initialNominalLengthM', num(reading.lengthM), 'tag');
    set('tempRangeStart', num(reading.hotendMinC), 'tag');
    set('tempRangeEnd', num(reading.hotendMaxC), 'tag');
    set('recommendedTemp', num(reading.hotendC), 'tag');
    set(
      'recommendedBedTemp',
      num(reading.bedMaxC) ?? num(reading.bedMinC),
      'tag'
    );
  }

  const subtype = text(reading?.materialSubtype);
  const type = text(reading?.materialType);
  const catalogName = text(match?.name);
  if (catalogName) {
    set('displayName', catalogName, 'catalog');
  } else if (subtype) {
    set('displayName', [subtype, type].filter(Boolean).join(' '), 'tag');
  }

  if (match) {
    set('colorName', text(match.colorName), 'catalog');
    set('spoolWeightG', num(match.spoolWeightG), 'catalog');
  }

  return { values, sources };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Checks navigation state (untrusted: anyone can set history.state) before it is used. Returns
 * null when the shape is not plausible, so the page behaves as it does without a scan.
 */
export function parseScannedTagRead(raw: unknown): ScannedTagRead | null {
  if (!isRecord(raw)) return null;

  const { reading, catalogMatch } = raw;
  if (reading != null && !isRecord(reading)) return null;
  if (
    catalogMatch != null &&
    !(
      isRecord(catalogMatch) &&
      typeof catalogMatch['id'] === 'string' &&
      catalogMatch['id'].trim() !== ''
    )
  ) {
    return null;
  }

  return {
    reading: (reading as TagReading | null | undefined) ?? null,
    catalogMatch: (catalogMatch as CatalogMatch | null | undefined) ?? null,
  };
}
