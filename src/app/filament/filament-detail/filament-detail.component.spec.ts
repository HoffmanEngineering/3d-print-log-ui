import type { Mock, MockedObject } from 'vitest';
import { AdsenseModule } from 'ng2-adsense';
import { dispatchBeforeUnload } from 'src/app/core/guards/testing/dispatch-before-unload';
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
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  Routes,
} from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { QrLabelDialogData } from 'src/app/shared/qr-label-dialog/qr-label-dialog.component';
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
import { MaterialNamePipe } from 'src/app/shared/pipes/material-name.pipe';
import type { Material } from 'src/app/core/services/material.service';
import type { CatalogMatch, TagReading } from 'src/app/core/types/tag-reading';
import { By } from '@angular/platform-browser';
import { SNAPMAKER_805BEC3E } from '../testing/tag-fixtures';
import { EntityImagesPanelComponent } from 'src/app/shared/entity-images-panel/entity-images-panel.component';
import { FilamentPrintsPanelComponent } from './filament-prints-panel/filament-prints-panel.component';
import { FilamentRemainingCardComponent } from './filament-remaining-card/filament-remaining-card.component';
import { FilamentTagUidsComponent } from './filament-tag-uids/filament-tag-uids.component';

// These specs navigate (a link click, a save), and a route the TestBed doesn't know
// fails with an unhandled 'Cannot match any routes', which fails the run.
const ANYWHERE: Routes = [{ path: '**', children: [] }];

/**
 * The detail component builds its images-panel target from the service, so a spy without
 * `imageTarget` throws on the first render. A mock has only the methods
 * it is given, hence the explicit assignment.
 */
function stubImageTarget(service: object): void {
  (service as { imageTarget: unknown }).imageTarget = vi
    .fn()
    .mockImplementation((id: string | null) => ({
      id,
      gateway: {
        upload: vi.fn().mockName('EntityImageGateway.upload'),
        delete: vi.fn().mockName('EntityImageGateway.delete'),
        reorder: vi.fn().mockName('EntityImageGateway.reorder'),
        setDefault: vi.fn().mockName('EntityImageGateway.setDefault'),
      },
    }));
}

