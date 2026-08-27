import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { of } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  ColorPatternType,
  FilamentDetail,
  FilamentFinishType,
  FilamentService,
  FilamentSourceMeasurement,
} from 'src/app/core/services/filament.service';

import { FilamentSearchModalComponent } from './filament-search-modal.component';

function buildDetail(): FilamentDetail {
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
  };
}

describe('FilamentSearchModalComponent', () => {
  let component: FilamentSearchModalComponent;
  let fixture: ComponentFixture<FilamentSearchModalComponent>;
  let mockFilamentService: jasmine.SpyObj<FilamentService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<FilamentSearchModalComponent>>;

  beforeEach(async () => {
    const mockLogger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);

    mockFilamentService = jasmine.createSpyObj<FilamentService>(
      'FilamentService',
      ['getCurrentUserFilamentSummaries', 'getFilamentDetail']
    );

    mockDialogRef = jasmine.createSpyObj<
      MatDialogRef<FilamentSearchModalComponent>
    >('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [FilamentSearchModalComponent],
      imports: [MatDialogModule],
      providers: [
        { provide: LoggingService, useValue: mockLogger },
        { provide: FilamentService, useValue: mockFilamentService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilamentSearchModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('handleQrScanned', () => {
    it('keeps the remaining filament values from the scanned material', () => {
      mockFilamentService.getFilamentDetail.and.returnValue(of(buildDetail()));

      component.handleQrScanned({
        success: true,
        filamentId: 'filament-1',
        rawText: 'https://www.3dprintlog.com/materials/filament-1',
      });

      expect(mockDialogRef.close).toHaveBeenCalled();
      const selected = mockDialogRef.close.calls.mostRecent().args[0];
      expect(selected.filamentRemaining).toBe(750000);
      expect(selected.filamentLengthRemainingInM).toBe(248);
      expect(selected.filamentVolumeRemainingInMl).toBe(605);
    });

    it('keeps the remaining values when adding in multi-select mode', () => {
      component.data.multiSelect = true;
      mockFilamentService.getFilamentDetail.and.returnValue(of(buildDetail()));

      component.handleQrScanned({
        success: true,
        filamentId: 'filament-1',
        rawText: 'https://www.3dprintlog.com/materials/filament-1',
      });

      expect(component.selectedFilaments()[0].filamentRemaining).toBe(750000);
    });
  });
});
