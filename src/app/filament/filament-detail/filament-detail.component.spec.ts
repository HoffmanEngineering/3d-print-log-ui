import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  ColorPatternType,
  FilamentAdjustmentSourceMeasurement,
  FilamentService,
} from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';

import { FilamentDetailComponent } from './filament-detail.component';

describe('FilamentDetailComponent', () => {
  let component: FilamentDetailComponent;
  let fixture: ComponentFixture<FilamentDetailComponent>;

  beforeEach(async () => {
    const mockFilamentService = jasmine.createSpyObj<FilamentService>(
      'FilamentService',
      {
        getFilamentBrands: of({ brands: [] }),
        getFilamentPurchaseLocations: of({ purchaseLocations: [] }),
        getFilamentStorageLocations: of({ storageLocations: [] }),
      }
    );

    const mockToastrservice = jasmine.createSpyObj<ToastrService>(
      'ToastrService',
      ['success']
    );

    const mockUserSettingService = jasmine.createSpyObj<UserSettingService>(
      'UserSettingService',
      ['updateUserSetting']
    );

    const mockLogger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logException',
      'logEvent',
    ]);

    await TestBed.configureTestingModule({
      declarations: [FilamentDetailComponent],
      imports: [
        RouterTestingModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatCheckboxModule,
        MatNativeDateModule,
        MatAutocompleteModule,
        MatButtonToggleModule,
        MatChipsModule,
      ],
      providers: [
        { provide: FilamentService, useValue: mockFilamentService },
        { provide: ToastrService, useValue: mockToastrservice },
        { provide: UserSettingService, useValue: mockUserSettingService },
        { provide: LoggingService, useValue: mockLogger },
        { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              filament: null,
              materials: [],
              materialCategories: [],
            }),
          },
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilamentDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('color pattern form', () => {
    it('adds a second color control when switching to Gradient', () => {
      component.filamentForm
        .get('colorPattern')!
        .setValue(ColorPatternType.Gradient);
      component.onColorPatternChange();

      const colorsArray = component.colorsFormArray;
      expect(colorsArray.length).toBe(2);
    });

    it('allows adding color stops for Rainbow up to 8', () => {
      component.filamentForm
        .get('colorPattern')!
        .setValue(ColorPatternType.Rainbow);
      component.onColorPatternChange();

      // Start with 2
      expect(component.colorsFormArray.length).toBe(2);

      // Add 6 more
      for (let i = 0; i < 6; i++) component.addColorStop();
      expect(component.colorsFormArray.length).toBe(8);

      // Can't add beyond 8
      component.addColorStop();
      expect(component.colorsFormArray.length).toBe(8);
    });
  });
});

describe('FilamentDetailComponent - spool weight calculator', () => {
  let calcComponent: FilamentDetailComponent;
  let calcFixture: ComponentFixture<FilamentDetailComponent>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const baseFilament = {
    id: 'filament-1',
    displayName: 'Test',
    materialType: 'PLA',
    materialDensityGramPerCubicCm: 1.24,
    spoolWeightMg: 150000,
    initialTotalWeightMg: 1150000,
    initialNominalWeightMg: 1000000,
    filamentRemaining: 500000,
    filamentAdjustments: [],
    colors: [],
  };

  async function setup(filamentOverrides: Record<string, unknown>) {
    mockDialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    const mockFilamentService = jasmine.createSpyObj<FilamentService>(
      'FilamentService',
      {
        getFilamentBrands: of({ brands: [] }),
        getFilamentPurchaseLocations: of({ purchaseLocations: [] }),
        getFilamentStorageLocations: of({ storageLocations: [] }),
      }
    );
    const mockToastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
    ]);
    const mockUserSettings = jasmine.createSpyObj<UserSettingService>(
      'UserSettingService',
      ['updateUserSetting']
    );
    const mockLog = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logException',
      'logEvent',
    ]);

    await TestBed.configureTestingModule({
      declarations: [FilamentDetailComponent],
      imports: [
        RouterTestingModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatCheckboxModule,
        MatNativeDateModule,
        MatAutocompleteModule,
        MatButtonToggleModule,
        MatChipsModule,
        MatButtonModule,
        MatTooltipModule,
      ],
      providers: [
        { provide: FilamentService, useValue: mockFilamentService },
        { provide: ToastrService, useValue: mockToastr },
        { provide: UserSettingService, useValue: mockUserSettings },
        { provide: LoggingService, useValue: mockLog },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              filament: { ...baseFilament, ...filamentOverrides },
              materials: [],
              materialCategories: [],
            }),
          },
        },
      ],
    }).compileComponents();

    calcFixture = TestBed.createComponent(FilamentDetailComponent);
    calcComponent = calcFixture.componentInstance;
    calcFixture.detectChanges();
  }

  it('shows the calculator when saved, remaining known, and spool weight resolvable', async () => {
    await setup({});
    expect(calcComponent.canShowSpoolCalculator).toBeTrue();
  });

  it('hides the calculator when filamentRemaining is null', async () => {
    await setup({ filamentRemaining: null });
    expect(calcComponent.canShowSpoolCalculator).toBeFalse();
  });

  it('hides the calculator when spool weight cannot be resolved', async () => {
    await setup({
      spoolWeightMg: 0,
      initialTotalWeightMg: 1000000,
      initialNominalWeightMg: 1000000,
    });
    expect(calcComponent.canShowSpoolCalculator).toBeFalse();
  });

  it('renders the calculator button disabled while the form is dirty', async () => {
    await setup({});
    calcComponent.filamentForm.markAsDirty();
    calcFixture.detectChanges();

    const button: HTMLButtonElement | null =
      calcFixture.nativeElement.querySelector('#spool-calc-button');
    expect(button).not.toBeNull();
    expect(button!.disabled).toBeTrue();
  });

  it('exposes a save-first tooltip when dirty and a help tooltip when pristine', async () => {
    await setup({});
    expect(calcComponent.spoolCalculatorTooltip).toContain('measured weight');

    calcComponent.filamentForm.markAsDirty();
    expect(calcComponent.spoolCalculatorTooltip).toContain('Save your changes');
  });

  it('does not open the dialog when the form is dirty', async () => {
    await setup({});
    calcComponent.filamentForm.markAsDirty();

    calcComponent.openSpoolWeightCalculator();

    expect(mockDialog.open).not.toHaveBeenCalled();
  });

  it('appends a fully-formed weight adjustment row, logs, and marks the form dirty on confirm', async () => {
    await setup({});
    mockDialog.open.and.returnValue({
      afterClosed: () =>
        of({
          adjustmentG: -200,
          measuredTotalWeightG: 450,
          note: 'measured note',
        }),
    } as MatDialogRef<unknown>);

    const before = calcComponent.filamentAdjustments.length;
    calcComponent.openSpoolWeightCalculator();

    expect(calcComponent.filamentAdjustments.length).toBe(before + 1);
    const added = calcComponent.filamentAdjustments.at(
      calcComponent.filamentAdjustments.length - 1
    );
    expect(added.get('source')!.value).toBe(
      FilamentAdjustmentSourceMeasurement.Weight
    );
    expect(added.get('amountG')!.value).toBe(-200);
    expect(added.get('lengthInM')!.value).toBeNull();
    expect(added.get('volumeMl')!.value).toBeNull();
    expect(added.get('filamentId')!.value).toBe('filament-1');
    expect(added.get('notes')!.value).toBe('measured note');
    expect(calcComponent.filamentForm.dirty).toBeTrue();

    const logSpy = TestBed.inject(LoggingService).logEvent as jasmine.Spy;
    expect(logSpy).toHaveBeenCalledWith(
      'SpoolWeightCalculator_AdjustmentAdded',
      {
        measuredTotalWeightG: 450,
        adjustmentG: -200,
      }
    );
  });

  it('does nothing when the dialog is cancelled', async () => {
    await setup({});
    mockDialog.open.and.returnValue({
      afterClosed: () => of(undefined),
    } as MatDialogRef<unknown>);

    const before = calcComponent.filamentAdjustments.length;
    calcComponent.openSpoolWeightCalculator();

    expect(calcComponent.filamentAdjustments.length).toBe(before);
  });
});

