import {
  ColorPatternType,
  FilamentDetail,
  FilamentFinishType,
  FilamentSourceMeasurement,
} from '../services/filament.service';
import { filamentDetailToSummary } from './filament-summary';

function buildDetail(overrides: Partial<FilamentDetail> = {}): FilamentDetail {
  return {
    id: 'filament-1',
    displayName: 'Test Filament',
    brand: 'Brand',
    materialCategoryNickname: 'PLA',
    materialType: 'PLA',
    materialDensityGramPerCubicCm: 1.24,
    colorName: 'Red',
    colorHex: 'FF0000',
    colorPattern: ColorPatternType.Solid,
    colors: ['FF0000'],
    finishType: FilamentFinishType.Standard,
    effects: [],
    diameterMm: 1.75,
    initialTotalWeightMg: null,
    source: FilamentSourceMeasurement.Weight,
    initialNominalWeightMg: 1000000,
    initialNominalLengthM: 330,
    initialNominalVolumeMl: 800,
    spoolWeightMg: null,
    tempRangeStart: null,
    tempRangeEnd: null,
    recommendedTemp: 210,
    recommendedBedTemp: null,
    isActive: true,
    purchaseDate: null,
    purchaseLocation: '',
    purchasePriceValue: '20.00',
    purchasePriceCurrency: 'USD',
    purchaseNotes: '',
    storageLocation: 'Shelf',
    initialLayerTimeS: null,
    layerTimeS: null,
    meltingTemperature: null,
    inertGas: '',
    materialRefreshRatio: null,
    notes: '',
    isFavorite: false,
    filamentAdjustments: [],
    filamentRemaining: 750000,
    filamentLengthRemainingInM: 248,
    filamentVolumeRemainingInMl: 605,
    ...overrides,
  };
}

describe('filamentDetailToSummary', () => {
  it('carries the server-computed remaining values through', () => {
    const summary = filamentDetailToSummary(buildDetail());

    expect(summary.filamentRemaining).toBe(750000);
    expect(summary.filamentLengthRemainingInM).toBe(248);
    expect(summary.filamentVolumeRemainingInMl).toBe(605);
  });

  it('falls back to null when the spool is untracked', () => {
    const summary = filamentDetailToSummary(
      buildDetail({
        filamentRemaining: undefined,
        filamentLengthRemainingInM: undefined,
        filamentVolumeRemainingInMl: undefined,
      })
    );

    expect(summary.filamentRemaining).toBeNull();
    expect(summary.filamentLengthRemainingInM).toBeNull();
    expect(summary.filamentVolumeRemainingInMl).toBeNull();
  });

  it('copies the identifying fields the picker displays', () => {
    const summary = filamentDetailToSummary(buildDetail());

    expect(summary.id).toBe('filament-1');
    expect(summary.displayName).toBe('Test Filament');
    expect(summary.colorName).toBe('Red');
    expect(summary.materialType).toBe('PLA');
    expect(summary.purchasePriceValue).toBe('20.00');
  });

  it('defaults the diameter when the detail has none', () => {
    const summary = filamentDetailToSummary(buildDetail({ diameterMm: null }));

    expect(summary.diameterMm).toBe(1.75);
  });
});
