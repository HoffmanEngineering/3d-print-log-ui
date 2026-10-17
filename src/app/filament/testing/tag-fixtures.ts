import type { TagReading } from '../../core/types/tag-reading';

/** The Snapmaker SnapSpeed PLA tag 805BEC3E, as the API decodes it. */
export const SNAPMAKER_805BEC3E: TagReading = {
  format: 'snapmaker',
  decoderVersion: 1,
  brand: 'Snapmaker',
  manufacturer: 'Polymaker',
  materialType: 'PLA',
  materialSubtype: 'SnapSpeed',
  materialSubtypeCode: 3,
  colors: ['#080A0D'],
  alpha: 255,
  sku: '900001',
  diameterMm: 1.75,
  netWeightG: 500,
  lengthM: 150,
  dryTempC: 55,
  dryHours: 6,
  hotendMinC: 190,
  hotendMaxC: 230,
  firstLayerHotendC: 230,
  hotendC: 220,
  bedMinC: 60,
  bedMaxC: 60,
  manufacturedOn: '2026-03-12',
  extras: { bedType: '1' },
  warnings: [],
};
