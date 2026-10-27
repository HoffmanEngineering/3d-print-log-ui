import type { ScannedLabelRead } from '../core/types/label-reading';
import type { CatalogMatch } from '../core/types/tag-reading';
import type { PrefillControl, PrefillSource, TagPrefill } from './tag-prefill';

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/**
 * What a scanned label and its SpoolmanDB match say, as new-material form values, with where each
 * came from. The catalog wins on name, color, spool weight and density; the label wins on
 * temperatures, which the catalog only fills where the label printed none. Absent values are left
 * out, never set to null.
 */
export function labelPrefill(read: ScannedLabelRead): TagPrefill {
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
  const fill = (
    control: PrefillControl,
    value: unknown,
    source: PrefillSource
  ) => {
    if (!(control in values)) set(control, value, source);
  };

  const { reading, catalogMatch: match } = read;
  set('brand', text(reading.brand), 'label');
  set('materialType', text(reading.materialType), 'label');
  set('colorName', text(reading.colorName), 'label');
  set('diameterMm', num(reading.diameterMm), 'label');
  set('initialNominalWeightG', num(reading.netWeightG), 'label');
  set('tempRangeStart', num(reading.hotendMinC), 'label');
  set('tempRangeEnd', num(reading.hotendMaxC), 'label');
  set(
    'recommendedBedTemp',
    num(reading.bedMaxC) ?? num(reading.bedMinC),
    'label'
  );

  if (match) {
    fill('brand', text(match.manufacturer), 'catalog');
    // A barcode alone reads nothing from the label: the entry supplies what the form requires.
    fill('materialType', text(match.material), 'catalog');
    fill('initialNominalWeightG', num(match.weightG), 'catalog');
    fill('diameterMm', num(match.diameterMm), 'catalog');
    set('displayName', text(match.name), 'catalog');
    set('colorName', text(match.colorName), 'catalog');
    set('spoolWeightG', num(match.spoolWeightG), 'catalog');
    const density = num(match.densityGramPerCubicCm);
    if (density !== undefined && density > 0) {
      set('materialDensityGramPerCubicCm', density, 'catalog');
    }
    fill('tempRangeStart', num(match.extruderTempMinC), 'catalog');
    fill('tempRangeEnd', num(match.extruderTempMaxC), 'catalog');
    fill('recommendedTemp', num(match.extruderTempC), 'catalog');
    fill('recommendedBedTemp', num(match.bedTempC), 'catalog');
  }

  return { values, sources };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Checks navigation state (untrusted: anyone can set history.state) before it is used. Returns
 * null when the shape is not plausible, so the page behaves as a blank add.
 */
export function parseScannedLabelRead(raw: unknown): ScannedLabelRead | null {
  if (!isRecord(raw)) return null;

  const { reading, catalogMatch, barcodes } = raw;
  if (!isRecord(reading)) return null;
  if (!Array.isArray(barcodes)) return null;
  if (
    !barcodes.every(
      (b) =>
        isRecord(b) &&
        typeof b['value'] === 'string' &&
        typeof b['format'] === 'string'
    )
  ) {
    return null;
  }
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
    reading: reading as unknown as ScannedLabelRead['reading'],
    catalogMatch: (catalogMatch as CatalogMatch | null | undefined) ?? null,
    barcodes: barcodes as ScannedLabelRead['barcodes'],
  };
}
