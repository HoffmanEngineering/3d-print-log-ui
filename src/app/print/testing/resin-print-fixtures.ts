import { FilamentSummary } from 'src/app/core/services/filament.service';
import {
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
  PrintSummary,
} from 'src/app/core/services/print.service';

/**
 * Resin prints as printlog-bridge#118 reports them (printlog-bridge#97): one usage row for the
 * vat (slot 0), measured in mL, with the slicer's figure as the actual (`actualIsEstimate`).
 * Length is always null on a resin row, and the API leaves grams null when no bottle is linked.
 */

/**
 * A resin bottle. The density and the 1.75 mm diameter are deliberate: with them a weight or
 * length conversion succeeds, so a view that converts a volume-sourced row to grams or meters
 * shows a plausible number instead of failing, which is exactly the bug these fixtures catch.
 */
export const RESIN_BOTTLE = {
  id: 'resin-bottle-1',
  displayName: 'Elegoo Standard Resin Gray',
  brand: 'Elegoo',
  materialCategoryNickname: 'Resin',
  materialType: 'Standard',
  materialDensityGramPerCubicCm: 1.1,
  colorName: 'Gray',
  colorHex: '808080',
  colorPattern: 1,
  colors: ['808080'],
  finishType: 1,
  effects: [],
  recommendedTemp: null,
  isActive: true,
  notes: '',
  isFavorite: false,
  filamentRemaining: 935000,
  filamentLengthRemainingInM: null,
  filamentVolumeRemainingInMl: 850,
  purchasePriceValue: '30',
  initialNominalWeightMg: 1100000,
  diameterMm: 1.75,
  loadedInPrinter: null,
  storageLocation: '',
  materialCategory: null,
} as unknown as FilamentSummary;

/** The row from the story: actual 42.5 mL (the slicer's figure), estimate 40 mL, no bottle. */
export function resinUsageRow(
  overrides: Partial<PrintFilamentSummaryDto> = {}
): PrintFilamentSummaryDto {
  return {
    id: 'resin-row-1',
    filament: RESIN_BOTTLE,
    slot: 0,
    volumeMl: 42.5,
    source: PrintFilamentSourceMeasurement.Volume,
    actualIsEstimate: true,
    estimatedVolumeMl: 40,
    estimatedSource: PrintFilamentSourceMeasurement.Volume,
    amountMg: null,
    lengthInM: null,
    estimatedAmountMg: null,
    estimatedLengthInM: null,
    ...overrides,
  };
}

/** The same row with no bottle linked: the API leaves `filament` and grams null. */
export function unlinkedResinUsageRow(
  overrides: Partial<PrintFilamentSummaryDto> = {}
): PrintFilamentSummaryDto {
  return resinUsageRow({ id: 'resin-row-2', filament: null, ...overrides });
}

/** A bottle-linked row on which the API also filled grams from the bottle's density. */
export function resinUsageRowWithGrams(
  overrides: Partial<PrintFilamentSummaryDto> = {}
): PrintFilamentSummaryDto {
  return resinUsageRow({
    amountMg: 46750,
    estimatedAmountMg: 44000,
    ...overrides,
  });
}

/** An estimate-only resin row: the print has not finished, so there is no actual yet. */
export function estimateOnlyResinUsageRow(
  overrides: Partial<PrintFilamentSummaryDto> = {}
): PrintFilamentSummaryDto {
  return resinUsageRow({
    volumeMl: null,
    actualIsEstimate: false,
    ...overrides,
  });
}

export function resinPrintSummary(
  rows: PrintFilamentSummaryDto[] = [resinUsageRow()],
  overrides: Partial<PrintSummary> = {}
): PrintSummary {
  return {
    id: 501,
    title: 'Resin miniature',
    printerId: 7,
    printer: { id: 7, name: 'Saturn 4 Ultra' },
    startDate: new Date('2026-10-20T12:00:00Z'),
    status: 2,
    defaultPrintImageId: 0,
    createdByUserId: 1,
    estimatedPrintTimeInSeconds: 7200,
    printTimeInSeconds: 7300,
    sumActualFilamentWeightMg: 46750,
    sumEstimatedFilamentWeightMg: 44000,
    totalFilamentWeightMg: 46750,
    filamentUsage: rows,
    commentCount: 0,
    ...overrides,
  } as unknown as PrintSummary;
}
