import { FilamentDetail, FilamentSummary } from '../services/filament.service';

/**
 * Maps a `FilamentDetail` (the single-filament endpoint) onto the
 * `FilamentSummary` shape the list endpoint returns, so callers that only have
 * a detail — QR scans, id-based resolvers — feed the same UI.
 *
 * `createdDate`, `loadedInPrinter`, and `materialCategory` are not part of the
 * detail payload, so they come back empty; the server-computed remaining
 * values are carried through.
 */
export function filamentDetailToSummary(
  detail: FilamentDetail
): FilamentSummary {
  return {
    id: detail.id,
    displayName: detail.displayName,
    brand: detail.brand,
    materialCategoryNickname: detail.materialCategoryNickname,
    materialType: detail.materialType,
    materialDensityGramPerCubicCm: detail.materialDensityGramPerCubicCm,
    colorName: detail.colorName,
    colorHex: detail.colorHex,
    colorPattern: detail.colorPattern,
    colors: detail.colors,
    finishType: detail.finishType,
    effects: detail.effects,
    recommendedTemp: detail.recommendedTemp,
    isActive: detail.isActive,
    notes: detail.notes,
    isFavorite: detail.isFavorite,
    createdDate: '',
    filamentRemaining: detail.filamentRemaining ?? null,
    filamentLengthRemainingInM: detail.filamentLengthRemainingInM ?? null,
    filamentVolumeRemainingInMl: detail.filamentVolumeRemainingInMl ?? null,
    purchasePriceValue: detail.purchasePriceValue,
    initialNominalWeightMg: detail.initialNominalWeightMg,
    diameterMm: detail.diameterMm ?? 1.75,
    loadedInPrinter: null,
    storageLocation: detail.storageLocation,
    materialCategory: null as any,
  };
}
