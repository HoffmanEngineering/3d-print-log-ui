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
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { Subject, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  ColorPatternType,
  FilamentAdjustmentSourceMeasurement,
  FilamentDetail,
  FilamentService,
} from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';

import { PrintService } from 'src/app/core/services/print.service';
import { FilamentSourceMeasurement } from 'src/app/core/services/filament.service';

import { FilamentDetailComponent } from './filament-detail.component';
import { FilamentImagesPanelComponent } from './filament-images-panel/filament-images-panel.component';
import { FilamentPrintsPanelComponent } from './filament-prints-panel/filament-prints-panel.component';
import { FilamentRemainingCardComponent } from './filament-remaining-card/filament-remaining-card.component';

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
        addFilament: of({} as FilamentDetail),
        updateFilament: of({} as FilamentDetail),
      }
    );

    const mockToastrservice = jasmine.createSpyObj<ToastrService>(
      'ToastrService',
      ['success', 'warning']
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

  describe('staged image save flow', () => {
    let imagesPanelStub: jasmine.SpyObj<FilamentImagesPanelComponent>;
    let filamentService: jasmine.SpyObj<FilamentService>;
    let toastr: jasmine.SpyObj<ToastrService>;
    let router: Router;

    const setUpNewFilamentForm = () => {
      component.filamentForm.get('id')!.setValue(null);
      component.filamentForm.get('displayName')!.setValue('Blue PLA');
      component.filamentForm.get('materialType')!.setValue('PLA');
      component.filamentForm
        .get('materialDensityGramPerCubicCm')!
        .setValue(1.24);
    };

    beforeEach(() => {
      imagesPanelStub = jasmine.createSpyObj<FilamentImagesPanelComponent>(
        'FilamentImagesPanelComponent',
        ['uploadStagedImages', 'retryFailedUploads'],
        { hasStagedImages: jasmine.createSpy().and.returnValue(false) as never }
      );
      // The real panel is a view child of a 1000-line template; swapping the
      // query out is far cheaper than driving the DOM to stage a file.
      (component as unknown as { imagesPanel: () => unknown }).imagesPanel =
        () => imagesPanelStub;

      filamentService = TestBed.inject(
        FilamentService
      ) as jasmine.SpyObj<FilamentService>;
      filamentService.addFilament.and.returnValue(
        of({ id: 'new-filament-id' } as FilamentDetail)
      );

      toastr = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;

      router = TestBed.inject(Router);
      spyOn(router, 'navigateByUrl').and.resolveTo(true);
      spyOn(router, 'navigate').and.resolveTo(true);
    });

    const stagedImages = (staged: boolean) =>
      (
        imagesPanelStub.hasStagedImages as unknown as jasmine.Spy
      ).and.returnValue(staged);

    it('blocks navigation when images are staged but unsaved', () => {
      component.filamentForm.markAsPristine();
      stagedImages(true);

      expect(component.canDeactivate()).toBeFalse();
    });

    it('allows navigation when the form is clean and nothing is staged', () => {
      component.filamentForm.markAsPristine();
      stagedImages(false);

      expect(component.canDeactivate()).toBeTrue();
    });

    it('uploads staged images after creating a new filament, then navigates', async () => {
      setUpNewFilamentForm();
      stagedImages(true);
      imagesPanelStub.uploadStagedImages.and.returnValue(of({ failed: [] }));

      component.onSubmit();
      await fixture.whenStable();

      expect(imagesPanelStub.uploadStagedImages).toHaveBeenCalledWith(
        'new-filament-id'
      );
      expect(router.navigateByUrl).toHaveBeenCalledWith('/filament');
    });

    it('writes the new id into the form so a retry does not create a second material', async () => {
      setUpNewFilamentForm();
      stagedImages(true);
      imagesPanelStub.uploadStagedImages.and.returnValue(
        of({ failed: [new File(['x'], 'spool.png')] })
      );

      component.onSubmit();
      await fixture.whenStable();

      // Without this the form ID stays null and the next submit POSTs another
      // material.
      expect(component.filamentForm.get('id')!.value).toBe('new-filament-id');
      expect(component.saving).toBeFalse();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(toastr.warning).toHaveBeenCalled();
    });

    // The URL used to be rewritten the instant the create returned, while the
    // photos were still uploading. That navigation ran PendingChangesGuard,
    // which asks the panel whether anything is staged - and mid-upload the
    // answer is yes, so saving a new material prompted "You have unsaved
    // changes" about the very photos it was uploading.
    it('does not navigate while the staged photos are still uploading', () => {
      setUpNewFilamentForm();
      stagedImages(true);
      // Never emits: the upload is still in flight for the whole test.
      imagesPanelStub.uploadStagedImages.and.returnValue(new Subject());

      component.onSubmit();

      expect(router.navigate).not.toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('leaves the guard alone for its own post-save URL rewrite', async () => {
      setUpNewFilamentForm();
      stagedImages(true);
      imagesPanelStub.uploadStagedImages.and.returnValue(
        of({ failed: [new File(['x'], 'spool.png')] })
      );

      let guardAnswer: boolean | null = null;
      (router.navigate as jasmine.Spy).and.callFake(() => {
        // The guard runs during the navigation, with photos still staged for
        // the retry. It must not prompt for a navigation the page started.
        guardAnswer = component.canDeactivate() as boolean;
        return Promise.resolve(true);
      });

      component.onSubmit();
      await fixture.whenStable();

      expect(router.navigate).toHaveBeenCalledWith(
        ['/filament', 'new-filament-id'],
        { replaceUrl: true }
      );
      expect(guardAnswer).toBeTrue();
      // Restored afterwards, or the rest of the page's life skips the check.
      expect(component.canDeactivate()).toBeFalse();
    });
  });

  it('renders neither usage card in add mode', () => {
    expect(
      fixture.nativeElement.querySelector('app-filament-remaining-card')
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('app-filament-prints-panel')
    ).toBeNull();
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
        addFilament: of({} as FilamentDetail),
        updateFilament: of({} as FilamentDetail),
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

  it('preserves a null adjustment weight across load and re-save', async () => {
    await setupSerialization({
      filamentAdjustments: [
        {
          id: 'adj-1',
          filamentId: 'filament-1',
          source: FilamentAdjustmentSourceMeasurement.Length,
          amountMg: null,
          lengthInM: 100,
          volumeMl: null,
          notes: '',
        },
      ],
    });

    // Submit without editing the loaded adjustment.
    serComponent.onSubmit();

    const adj = savedFilament().filamentAdjustments;
    expect(adj.length).toBe(1);
    expect(adj[0].amountMg).toBeNull(); // was silently becoming 0 on load
    expect(adj[0].lengthInM).toBe(100);
  });
});

describe('FilamentDetailComponent - usage panels', () => {
  let usageComponent: FilamentDetailComponent;
  let usageFixture: ComponentFixture<FilamentDetailComponent>;

  const savedFilament = {
    id: 'filament-1',
    displayName: 'Test',
    materialType: 'PLA',
    materialDensityGramPerCubicCm: 1.24,
    diameterMm: 1.75,
    source: FilamentSourceMeasurement.Weight,
    initialNominalWeightMg: 1000000,
    filamentRemaining: 412000,
    filamentLengthRemainingInM: 138.2,
    filamentVolumeRemainingInMl: 345.1,
    printCount: 23,
    totalUsedMg: 588000,
    filamentAdjustments: [],
    colors: [],
  };

  async function setup(filamentOverrides: Record<string, unknown> = {}) {
    const mockFilamentService = jasmine.createSpyObj<FilamentService>(
      'FilamentService',
      {
        getFilamentBrands: of({ brands: [] }),
        getFilamentPurchaseLocations: of({ purchaseLocations: [] }),
        getFilamentStorageLocations: of({ storageLocations: [] }),
        addFilament: of({} as FilamentDetail),
        updateFilament: of({} as FilamentDetail),
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
    const mockPrintService = jasmine.createSpyObj<PrintService>(
      'PrintService',
      ['getPrintSummaries', 'getPrintImage']
    );
    mockPrintService.getPrintSummaries.and.returnValue(
      of({ items: [], paging: { totalCount: 0 } } as never)
    );
    mockPrintService.getPrintImage.and.returnValue(of(''));

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
        FilamentRemainingCardComponent,
        FilamentPrintsPanelComponent,
      ],
      providers: [
        { provide: FilamentService, useValue: mockFilamentService },
        { provide: ToastrService, useValue: mockToastr },
        { provide: UserSettingService, useValue: mockUserSettings },
        { provide: LoggingService, useValue: mockLog },
        { provide: PrintService, useValue: mockPrintService },
        { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              filament: { ...savedFilament, ...filamentOverrides },
              materials: [],
              materialCategories: [],
            }),
          },
        },
      ],
    }).compileComponents();

    usageFixture = TestBed.createComponent(FilamentDetailComponent);
    usageComponent = usageFixture.componentInstance;
    usageFixture.detectChanges();
  }

  it('renders both usage cards for a saved filament', async () => {
    await setup();
    expect(
      usageFixture.nativeElement.querySelector('app-filament-remaining-card')
    ).toBeTruthy();
    expect(
      usageFixture.nativeElement.querySelector('app-filament-prints-panel')
    ).toBeTruthy();
  });

  it('renders neither card in copy mode', async () => {
    // CopyFilamentDetailResolverService nulls the id: the clone's remaining and
    // prints belong to the source spool, not to the copy.
    await setup({ id: null });
    expect(
      usageFixture.nativeElement.querySelector('app-filament-remaining-card')
    ).toBeNull();
    expect(
      usageFixture.nativeElement.querySelector('app-filament-prints-panel')
    ).toBeNull();
  });

  it('does not mark the form dirty when the cards render', async () => {
    await setup();
    // A false dirty state would trip PendingChangesGuard and block navigation.
    expect(usageComponent.filamentForm.dirty).toBeFalse();
  });

  it('projects the server value while the form is untouched', async () => {
    await setup();
    expect(usageComponent.remainingProjection().projectedMg).toBe(
      usageComponent.remainingProjection().remainingMg
    );
    expect(usageComponent.remainingProjection().projectedMg).toBe(412000);
  });

  it('projects a pending adjustment', async () => {
    await setup();
    const before = usageComponent.remainingProjection().projectedMg!;

    usageComponent.addAdjustment();
    usageComponent.filamentAdjustments.at(0).get('amountG')!.setValue(-32);
    usageFixture.detectChanges();

    expect(usageComponent.remainingProjection().projectedMg).toBeCloseTo(
      before - 32000,
      0
    );
  });

  it('projects an edited nominal weight', async () => {
    await setup();

    usageComponent.filamentForm.get('initialNominalWeightG')!.setValue(1200);
    usageFixture.detectChanges();

    expect(usageComponent.remainingProjection().projectedMg).toBeCloseTo(
      612000,
      0
    );
  });
});
