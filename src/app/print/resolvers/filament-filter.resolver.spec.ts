import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import {
  ColorPatternType,
  FilamentDetail,
  FilamentEffect,
  FilamentFinishType,
  FilamentService,
  FilamentSummary,
} from '../../core/services/filament.service';
import { filamentFilterResolver } from './filament-filter.resolver';
import { runResolver } from 'src/app/core/resolvers/testing/run-resolver';

describe('filamentFilterResolver', () => {
  let mockFilamentService: MockedObject<FilamentService>;

  const mockDetail: FilamentDetail = {
    id: 'abc',
    displayName: 'Test Filament',
    brand: 'TestBrand',
    materialCategoryNickname: 'PLA',
    materialType: 'PLA',
    materialDensityGramPerCubicCm: 1.24,
    colorName: 'Black',
    colorHex: '000000',
    colorPattern: ColorPatternType.Solid,
    colors: ['000000'],
    finishType: FilamentFinishType.Standard,
    effects: [] as FilamentEffect[],
    diameterMm: 1.75,
    initialTotalWeightMg: null,
    source: null as any,
    initialNominalWeightMg: null,
    initialNominalLengthM: null,
    initialNominalVolumeMl: null,
    spoolWeightMg: null,
    tempRangeStart: null,
    tempRangeEnd: null,
    recommendedTemp: 215,
    recommendedBedTemp: null,
    isActive: true,
    purchaseDate: null,
    purchaseLocation: '',
    purchasePriceValue: '0',
    purchasePriceCurrency: 'USD',
    purchaseNotes: '',
    storageLocation: 'Shelf 1',
    initialLayerTimeS: null,
    layerTimeS: null,
    meltingTemperature: null,
    inertGas: '',
    materialRefreshRatio: null,
    notes: '',
    isFavorite: false,
    filamentAdjustments: [],
  };

  function makeRoute(ids: string[]): ActivatedRouteSnapshot {
    return {
      queryParamMap: { getAll: (_key: string) => ids },
    } as any;
  }

  beforeEach(() => {
    mockFilamentService = {
      getFilamentDetail: vi.fn().mockName('FilamentService.getFilamentDetail'),
    } as unknown as MockedObject<FilamentService>;

    TestBed.configureTestingModule({
      providers: [{ provide: FilamentService, useValue: mockFilamentService }],
    });
  });

  it('should return an empty array when no filterByFilamentId params are present', async () => {
    (
      runResolver(filamentFilterResolver, makeRoute([])) as Observable<
        FilamentSummary[]
      >
    ).subscribe((items) => {
      expect(items).toEqual([]);
      expect(mockFilamentService.getFilamentDetail).not.toHaveBeenCalled();
    });
  });

  it('should fetch details for each filterByFilamentId and map to summaries', async () => {
    mockFilamentService.getFilamentDetail.mockReturnValue(of(mockDetail));

    (
      runResolver(filamentFilterResolver, makeRoute(['abc'])) as Observable<
        FilamentSummary[]
      >
    ).subscribe((items) => {
      expect(mockFilamentService.getFilamentDetail).toHaveBeenCalledWith('abc');
      expect(items.length).toBe(1);
      expect(items[0].id).toBe('abc');
      expect(items[0].displayName).toBe('Test Filament');
      expect(items[0].colorHex).toBe('000000');
    });
  });

  it('should fetch details for multiple filterByFilamentId params', async () => {
    const detail2 = { ...mockDetail, id: 'def', displayName: 'Other Filament' };
    mockFilamentService.getFilamentDetail.mockImplementation((id: string) =>
      of(id === 'abc' ? mockDetail : detail2)
    );

    (
      runResolver(
        filamentFilterResolver,
        makeRoute(['abc', 'def'])
      ) as Observable<FilamentSummary[]>
    ).subscribe((items) => {
      expect(items.length).toBe(2);
      expect(items[0].id).toBe('abc');
      expect(items[1].id).toBe('def');
    });
  });
});