describe('FilamentDetailComponent', () => {
  let component: FilamentDetailComponent;
  let fixture: ComponentFixture<FilamentDetailComponent>;

  beforeEach(async () => {
    const mockFilamentService = {
      getFilamentBrands: vi
        .fn()
        .mockName('FilamentService.getFilamentBrands')
        .mockReturnValue(of({ brands: [] })),
      getFilamentPurchaseLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentPurchaseLocations')
        .mockReturnValue(of({ purchaseLocations: [] })),
      getFilamentStorageLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentStorageLocations')
        .mockReturnValue(of({ storageLocations: [] })),
      addFilament: vi
        .fn()
        .mockName('FilamentService.addFilament')
        .mockReturnValue(of({} as FilamentDetail)),
      updateFilament: vi
        .fn()
        .mockName('FilamentService.updateFilament')
        .mockReturnValue(of({} as FilamentDetail)),
    } as unknown as MockedObject<FilamentService>;
    stubImageTarget(mockFilamentService);

    const mockToastrservice = {
      success: vi.fn().mockName('ToastrService.success'),
      warning: vi.fn().mockName('ToastrService.warning'),
    };

    const mockUserSettingService = {
      updateUserSetting: vi
        .fn()
        .mockName('UserSettingService.updateUserSetting'),
    };

    const mockLogger = {
      logException: vi.fn().mockName('LoggingService.logException'),
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
    };

    await TestBed.configureTestingModule({
      imports: [
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
        RouterTestingModule.withRoutes(ANYWHERE),
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
        FilamentTagUidsComponent,
        FilamentDetailComponent,
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

  describe('once a response arrives', () => {
    const button = (label: string) =>
      Array.from(
        (
          fixture.nativeElement as HTMLElement
        ).querySelectorAll<HTMLButtonElement>('button')
      ).find((b) => b.textContent!.trim() === label);

    it('re-enables Save when the save fails', () => {
      const saved = new Subject<FilamentDetail>();
      const filaments = TestBed.inject(
        FilamentService
      ) as MockedObject<FilamentService>;
      filaments.addFilament.mockReturnValue(saved);
      component.filamentForm.get('id')!.setValue(null);
      component.filamentForm.get('displayName')!.setValue('Blue PLA');
      component.filamentForm.get('materialType')!.setValue('PLA');
      component.filamentForm
        .get('materialDensityGramPerCubicCm')!
        .setValue(1.24);
      fixture.detectChanges();

      component.onSubmit();
      fixture.detectChanges();
      expect(button('Submit')!.disabled, 'saving').toBe(true);

      saved.error(new HttpErrorResponse({ status: 500 }));
      fixture.detectChanges();

      expect(button('Submit')!.disabled).toBe(false);
    });

    it('drops "Save as Default" once the default price is saved', () => {
      const saved = new Subject<unknown>();
      const settings = TestBed.inject(UserSettingService);
      settings.addUserSetting = vi.fn().mockReturnValue(saved);
      // The resolver answers null when no default is stored.
      component.defaultFilamentPriceSetting.set(null);

      const price = (
        fixture.nativeElement as HTMLElement
      ).querySelector<HTMLInputElement>('#edit-filament-purchase-price')!;
      price.value = '24.99';
      price.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      button('Save as Default Filament Price')!.click();
      fixture.detectChanges();

      saved.next({ id: 3, value: '24.99' });
      fixture.detectChanges();

      expect(button('Save as Default Filament Price')).toBeUndefined();
    });
  });

  it('asks before the page unloads only while the form is dirty', () => {
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);

    component.filamentForm.markAsDirty();
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
  });

  describe('staged image save flow', () => {
    let imagesPanelStub: MockedObject<EntityImagesPanelComponent>;
    let filamentService: MockedObject<FilamentService>;
    let toastr: MockedObject<ToastrService>;
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
      imagesPanelStub = {
        uploadStagedImages: vi
          .fn()
          .mockName('EntityImagesPanelComponent.uploadStagedImages'),
        retryFailedUploads: vi
          .fn()
          .mockName('EntityImagesPanelComponent.retryFailedUploads'),
        hasStagedImages: vi.fn().mockReturnValue(false) as never,
      } as unknown as MockedObject<EntityImagesPanelComponent>;
      // The real panel is a view child of a 1000-line template; swapping the
      // query out is far cheaper than driving the DOM to stage a file.
      (
        component as unknown as {
          imagesPanel: () => unknown;
        }
      ).imagesPanel = () => imagesPanelStub;

      filamentService = TestBed.inject(
        FilamentService
      ) as MockedObject<FilamentService>;
      filamentService.addFilament.mockReturnValue(
        of({ id: 'new-filament-id' } as FilamentDetail)
      );

      toastr = TestBed.inject(ToastrService) as MockedObject<ToastrService>;

      router = TestBed.inject(Router);
      vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    const stagedImages = (staged: boolean) =>
      (imagesPanelStub.hasStagedImages as unknown as Mock).mockReturnValue(
        staged
      );

    it('blocks navigation when images are staged but unsaved', () => {
      component.filamentForm.markAsPristine();
      stagedImages(true);

      expect(component.canDeactivate()).toBe(false);
    });

    it('allows navigation when the form is clean and nothing is staged', () => {
      component.filamentForm.markAsPristine();
      stagedImages(false);

      expect(component.canDeactivate()).toBe(true);
    });

    it('uploads staged images after creating a new filament, then navigates', async () => {
      setUpNewFilamentForm();
      stagedImages(true);
      imagesPanelStub.uploadStagedImages.mockReturnValue(
        of({
          transientFailures: [],
          permanentFailures: [],
          allSucceeded: true,
        })
      );

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
      imagesPanelStub.uploadStagedImages.mockReturnValue(
        of({
          transientFailures: [new File(['x'], 'spool.png')],
          permanentFailures: [],
          allSucceeded: false,
        })
      );

      component.onSubmit();
      await fixture.whenStable();

      // Without this the form ID stays null and the next submit POSTs another
      // material.
      expect(component.filamentForm.get('id')!.value).toBe('new-filament-id');
      expect(component.saving()).toBe(false);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(toastr.warning).toHaveBeenCalled();
    });

    // The URL used to be rewritten the instant the create returned, while the
    // photos were still uploading. That navigation ran pendingChangesGuard,
    // which asks the panel whether anything is staged - and mid-upload the
    // answer is yes, so saving a new material prompted "You have unsaved
    // changes" about the very photos it was uploading.
    it('does not navigate while the staged photos are still uploading', () => {
      setUpNewFilamentForm();
      stagedImages(true);
      // Never emits: the upload is still in flight for the whole test.
      imagesPanelStub.uploadStagedImages.mockReturnValue(new Subject());

      component.onSubmit();

      expect(router.navigate).not.toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('leaves the guard alone for its own post-save URL rewrite', async () => {
      setUpNewFilamentForm();
      stagedImages(true);
      imagesPanelStub.uploadStagedImages.mockReturnValue(
        of({
          transientFailures: [new File(['x'], 'spool.png')],
          permanentFailures: [],
          allSucceeded: false,
        })
      );

      let guardAnswer: boolean | null = null;
      (router.navigate as Mock).mockImplementation(() => {
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
      expect(guardAnswer).toBe(true);
      // Restored afterwards, or the rest of the page's life skips the check.
      expect(component.canDeactivate()).toBe(false);
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
  let mockDialog: MockedObject<MatDialog>;

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
    mockDialog = {
      open: vi.fn().mockName('MatDialog.open'),
    } as unknown as MockedObject<MatDialog>;

    const mockFilamentService = {
      getFilamentBrands: vi
        .fn()
        .mockName('FilamentService.getFilamentBrands')
        .mockReturnValue(of({ brands: [] })),
      getFilamentPurchaseLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentPurchaseLocations')
        .mockReturnValue(of({ purchaseLocations: [] })),
      getFilamentStorageLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentStorageLocations')
        .mockReturnValue(of({ storageLocations: [] })),
      addFilament: vi
        .fn()
        .mockName('FilamentService.addFilament')
        .mockReturnValue(of({} as FilamentDetail)),
      updateFilament: vi
        .fn()
        .mockName('FilamentService.updateFilament')
        .mockReturnValue(of({} as FilamentDetail)),
    } as unknown as MockedObject<FilamentService>;
    stubImageTarget(mockFilamentService);
    const mockToastr = {
      success: vi.fn().mockName('ToastrService.success'),
    };
    const mockUserSettings = {
      updateUserSetting: vi
        .fn()
        .mockName('UserSettingService.updateUserSetting'),
    };
    const mockLog = {
      logException: vi.fn().mockName('LoggingService.logException'),
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
    };

    await TestBed.configureTestingModule({
      imports: [
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
        RouterTestingModule.withRoutes(ANYWHERE),
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
        FilamentTagUidsComponent,
        MatButtonModule,
        MatTooltipModule,
        FilamentDetailComponent,
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
    expect(calcComponent.canShowSpoolCalculator).toBe(true);
  });

  it('hides the calculator when filamentRemaining is null', async () => {
    await setup({ filamentRemaining: null });
    expect(calcComponent.canShowSpoolCalculator).toBe(false);
  });

  it('hides the calculator when spool weight cannot be resolved', async () => {
    await setup({
      spoolWeightMg: 0,
      initialTotalWeightMg: 1000000,
      initialNominalWeightMg: 1000000,
    });
    expect(calcComponent.canShowSpoolCalculator).toBe(false);
  });

  it('renders the calculator button disabled while the form is dirty', async () => {
    await setup({});
    calcComponent.filamentForm.markAsDirty();
    calcFixture.detectChanges();

    const button: HTMLButtonElement | null =
      calcFixture.nativeElement.querySelector('#spool-calc-button');
    expect(button).not.toBeNull();
    expect(button!.disabled).toBe(true);
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
    mockDialog.open.mockReturnValue({
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
    expect(calcComponent.filamentForm.dirty).toBe(true);

    const logSpy = TestBed.inject(LoggingService).logEvent as Mock;
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
    mockDialog.open.mockReturnValue({
      afterClosed: () => of(undefined),
    } as MatDialogRef<unknown>);

    const before = calcComponent.filamentAdjustments.length;
    calcComponent.openSpoolWeightCalculator();

    expect(calcComponent.filamentAdjustments.length).toBe(before);
  });

  it('passes the spool number to the QR label dialog', async () => {
    await setup({ spoolNumber: 7 });

    calcComponent.printQrLabel();

    const data = vi.mocked(mockDialog.open).mock.lastCall[1]
      ?.data as QrLabelDialogData;
    expect(data.filaments[0].spoolNumber).toBe(7);
  });
});

describe('FilamentDetailComponent - value serialization', () => {
  let serComponent: FilamentDetailComponent;
  let serFixture: ComponentFixture<FilamentDetailComponent>;
  let mockFilamentSvc: MockedObject<FilamentService>;
  let mockToastr: MockedObject<ToastrService>;

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
    mockFilamentSvc = {
      getFilamentBrands: vi
        .fn()
        .mockName('FilamentService.getFilamentBrands')
        .mockReturnValue(of({ brands: [] })),
      getFilamentPurchaseLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentPurchaseLocations')
        .mockReturnValue(of({ purchaseLocations: [] })),
      getFilamentStorageLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentStorageLocations')
        .mockReturnValue(of({ storageLocations: [] })),
      addFilament: vi
        .fn()
        .mockName('FilamentService.addFilament')
        .mockReturnValue(of({} as never)),
      updateFilament: vi
        .fn()
        .mockName('FilamentService.updateFilament')
        .mockReturnValue(of({} as never)),
    } as unknown as MockedObject<FilamentService>;
    stubImageTarget(mockFilamentSvc);
    mockToastr = {
      success: vi.fn().mockName('ToastrService.success'),
      error: vi.fn().mockName('ToastrService.error'),
    } as unknown as MockedObject<ToastrService>;
    const mockUserSettings = {
      updateUserSetting: vi
        .fn()
        .mockName('UserSettingService.updateUserSetting'),
    };
    const mockLog = {
      logException: vi.fn().mockName('LoggingService.logException'),
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
    };

    await TestBed.configureTestingModule({
      imports: [
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
        RouterTestingModule.withRoutes(ANYWHERE),
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
        FilamentTagUidsComponent,
        MatButtonModule,
        MatTooltipModule,
        FilamentDetailComponent,
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
    const spy = mockFilamentSvc.updateFilament as Mock;
    return vi.mocked(spy).mock.lastCall[0];
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

  describe('tag UIDs', () => {
    const conflict = () =>
      new HttpErrorResponse({
        status: 409,
        error: {
          title: 'Tag already assigned',
          status: 409,
          detail: 'Tag 04A23F11 is already on "Blue PLA".',
          tagUid: '04A23F11',
          filamentId: 'other-spool',
          filamentDisplayName: 'Blue PLA',
        },
      });

    it('saves the loaded tags back unchanged', async () => {
      await setupSerialization({ tagUids: ['04A23F11', 'DEADBEEF'] });

      serComponent.onSubmit();

      expect(savedFilament().tagUids).toEqual(['04A23F11', 'DEADBEEF']);
    });

    it('sends an empty list once the last tag is removed, which clears them', async () => {
      await setupSerialization({ tagUids: ['04A23F11'] });
      serComponent.filamentForm.get('tagUids')!.setValue([]);

      serComponent.onSubmit();

      expect(savedFilament().tagUids).toEqual([]);
    });

    // PUT keeps a spool's tags when the field is absent. A response without
    // the field means an API that predates tags, and an empty list sent back
    // to a newer one would wipe tags this page never displayed.
    it('leaves tagUids out when the loaded filament had no tagUids field', async () => {
      await setupSerialization({});

      serComponent.onSubmit();

      expect('tagUids' in savedFilament()).toBe(false);
    });

    // The page stays on a material whose photos failed to upload, so the next
    // save comes from the same component. Its loaded filament never had tags.
    it('sends an empty list on a later save once an earlier one sent tags', async () => {
      await setupSerialization({});
      serComponent.filamentForm.get('tagUids')!.setValue(['04A23F11']);
      serComponent.onSubmit();

      serComponent.filamentForm.get('tagUids')!.setValue([]);
      serComponent.onSubmit();

      expect(savedFilament().tagUids).toEqual([]);
    });

    it('does not save while a refused UID is left in the tag field', async () => {
      await setupSerialization({ tagUids: [] });
      const tagInput = (
        serFixture.nativeElement as HTMLElement
      ).querySelector<HTMLInputElement>('input[data-testid="tag-uid-input"]')!;
      tagInput.value = '04A23F1';
      tagInput.dispatchEvent(new Event('input'));
      tagInput.dispatchEvent(new Event('blur'));

      serComponent.onSubmit();

      expect(mockFilamentSvc.updateFilament).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(tagInput);
    });

    it('names the spool that already holds a tag when the save conflicts', async () => {
      await setupSerialization({ tagUids: [] });
      mockFilamentSvc.updateFilament.mockReturnValue(
        throwError(() => conflict())
      );
      serComponent.filamentForm.get('tagUids')!.setValue(['04A23F11']);

      serComponent.onSubmit();
      serFixture.detectChanges();

      expect(serComponent.saving()).toBe(false);
      const message = (serFixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="tag-uid-conflict"]'
      );
      expect(message?.textContent).toContain('Blue PLA');
      expect(message?.querySelector('a')?.getAttribute('href')).toBe(
        '/filament/other-spool'
      );
      expect(mockToastr.error).toHaveBeenCalled();
    });

    it('clears the conflict once the tags change', async () => {
      await setupSerialization({ tagUids: [] });
      mockFilamentSvc.updateFilament.mockReturnValue(
        throwError(() => conflict())
      );
      serComponent.filamentForm.get('tagUids')!.setValue(['04A23F11']);
      serComponent.onSubmit();

      serComponent.filamentForm.get('tagUids')!.setValue([]);
      serFixture.detectChanges();

      expect(
        (serFixture.nativeElement as HTMLElement).querySelector(
          '[data-testid="tag-uid-conflict"]'
        )
      ).toBeNull();
    });
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
    const mockFilamentService = {
      getFilamentBrands: vi
        .fn()
        .mockName('FilamentService.getFilamentBrands')
        .mockReturnValue(of({ brands: [] })),
      getFilamentPurchaseLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentPurchaseLocations')
        .mockReturnValue(of({ purchaseLocations: [] })),
      getFilamentStorageLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentStorageLocations')
        .mockReturnValue(of({ storageLocations: [] })),
      addFilament: vi
        .fn()
        .mockName('FilamentService.addFilament')
        .mockReturnValue(of({} as FilamentDetail)),
      updateFilament: vi
        .fn()
        .mockName('FilamentService.updateFilament')
        .mockReturnValue(of({} as FilamentDetail)),
    } as unknown as MockedObject<FilamentService>;
    stubImageTarget(mockFilamentService);
    const mockToastr = {
      success: vi.fn().mockName('ToastrService.success'),
    };
    const mockUserSettings = {
      updateUserSetting: vi
        .fn()
        .mockName('UserSettingService.updateUserSetting'),
    };
    const mockLog = {
      logException: vi.fn().mockName('LoggingService.logException'),
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
    };
    const mockPrintService = {
      getPrintSummaries: vi.fn().mockName('PrintService.getPrintSummaries'),
      getPrintImage: vi.fn().mockName('PrintService.getPrintImage'),
    };
    mockPrintService.getPrintSummaries.mockReturnValue(
      of({ items: [], paging: { totalCount: 0 } } as never)
    );
    mockPrintService.getPrintImage.mockReturnValue(of(''));

    await TestBed.configureTestingModule({
      imports: [
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
        RouterTestingModule.withRoutes(ANYWHERE),
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
        FilamentTagUidsComponent,
        MatButtonModule,
        MatTooltipModule,
        FilamentRemainingCardComponent,
        FilamentPrintsPanelComponent,
        FilamentDetailComponent,
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
    // copyFilamentDetailResolver nulls the id: the clone's remaining and
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
    // A false dirty state would trip pendingChangesGuard and block navigation.
    expect(usageComponent.filamentForm.dirty).toBe(false);
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

/**
 * Scan spool's "New material with this tag" opens /materials/new with the UID in navigation
 * state, never in the URL, so it can't reach page-view telemetry.
 */
describe('FilamentDetailComponent scanned tag', () => {
  let fixture: ComponentFixture<FilamentDetailComponent>;
  let service: MockedObject<FilamentService>;

  afterEach(() => history.replaceState(null, ''));

  async function setup(
    tag: string | null,
    filament: unknown = null,
    read?: unknown,
    materials: Material[] = []
  ) {
    history.replaceState(
      tag === null
        ? null
        : {
            scannedTagUid: tag,
            ...(read === undefined ? {} : { scannedTagRead: read }),
          },
      ''
    );
    const mockFilamentService = {
      getFilamentBrands: vi
        .fn()
        .mockName('FilamentService.getFilamentBrands')
        .mockReturnValue(of({ brands: [] })),
      getFilamentPurchaseLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentPurchaseLocations')
        .mockReturnValue(of({ purchaseLocations: [] })),
      getFilamentStorageLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentStorageLocations')
        .mockReturnValue(of({ storageLocations: [] })),
      addFilament: vi
        .fn()
        .mockName('FilamentService.addFilament')
        .mockReturnValue(of({} as FilamentDetail)),
      updateFilament: vi
        .fn()
        .mockName('FilamentService.updateFilament')
        .mockReturnValue(of({} as FilamentDetail)),
    } as unknown as MockedObject<FilamentService>;
    stubImageTarget(mockFilamentService);
    service = mockFilamentService;

    await TestBed.configureTestingModule({
      imports: [
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
        RouterTestingModule.withRoutes(ANYWHERE),
        MatNativeDateModule,
        FilamentDetailComponent,
      ],
      providers: [
        { provide: FilamentService, useValue: mockFilamentService },
        {
          provide: ToastrService,
          useValue: {
            success: vi.fn().mockName('ToastrService.success'),
          },
        },
        {
          provide: UserSettingService,
          useValue: {
            updateUserSetting: vi
              .fn()
              .mockName('UserSettingService.updateUserSetting'),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            logException: vi.fn().mockName('LoggingService.logException'),
            logEvent: vi.fn().mockName('LoggingService.logEvent'),
          },
        },
        { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              filament,
              materials,
              materialCategories: [],
              defaultFilamentDiameterMmSetting: null,
              defaultFilamentPriceSetting: null,
            }),
            snapshot: {
              // A UID in the query string is ignored: it belongs in navigation state.
              queryParamMap: convertToParamMap({ tag: 'AAAAAAAA' }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FilamentDetailComponent);
    fixture.detectChanges();
  }

  const tagUids = () =>
    fixture.componentInstance.filamentForm.get('tagUids')!.value as string[];

  it('starts a new material with the scanned tag', async () => {
    await setup('04:a2:3f:11');

    expect(tagUids()).toEqual(['04A23F11']);
    expect(fixture.componentInstance.filamentForm.dirty).toBe(true);
  });

  it('ignores a malformed tag', async () => {
    await setup('not-hex');
    expect(tagUids()).toEqual([]);
  });

  it('ignores a tag in the query string', async () => {
    await setup(null);
    expect(tagUids()).toEqual([]);
  });

  it('ignores the scanned tag on an existing material', async () => {
    await setup('04A23F11', {
      id: 'filament-1',
      displayName: 'Test',
      materialType: 'PLA',
      materialDensityGramPerCubicCm: 1.24,
      filamentAdjustments: [],
      colors: [],
      tagUids: ['AABB'],
    });
    expect(tagUids()).toEqual(['AABB']);
  });

  describe('with a tag reading', () => {
    const match: CatalogMatch = {
      id: 'cat-1',
      confidence: 0.9,
      spoolWeightG: 140,
      colorName: 'Black',
      name: '',
      manufacturer: 'Polymaker',
      source: 'SpoolmanDB',
    };
    const read = () => ({
      reading: SNAPMAKER_805BEC3E,
      catalogMatch: match,
    });
    const control = (name: string) =>
      fixture.componentInstance.filamentForm.get(name)!;
    const field = (id: string) =>
      (fixture.nativeElement as HTMLElement)
        .querySelector(`#${id}`)!
        .closest('mat-form-field')!;
    const hintOf = (id: string) =>
      field(id)
        .querySelector('mat-hint')
        ?.textContent?.replace(/\s+/g, ' ')
        .trim();

    it('pre-fills the form from the reading and the catalog match', async () => {
      await setup('805BEC3E', null, read());

      expect(tagUids()).toEqual(['805BEC3E']);
      expect(control('brand').value).toBe('Snapmaker');
      expect(control('materialType').value).toBe('PLA');
      expect(control('displayName').value).toBe('SnapSpeed PLA');
      expect(control('colorName').value).toBe('Black');
      expect(control('colorHex').value).toBe('#080a0d');
      expect(control('colors').value).toEqual(['#080a0d']);
      expect(control('diameterMm').value).toBe(1.75);
      expect(control('initialNominalWeightG').value).toBe(500);
      expect(control('spoolWeightG').value).toBe(140);
      expect(control('tempRangeStart').value).toBe(190);
      expect(control('tempRangeEnd').value).toBe(230);
      expect(control('recommendedTemp').value).toBe(220);
      expect(control('recommendedBedTemp').value).toBe(60);
    });

    it('marks each pre-filled field with where it came from', async () => {
      await setup('805BEC3E', null, read());
      fixture.detectChanges();

      expect(hintOf('edit-filament-brand')).toBe('From tag');
      expect(hintOf('edit-filament-name')).toBe('From tag');
      expect(hintOf('edit-filament-diameter')).toBe('From tag');
      expect(hintOf('edit-filament-spool-weight')).toBe('From SpoolmanDB');
      expect(hintOf('edit-filament-color')).toBe('From SpoolmanDB');
      const link = field('edit-filament-spool-weight').querySelector(
        'mat-hint a'
      )!;
      expect(link.getAttribute('href')).toBe(
        'https://github.com/Donkie/SpoolmanDB'
      );
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(link.getAttribute('target')).toBe('_blank');
    });

    it('removes a hint once the user edits that field', async () => {
      await setup('805BEC3E', null, read());
      fixture.detectChanges();

      const input = (fixture.nativeElement as HTMLElement).querySelector(
        '#edit-filament-brand'
      ) as HTMLInputElement;
      input.value = 'Other';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(hintOf('edit-filament-brand')).not.toBe('From tag');
      expect(hintOf('edit-filament-diameter')).toBe('From tag');
    });

    it('saves the reading but no catalog entry when every field was changed', async () => {
      await setup('805BEC3E', null, read());
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const type = (id: string, value: string) => {
        const input = root.querySelector(`#${id}`) as HTMLInputElement;
        input.value = value;
        input.dispatchEvent(new Event('input'));
      };
      type('edit-filament-brand', 'Other brand');
      type('edit-filament-material-type', 'PETG');
      type('edit-filament-name', 'My spool');
      type('edit-filament-color', 'Red');
      type('edit-filament-diameter', '2.85');
      type('filament-inital-nominal-weight', '1000');
      type('edit-filament-spool-weight', '200');
      type('edit-filament-hotend-temp-range-start', '200');
      type('edit-filament-hotend-temperature-range-end', '250');
      type('edit-filament-recommended-hotend-temp', '240');
      type('edit-filament-recommended-bed-temp', '70');
      root
        .querySelectorAll<HTMLInputElement>('input[type="color"]')
        .forEach((input) => {
          input.value = '#112233';
          input.dispatchEvent(new Event('input'));
        });
      // Not rendered while the source is Weight, so there is no input to type in.
      control('initialNominalLengthM').setValue(99);
      control('materialDensityGramPerCubicCm').setValue(1.24);
      fixture.detectChanges();

      expect(root.querySelectorAll('.tag-source-hint').length).toBe(0);
      expect(root.querySelector('.tag-source-note')).toBeNull();

      fixture.componentInstance.onSubmit();

      const sent = vi.mocked(service.addFilament).mock.lastCall[0];
      expect(sent.brand).toBe('Other brand');
      expect(sent.colors).toEqual(['112233']);
      expect(sent.tagUids).toEqual(['805BEC3E']);
      expect(sent.tagReadings).toEqual([
        { uid: '805BEC3E', reading: SNAPMAKER_805BEC3E },
      ]);
      // The name, brand and material were corrected: no vote for the entry they rejected.
      expect(sent.catalogEntryId).toBeUndefined();
    });

    it('sends no catalog entry once one identity field was edited', async () => {
      await setup('805BEC3E', null, read());
      control('materialDensityGramPerCubicCm').setValue(1.24);
      control('brand').setValue('Other brand');

      fixture.componentInstance.onSubmit();

      const sent = vi.mocked(service.addFilament).mock.lastCall[0];
      expect(sent.tagReadings).toEqual([
        { uid: '805BEC3E', reading: SNAPMAKER_805BEC3E },
      ]);
      expect(sent.catalogEntryId).toBeUndefined();
    });

    it('still sends the catalog entry when only the spool weight was edited', async () => {
      await setup('805BEC3E', null, read());
      fixture.detectChanges();
      const input = (fixture.nativeElement as HTMLElement).querySelector(
        '#edit-filament-spool-weight'
      ) as HTMLInputElement;
      input.value = '200';
      input.dispatchEvent(new Event('input'));
      control('materialDensityGramPerCubicCm').setValue(1.24);
      fixture.detectChanges();

      fixture.componentInstance.onSubmit();

      const sent = vi.mocked(service.addFilament).mock.lastCall[0];
      expect(sent.spoolWeightMg).toBe(200000);
      expect(sent.tagReadings).toEqual([
        { uid: '805BEC3E', reading: SNAPMAKER_805BEC3E },
      ]);
      expect(sent.catalogEntryId).toBe('cat-1');
    });

    it('sends no catalog entry for a match with an empty id', async () => {
      await setup('805BEC3E', null, {
        reading: SNAPMAKER_805BEC3E,
        catalogMatch: { ...match, id: '' },
      });
      control('materialDensityGramPerCubicCm').setValue(1.24);
      control('displayName').setValue('X');
      control('materialType').setValue('PLA');

      expect(control('colorName').value).toBe('');
      expect(control('spoolWeightG').value).toBeNaN();

      fixture.componentInstance.onSubmit();

      const sent = vi.mocked(service.addFilament).mock.lastCall[0];
      expect(sent.catalogEntryId).toBeUndefined();
    });

    describe('density', () => {
      const PLA: Material = {
        id: 'pla',
        acronym: 'PLA',
        name: 'Polylactic Acid',
        materialCategoryNickname: 'filament',
        densityGramPerCubicCm: 1.24,
      };
      const density = () => control('materialDensityGramPerCubicCm').value;

      it('fills the density from the SpoolmanDB match and says so', async () => {
        await setup(
          '805BEC3E',
          null,
          {
            reading: SNAPMAKER_805BEC3E,
            catalogMatch: { ...match, densityGramPerCubicCm: 1.27 },
          },
          [PLA]
        );
        fixture.detectChanges();

        // The product's own density beats the generic one for its material.
        expect(density()).toBe(1.27);
        expect(hintOf('edit-filament-density')).toBe('From SpoolmanDB');
      });

      it('names the material as the list does and takes its density without a catalog density', async () => {
        await setup('805BEC3E', null, read(), [PLA]);
        fixture.detectChanges();

        expect(control('materialType').value).toBe('PLA (Polylactic Acid)');
        expect(hintOf('edit-filament-material-type')).toBe('From tag');
        expect(density()).toBe(1.24);
        expect(hintOf('edit-filament-density')).toBeUndefined();
      });

      it('still sends the catalog entry after naming the material as the list does', async () => {
        await setup('805BEC3E', null, read(), [PLA]);

        fixture.componentInstance.onSubmit();

        const sent = vi.mocked(service.addFilament).mock.lastCall[0];
        expect(sent.materialType).toBe('PLA (Polylactic Acid)');
        expect(sent.catalogEntryId).toBe('cat-1');
      });

      it('keeps the tag material and leaves the density empty when nothing knows it', async () => {
        await setup('805BEC3E', null, read(), [
          { ...PLA, acronym: 'PETG', name: 'PETG' },
        ]);

        expect(control('materialType').value).toBe('PLA');
        expect(density()).toBeFalsy();
      });
    });

    it('ignores an implausible reading', async () => {
      await setup('805BEC3E', null, 'nonsense');

      expect(tagUids()).toEqual(['805BEC3E']);
      expect(control('brand').value).toBe('');
      expect(field('edit-filament-brand').querySelector('mat-hint')).toBeNull();
    });

    it('sends no reading or catalog entry without a scanned reading', async () => {
      await setup('805BEC3E');
      control('materialDensityGramPerCubicCm').setValue(1.24);
      control('displayName').setValue('X');
      control('materialType').setValue('PLA');

      fixture.componentInstance.onSubmit();

      const sent = vi.mocked(service.addFilament).mock.lastCall[0];
      expect(sent.tagReadings).toBeUndefined();
      expect(sent.catalogEntryId).toBeUndefined();
    });
  });

  describe('with tags scanned on the page', () => {
    const PETG: TagReading = {
      format: 'openspool',
      decoderVersion: 1,
      materialType: 'PETG',
    };
    const existing = {
      id: 'filament-1',
      displayName: 'Test',
      materialType: 'PLA',
      materialDensityGramPerCubicCm: 1.24,
      filamentAdjustments: [],
      colors: [],
      tagUids: ['AABB'],
    };
    const tagList = () =>
      fixture.debugElement.query(By.directive(FilamentTagUidsComponent))
        .componentInstance as FilamentTagUidsComponent;
    const scanned = (
      ...readings: {
        uid: string;
        reading: TagReading;
      }[]
    ) => tagList().readingsChange.emit(readings);
    const control = (name: string) =>
      fixture.componentInstance.filamentForm.get(name)!;

    it('sends what a newly added tag says, and nothing for a tag the spool had', async () => {
      await setup(null, existing);
      control('tagUids').setValue(['AABB', '805BEC3E']);
      scanned(
        { uid: 'AABB', reading: PETG },
        { uid: '805BEC3E', reading: SNAPMAKER_805BEC3E }
      );

      fixture.componentInstance.onSubmit();

      const sent = vi.mocked(service.updateFilament).mock.lastCall[0];
      expect(sent.tagReadings).toEqual([
        { uid: '805BEC3E', reading: SNAPMAKER_805BEC3E },
      ]);
    });

    it('sends no reading for a scanned tag removed before Submit', async () => {
      await setup(null, existing);
      control('tagUids').setValue(['AABB', '805BEC3E']);
      scanned({ uid: '805BEC3E', reading: SNAPMAKER_805BEC3E });
      control('tagUids').setValue(['AABB']);

      fixture.componentInstance.onSubmit();

      const sent = vi.mocked(service.updateFilament).mock.lastCall[0];
      expect(sent.tagReadings).toBeUndefined();
    });

    it('merges them with the tag a new material was scanned from, one per UID', async () => {
      await setup('805BEC3E', null, {
        reading: SNAPMAKER_805BEC3E,
        catalogMatch: null,
      });
      control('materialDensityGramPerCubicCm').setValue(1.24);
      control('tagUids').setValue(['805BEC3E', '04A23F11']);
      scanned(
        { uid: '805BEC3E', reading: PETG },
        { uid: '04A23F11', reading: PETG }
      );

      fixture.componentInstance.onSubmit();

      const sent = vi.mocked(service.addFilament).mock.lastCall[0];
      expect(sent.tagReadings).toEqual([
        { uid: '805BEC3E', reading: SNAPMAKER_805BEC3E },
        { uid: '04A23F11', reading: PETG },
      ]);
    });
  });
});

describe('FilamentDetailComponent - autocomplete options', () => {
  let component: FilamentDetailComponent;
  let routeData: BehaviorSubject<Record<string, unknown>>;

  const pla: Material = {
    id: 'm-pla',
    acronym: 'PLA',
    name: 'Polylactic Acid',
    materialCategoryNickname: 'filament',
    densityGramPerCubicCm: 1.24,
  };
  const petg: Material = {
    id: 'm-petg',
    acronym: 'PETG',
    name: 'Polyethylene Terephthalate Glycol',
    materialCategoryNickname: 'filament',
    densityGramPerCubicCm: 1.27,
  };

  function dataFor(materials: Material[]) {
    return {
      filament: { id: 'filament-1', colors: [], filamentAdjustments: [] },
      materials,
      materialCategories: [],
    };
  }

  async function setup() {
    const filamentSvc = {
      getFilamentBrands: vi
        .fn()
        .mockName('FilamentService.getFilamentBrands')
        .mockReturnValue(of({ brands: ['Prusament', 'Polymaker'] })),
      getFilamentPurchaseLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentPurchaseLocations')
        .mockReturnValue(of({ purchaseLocations: ['Amazon'] })),
      getFilamentStorageLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentStorageLocations')
        .mockReturnValue(
          of({
            storageLocations: ['Shelf A', 'Dry box'],
          })
        ),
    };
    stubImageTarget(filamentSvc);
    routeData = new BehaviorSubject<Record<string, unknown>>(
      dataFor([pla, petg])
    );

    await TestBed.configureTestingModule({
      imports: [
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
        RouterTestingModule.withRoutes(ANYWHERE),
        MatNativeDateModule,
        FilamentDetailComponent,
      ],
      providers: [
        { provide: FilamentService, useValue: filamentSvc },
        {
          provide: ToastrService,
          useValue: {
            success: vi.fn().mockName('ToastrService.success'),
          },
        },
        {
          provide: UserSettingService,
          useValue: {
            x: vi.fn().mockName('UserSettingService.x'),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            logEvent: vi.fn().mockName('LoggingService.logEvent'),
            logException: vi.fn().mockName('LoggingService.logException'),
          },
        },
        { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
        { provide: ActivatedRoute, useValue: { data: routeData } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(FilamentDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('offers every option at first, then those matching what is typed', async () => {
    await setup();

    expect(component.filteredFilamentBrands()).toEqual([
      'Polymaker',
      'Prusament',
    ]);
    expect(component.filteredMaterials().map((m) => m.id)).toEqual([
      'm-pla',
      'm-petg',
    ]);

    component.filamentForm.get('brand')!.setValue('prus');
    component.filamentForm.get('storageLocation')!.setValue('dry');
    component.filamentForm.get('materialType')!.setValue('petg');

    expect(component.filteredFilamentBrands()).toEqual(['Prusament']);
    expect(component.filteredFilamentStorageLocations()).toEqual(['Dry box']);
    expect(component.filteredMaterials().map((m) => m.id)).toEqual(['m-petg']);
  });

  it("fills in a picked material type's density", async () => {
    await setup();

    component.filamentForm
      .get('materialType')!
      .setValue(new MaterialNamePipe().transform(petg));

    expect(
      component.filamentForm.get('materialDensityGramPerCubicCm')!.value
    ).toBe(1.27);
  });

  it('starts over with the new materials when the route data changes', async () => {
    await setup();
    component.filamentForm.get('materialType')!.setValue('petg');

    routeData.next(dataFor([pla]));

    expect(component.filteredMaterials().map((m) => m.id)).toEqual(['m-pla']);
  });
});