describe('FilamentDetailComponent - value serialization', () => {
  let serComponent: FilamentDetailComponent;
  let serFixture: ComponentFixture<FilamentDetailComponent>;
  let mockFilamentSvc: jasmine.SpyObj<FilamentService>;

  const baseFilament = {
    id: 'filament-1',
    displayName: 'Test',
    materialType: 'PLA',
    materialDensityGramPerCubicCm: 1.24,
    spoolWeightMg: 150000,
    initialTotalWeightMg: 1150000,
    initialNominalWeightMg: 1000000,
    filamentAdjustments: [],
    colors: [],
  };

  async function setupSerialization(
    filamentOverrides: Record<string, unknown>
  ) {
    mockFilamentSvc = jasmine.createSpyObj<FilamentService>('FilamentService', {
      getFilamentBrands: of({ brands: [] }),
      getFilamentPurchaseLocations: of({ purchaseLocations: [] }),
      getFilamentStorageLocations: of({ storageLocations: [] }),
      addFilament: of({} as never),
      updateFilament: of({} as never),
    });
    const mockToastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
    ]);
    const mockUserSettings = jasmine.createSpyObj<UserSettingService>(
      'UserSettingService',
      ['updateUserSetting']
    );
    const mockLog = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logException',
      'logEvent',
    ]);

    await TestBed.configureTestingModule({
      declarations: [FilamentDetailComponent],
      imports: [
        RouterTestingModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatCheckboxModule,
        MatNativeDateModule,
        MatAutocompleteModule,
        MatButtonToggleModule,
        MatChipsModule,
        MatButtonModule,
        MatTooltipModule,
      ],
      providers: [
        { provide: FilamentService, useValue: mockFilamentSvc },
        { provide: ToastrService, useValue: mockToastr },
        { provide: UserSettingService, useValue: mockUserSettings },
        { provide: LoggingService, useValue: mockLog },
        { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              filament: { ...baseFilament, ...filamentOverrides },
              materials: [],
              materialCategories: [],
            }),
          },
        },
      ],
    }).compileComponents();

    serFixture = TestBed.createComponent(FilamentDetailComponent);
    serComponent = serFixture.componentInstance;
    serFixture.detectChanges();
  }

  // Returns the FilamentDetail passed to updateFilament on the most recent save.
  function savedFilament(): any {
    const spy = mockFilamentSvc.updateFilament as jasmine.Spy;
    return spy.calls.mostRecent().args[0];
  }

  it('drops a new untouched adjustment row', async () => {
    await setupSerialization({});
    serComponent.addAdjustment();

    serComponent.onSubmit();

    expect(mockFilamentSvc.updateFilament).toHaveBeenCalled();
    expect(savedFilament().filamentAdjustments.length).toBe(0);
  });

  it('keeps a notes-only adjustment row with null measurements', async () => {
    await setupSerialization({});
    serComponent.addAdjustment();
    const row = serComponent.filamentAdjustments.at(0);
    row.get('amountG')!.setValue(null);
    row.get('notes')!.setValue('inspected, no change');

    serComponent.onSubmit();

    const adj = savedFilament().filamentAdjustments;
    expect(adj.length).toBe(1);
    expect(adj[0].amountMg).toBeNull();
    expect(adj[0].lengthInM).toBeNull();
    expect(adj[0].volumeMl).toBeNull();
    expect(adj[0].notes).toBe('inspected, no change');
  });

  it('preserves an explicit zero amount entered by the user', async () => {
    await setupSerialization({});
    serComponent.addAdjustment();
    serComponent.filamentAdjustments.at(0).get('amountG')!.setValue('0');

    serComponent.onSubmit();

    const adj = savedFilament().filamentAdjustments;
    expect(adj.length).toBe(1);
    expect(adj[0].amountMg).toBe(0);
  });

  it('drops whitespace-only length values instead of saving zero', async () => {
    await setupSerialization({});
    serComponent.addAdjustment();
    const row = serComponent.filamentAdjustments.at(0);
    row.get('amountG')!.setValue(null);
    row.get('lengthInM')!.setValue('   ');

    serComponent.onSubmit();

    expect(savedFilament().filamentAdjustments.length).toBe(0);
  });

  it('drops a non-numeric length value instead of saving a phantom row', async () => {
    await setupSerialization({});
    serComponent.addAdjustment();
    const row = serComponent.filamentAdjustments.at(0);
    row.get('amountG')!.setValue(null);
    row.get('lengthInM')!.setValue('abc');

    serComponent.onSubmit();

    expect(savedFilament().filamentAdjustments.length).toBe(0);
  });

  it('serializes a non-finite volume value as null', async () => {
    await setupSerialization({});
    serComponent.addAdjustment();
    const row = serComponent.filamentAdjustments.at(0);
    row.get('amountG')!.setValue(null);
    row.get('volumeMl')!.setValue('Infinity');
    row.get('notes')!.setValue('keep me');

    serComponent.onSubmit();

    const adj = savedFilament().filamentAdjustments;
    expect(adj.length).toBe(1);
    expect(adj[0].volumeMl).toBeNull();
  });

  it('serializes empty nominal weight/length/volume as null', async () => {
    await setupSerialization({
      initialNominalWeightMg: 0, // loads initialNominalWeightG as null (>0 guard)
      initialNominalLengthM: null,
      initialNominalVolumeMl: null,
    });

    serComponent.onSubmit();

    const saved = savedFilament();
    expect(saved.initialNominalWeightMg).toBeNull();
    expect(saved.initialNominalLengthM).toBeNull();
    expect(saved.initialNominalVolumeMl).toBeNull();
  });

  it('serializes populated nominal fields to rounded values', async () => {
    await setupSerialization({});
    serComponent.filamentForm.get('initialNominalWeightG')!.setValue(1);
    serComponent.filamentForm.get('initialNominalLengthM')!.setValue(330);
    serComponent.filamentForm.get('initialNominalVolumeMl')!.setValue(800);

    serComponent.onSubmit();

    const saved = savedFilament();
    expect(saved.initialNominalWeightMg).toBe(1000);
    expect(saved.initialNominalLengthM).toBe(330);
    expect(saved.initialNominalVolumeMl).toBe(800);
  });
});
