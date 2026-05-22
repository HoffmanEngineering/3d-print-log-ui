import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot } from '@angular/router';
import { of } from 'rxjs';
import {
  ColorPatternType,
  FilamentDetail,
  FilamentEffect,
  FilamentFinishType,
  FilamentService,
} from '../../core/services/filament.service';
import { FilamentListResolverService } from './filament-list-resolver.service';

describe('FilamentListResolverService', () => {
  let service: FilamentListResolverService;
  let mockFilamentService: jasmine.SpyObj<FilamentService>;

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
    mockFilamentService = jasmine.createSpyObj<FilamentService>(
      'FilamentService',
      ['getFilamentDetail']
    );

    TestBed.configureTestingModule({
      providers: [
        FilamentListResolverService,
        { provide: FilamentService, useValue: mockFilamentService },
      ],
    });
    service = TestBed.inject(FilamentListResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return an empty array when no filterByFilamentId params are present', (done) => {
    service.resolve(makeRoute([]), null).subscribe((items) => {
      expect(items).toEqual([]);
      expect(mockFilamentService.getFilamentDetail).not.toHaveBeenCalled();
      done();
    });
  });

  it('should fetch details for each filterByFilamentId and map to summaries', (done) => {
    mockFilamentService.getFilamentDetail.and.returnValue(of(mockDetail));

    service.resolve(makeRoute(['abc']), null).subscribe((items) => {
      expect(mockFilamentService.getFilamentDetail).toHaveBeenCalledWith('abc');
      expect(items.length).toBe(1);
      expect(items[0].id).toBe('abc');
      expect(items[0].displayName).toBe('Test Filament');
      expect(items[0].colorHex).toBe('000000');
      done();
    });
  });

  it('should fetch details for multiple filterByFilamentId params', (done) => {
    const detail2 = { ...mockDetail, id: 'def', displayName: 'Other Filament' };
    mockFilamentService.getFilamentDetail.and.callFake((id: string) =>
      of(id === 'abc' ? mockDetail : detail2)
    );

    service.resolve(makeRoute(['abc', 'def']), null).subscribe((items) => {
      expect(items.length).toBe(2);
      expect(items[0].id).toBe('abc');
      expect(items[1].id).toBe('def');
      done();
    });
  });
});
