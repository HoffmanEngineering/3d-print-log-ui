import type { MockedObject } from 'vitest';
import { dispatchBeforeUnload } from 'src/app/core/guards/testing/dispatch-before-unload';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AdsenseModule } from 'ng2-adsense';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';

import {
  PrinterDetail,
  PrinterService,
} from 'src/app/core/services/printer.service';
import { FilamentSourceMeasurement } from 'src/app/core/services/filament.service';
import { PrinterCategory } from 'src/app/core/services/printer-categories.service';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrinterCatalogService,
  PrinterModel,
} from 'src/app/core/services/printer-catalog.service';
import { EntityImagesPanelComponent } from 'src/app/shared/entity-images-panel/entity-images-panel.component';
import { PrinterDetailComponent } from './printer-detail.component';
import { PrinterConnectionsComponent } from '../printer-connections/printer-connections.component';
import { PrinterSlotsComponent } from '../printer-slots/printer-slots.component';
import { PrinterSpoolmanComponent } from '../printer-spoolman/printer-spoolman.component';

const fffCategory = {
  nickname: 'FFF',
  name: 'Fused Filament Fabrication',
  materialCategory: { name: 'Filament', nickname: 'filament' },
  showNozzleDiameter: true,
  showFilamentDiameter: true,
  showBeamDiameter: false,
  showBedSize: true,
  showScreenResolution: false,
  showHasHeatedBed: true,
  showHasHeatedChamber: true,
} as unknown as PrinterCategory;

const aPrinterDetail = (overrides: Partial<PrinterDetail> = {}) =>
  ({
    id: 42,
    name: 'Voron 2.4',
    make: 'Formbot',
    model: 'Voron 2.4 350',
    description: '',
    isActive: true,
    loadedFilaments: [],
    category: fffCategory,
    ...overrides,
  }) as PrinterDetail;

const P1S: PrinterModel = {
  id: 'bambu-lab-p1s',
  make: 'Bambu Lab',
  model: 'P1S',
  technology: 'FFF',
  bedWidthMm: 256,
  bedDepthMm: 256,
  bedHeightMm: 256,
  nozzleOptionsMm: [0.2, 0.4, 0.6, 0.8],
  defaultNozzleMm: 0.4,
  filamentDiameterMm: 1.75,
  hasHeatedBed: true,
  hasHeatedChamber: false,
  defaultSlotCount: 1,
};

describe('PrinterDetailComponent', () => {
  let component: PrinterDetailComponent;
  let fixture: ComponentFixture<PrinterDetailComponent>;
  let printerService: MockedObject<PrinterService>;
  let catalog: MockedObject<PrinterCatalogService>;
  let logging: MockedObject<LoggingService>;
  let router: MockedObject<Router>;

  let dialog: MockedObject<MatDialog>;

  /**
   * `printer` is null for the create route, which the resolver models the same way.
   *
   * `settle` lets startup finish first (the TestBed is zoneless, like the app), so a
   * view that is not repainted after a later response shows up as stale.
   */
  const setUp = async (
    printer: PrinterDetail | null,
    {
      settle = false,
      data = undefined as Observable<unknown> | undefined,
      linked = null as PrinterModel | null,
    } = {}
  ) => {
    catalog = {
      search: vi.fn().mockName('PrinterCatalogService.search'),
      popular: vi.fn().mockName('PrinterCatalogService.popular'),
      get: vi.fn().mockName('PrinterCatalogService.get'),
      match: vi.fn().mockName('PrinterCatalogService.match'),
    } as unknown as MockedObject<PrinterCatalogService>;
    catalog.search.mockReturnValue(of([]));
    catalog.popular.mockReturnValue(of([]));
    catalog.get.mockReturnValue(of(linked));
    catalog.match.mockReturnValue(of(null));
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;

    printerService = {
      addPrinter: vi.fn().mockName('PrinterService.addPrinter'),
      updatePrinter: vi.fn().mockName('PrinterService.updatePrinter'),
      imageTarget: vi.fn().mockName('PrinterService.imageTarget'),
    } as unknown as MockedObject<PrinterService>;
    printerService.addPrinter.mockReturnValue(of(aPrinterDetail()));
    printerService.updatePrinter.mockReturnValue(of(aPrinterDetail()));
    printerService.imageTarget.mockImplementation((id) => ({
      id,
      gateway: {
        upload: vi.fn().mockName('EntityImageGateway.upload'),
        delete: vi.fn().mockName('EntityImageGateway.delete'),
        reorder: vi.fn().mockName('EntityImageGateway.reorder'),
        setDefault: vi.fn().mockName('EntityImageGateway.setDefault'),
      },
    }));

    router = {
      navigate: vi.fn().mockName('Router.navigate'),
      navigateByUrl: vi.fn().mockName('Router.navigateByUrl'),
    } as unknown as MockedObject<Router>;
    router.navigateByUrl.mockReturnValue(Promise.resolve(true));
    router.navigate.mockReturnValue(Promise.resolve(true));

    const toastr = {
      success: vi.fn().mockName('ToastrService.success'),
      error: vi.fn().mockName('ToastrService.error'),
      warning: vi.fn().mockName('ToastrService.warning'),
    };
    dialog = {
      open: vi.fn().mockName('MatDialog.open'),
    } as unknown as MockedObject<MatDialog>;

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
        PrinterConnectionsComponent,
        PrinterSlotsComponent,
        PrinterSpoolmanComponent,
        // The template renders app-ad for real, which needs the Adsense config.
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
        PrinterDetailComponent,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PrinterService, useValue: printerService },
        { provide: PrinterCatalogService, useValue: catalog },
        { provide: LoggingService, useValue: logging },
        { provide: Router, useValue: router },
        { provide: ToastrService, useValue: toastr },
        { provide: MatDialog, useValue: dialog },
        {
          provide: ActivatedRoute,
          useValue: {
            data:
              data ??
              of({
                printer,
                printerCategories: [fffCategory],
                materialCategories: [],
              }),
            // getRedirectUrl reads returnUrl off the snapshot, so the snapshot has to be
            // a real ParamMap rather than a bare object.
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrinterDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    if (settle) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
  };

  it('creates', async () => {
    await setUp(aPrinterDetail());
    expect(component).toBeTruthy();
  });

  it('builds the form from the resolved printer', async () => {
    await setUp(aPrinterDetail());

    expect(component.printerForm().get('id')!.value).toBe(42);
    expect(component.printerForm().get('name')!.value).toBe('Voron 2.4');
  });

  // #252: a saved printer lists the connections logging it.
  it('shows the connections panel for a saved printer', async () => {
    await setUp(aPrinterDetail());

    const panel = fixture.debugElement.query(
      By.directive(PrinterConnectionsComponent)
    );
    expect(panel, 'app-printer-connections').not.toBeNull();
    expect(
      (panel.componentInstance as PrinterConnectionsComponent).printerId()
    ).toBe(42);
  });

  // #282: Spoolman sits next to the connections, told the saved category, make and model.
  it('gives the Spoolman panel the saved printer', async () => {
    await setUp(aPrinterDetail());

    const panel = fixture.debugElement.query(
      By.directive(PrinterSpoolmanComponent)
    );
    expect(panel, 'app-printer-spoolman').not.toBeNull();
    const spoolman = panel.componentInstance as PrinterSpoolmanComponent;
    expect(spoolman.printerId()).toBe(42);
    expect(spoolman.category()?.nickname).toBe('FFF');
    expect(spoolman.make()).toBe('Formbot');
    expect(spoolman.model()).toBe('Voron 2.4 350');
  });

  it('shows no Spoolman panel before the printer is saved', async () => {
    await setUp(null);

    expect(
      fixture.debugElement.query(By.directive(PrinterSpoolmanComponent))
    ).toBeNull();
  });

  it('shows no connections panel before the printer is saved', async () => {
    await setUp(null);

    expect(
      fixture.debugElement.query(By.directive(PrinterConnectionsComponent))
    ).toBeNull();
  });

  it('starts with a null id on the create route', async () => {
    await setUp(null);

    expect(component.printerForm().get('id')!.value).toBeNull();
  });

  it('enables only the fields the selected category declares', async () => {
    await setUp(aPrinterDetail());

    // FFF shows a nozzle diameter and no beam diameter, so the beam control is disabled
    // and its value is left out of the payload entirely.
    expect(component.printerForm().get('nozzleDiameter')!.enabled).toBe(true);
    expect(component.printerForm().get('beamDiameter')!.disabled).toBe(true);
  });

  it('blocks deactivation while the form is dirty', async () => {
    await setUp(aPrinterDetail());

    expect(component.canDeactivate()).toBe(true);

    component.printerForm().markAsDirty();
    expect(component.canDeactivate()).toBe(false);
  });

  it('asks before the page unloads only while the form is dirty', async () => {
    await setUp(aPrinterDetail());
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);

    component.printerForm().markAsDirty();
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
  });

  it('updates rather than creating when the form already carries an id', async () => {
    await setUp(aPrinterDetail());

    component.onSubmit();

    expect(printerService.updatePrinter).toHaveBeenCalled();
    expect(printerService.addPrinter).not.toHaveBeenCalled();
  });

  it('creates when the form has no id', async () => {
    await setUp(null);
    component.printerForm().patchValue({ name: 'New', make: 'X', model: 'Y' });

    component.onSubmit();

    expect(printerService.addPrinter).toHaveBeenCalled();
    expect(printerService.updatePrinter).not.toHaveBeenCalled();
  });

  // #255: multi-tool printers manage loaded filament per slot.
  describe('slots', () => {
    const spool = (id: string) => ({ id, displayName: `Spool ${id}` }) as never;

    const slotsPanel = () =>
      fixture.debugElement.query(By.directive(PrinterSlotsComponent));

    const legacyLoadButton = () =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('button')
      ).find((b) => b.textContent!.includes('Load Material'));

    it('starts a new printer with one slot', async () => {
      await setUp(null);

      expect(component.printerForm().get('slotCount')!.value).toBe(1);
    });

    it("saves the printer's slot count", async () => {
      await setUp(aPrinterDetail({ slotCount: 4 }));
      component.printerForm().patchValue({ slotCount: 2 });

      component.onSubmit();

      expect(
        vi.mocked(printerService.updatePrinter).mock.lastCall[0].slotCount
      ).toBe(2);
    });

    it('rejects a slot count below 1 or above 64', async () => {
      await setUp(aPrinterDetail());
      const control = component.printerForm().get('slotCount')!;

      control.setValue(0);
      expect(control.valid).toBe(false);
      control.setValue(65);
      expect(control.valid).toBe(false);
      control.setValue(4);
      expect(control.valid).toBe(true);
    });

    it('shows the slots for a saved multi-slot printer', async () => {
      await setUp(aPrinterDetail({ slotCount: 4 }));

      const panel = slotsPanel();
      expect(panel, 'app-printer-slots').not.toBeNull();
      expect(
        (panel.componentInstance as PrinterSlotsComponent).slotCount()
      ).toBe(4);
      expect(legacyLoadButton()).toBeUndefined();
    });

    it('keeps the single-tool list for a one-slot printer', async () => {
      await setUp(aPrinterDetail({ slotCount: 1 }));

      expect(slotsPanel()).toBeNull();
      expect(legacyLoadButton()).toBeDefined();
    });

    it('keeps the single-tool list for a printer from before slots', async () => {
      await setUp(aPrinterDetail());

      expect(slotsPanel()).toBeNull();
    });

    it('saves what the slots loaded, without marking the form dirty', async () => {
      await setUp(aPrinterDetail({ slotCount: 4 }));

      (
        slotsPanel().componentInstance as PrinterSlotsComponent
      ).loadedChange.emit([{ id: 'pf-1', filament: spool('a'), slot: 2 }]);
      fixture.detectChanges();

      expect(component.printerForm().dirty).toBe(false);
      component.onSubmit();
      const saved = vi.mocked(printerService.updatePrinter).mock.lastCall[0];
      expect(saved.loadedFilaments.map((pf) => pf.id)).toEqual(['pf-1']);
    });
  });

  describe('photos panel', () => {
    let panel: MockedObject<EntityImagesPanelComponent>;

    const aFile = () => new File(['x'], 'printer.jpg', { type: 'image/jpeg' });

    const succeeded = () =>
      of({
        transientFailures: [],
        permanentFailures: [],
        allSucceeded: true,
      });

    const transientlyFailed = () =>
      of({
        transientFailures: [aFile()],
        permanentFailures: [],
        allSucceeded: false,
      });

    const stubPanel = (staged: boolean) => {
      panel = {
        uploadStagedImages: vi
          .fn()
          .mockName('EntityImagesPanelComponent.uploadStagedImages'),
        retryFailedUploads: vi
          .fn()
          .mockName('EntityImagesPanelComponent.retryFailedUploads'),
        hasStagedImages: vi.fn().mockReturnValue(staged) as never,
      } as unknown as MockedObject<EntityImagesPanelComponent>;
      (
        component as unknown as {
          imagesPanel: () => unknown;
        }
      ).imagesPanel = () => panel;
    };

    const fillCreateForm = () => {
      component.printerForm().get('id')!.setValue(null);
      component.printerForm().patchValue({
        name: 'New',
        make: 'X',
        model: 'Y',
      });
    };

    it('exposes the resolved printer photos to the panel', async () => {
      await setUp(
        aPrinterDetail({
          images: [
            {
              id: 1,
              url: 'u',
              thumbnailUrl: 't',
              isDefault: true,
              displayOrder: 0,
            },
          ],
        })
      );

      expect(
        (
          component as unknown as {
            printerImages: () => unknown[];
          }
        ).printerImages().length
      ).toBe(1);
    });

    it('retargets the panel at the id the form currently holds', async () => {
      await setUp(aPrinterDetail());

      expect(
        (
          component as unknown as {
            imageTarget: () => {
              id: number | null;
            };
          }
        ).imageTarget().id
      ).toBe(42);
    });

    it('uploads staged images before navigating away on create', async () => {
      await setUp(null);
      stubPanel(true);
      printerService.addPrinter.mockReturnValue(of(aPrinterDetail({ id: 42 })));
      panel.uploadStagedImages.mockReturnValue(succeeded());
      fillCreateForm();

      component.onSubmit();
      await fixture.whenStable();

      expect(panel.uploadStagedImages).toHaveBeenCalledWith(42);
      expect(router.navigateByUrl).toHaveBeenCalled();
    });

    it('stays on the page and writes back the id when an upload fails', async () => {
      await setUp(null);
      stubPanel(true);
      printerService.addPrinter.mockReturnValue(of(aPrinterDetail({ id: 42 })));
      panel.uploadStagedImages.mockReturnValue(transientlyFailed());
      fillCreateForm();

      component.onSubmit();
      await fixture.whenStable();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(component.printerForm().get('id')!.value).toBe(42);
      expect(component.saving()).toBe(false);
    });

    it('updates rather than re-creating after a failed upload', async () => {
      await setUp(null);
      stubPanel(true);
      printerService.addPrinter.mockReturnValue(of(aPrinterDetail({ id: 42 })));
      panel.uploadStagedImages.mockReturnValue(transientlyFailed());
      fillCreateForm();

      component.onSubmit();
      await fixture.whenStable();

      printerService.addPrinter.mockClear();
      component.onSubmit();
      await fixture.whenStable();

      expect(printerService.addPrinter).not.toHaveBeenCalled();
      expect(printerService.updatePrinter).toHaveBeenCalled();
    });

    it('does not navigate while the staged photos are still uploading', async () => {
      await setUp(null);
      stubPanel(true);
      printerService.addPrinter.mockReturnValue(of(aPrinterDetail({ id: 42 })));
      // Never emits: the upload is in flight for the whole test.
      panel.uploadStagedImages.mockReturnValue(new Subject());
      fillCreateForm();

      component.onSubmit();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('blocks deactivation while images are staged', async () => {
      await setUp(aPrinterDetail());
      stubPanel(true);
      component.printerForm().markAsPristine();

      expect(component.canDeactivate()).toBe(false);
    });

    it('leaves the guard alone for its own post-save URL rewrite', async () => {
      await setUp(null);
      stubPanel(true);
      printerService.addPrinter.mockReturnValue(of(aPrinterDetail({ id: 42 })));
      panel.uploadStagedImages.mockReturnValue(transientlyFailed());
      fillCreateForm();

      let guardAnswer: boolean | null = null;
      router.navigate.mockImplementation(() => {
        // The guard runs during the navigation, with photos still staged for the
        // retry. It must not prompt for a navigation the page started itself.
        guardAnswer = component.canDeactivate() as boolean;
        return Promise.resolve(true);
      });

      component.onSubmit();
      await fixture.whenStable();

      expect(router.navigate).toHaveBeenCalledWith(['/printers', 42], {
        replaceUrl: true,
      });
      expect(guardAnswer).toBe(true);
    });
  });

  describe('once a response arrives', () => {
    const text = () => (fixture.nativeElement as HTMLElement).textContent;
    const saveButton = () =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        'button[type=submit]'
      )!;

    it('shows the printer the route resolves next', async () => {
      const resolved = (printer: PrinterDetail | null) => ({
        printer,
        printerCategories: [fffCategory],
        materialCategories: [],
      });
      const data = new BehaviorSubject<unknown>(resolved(null));
      await setUp(null, { settle: true, data });
      expect(text()).toContain('Add 3D Printer');

      data.next(resolved(aPrinterDetail()));
      fixture.detectChanges();

      expect(text()).toContain('Edit 3D Printer');
    });

    it('re-enables Save when the save fails', async () => {
      await setUp(aPrinterDetail(), { settle: true });
      const saved = new Subject<PrinterDetail>();
      printerService.updatePrinter.mockReturnValue(saved);

      component.onSubmit();
      fixture.detectChanges();
      expect(saveButton().disabled, 'while saving').toBe(true);

      saved.error(new Error('500'));
      fixture.detectChanges();

      expect(saveButton().disabled).toBe(false);
    });

    const loadedWith = (remaining: {
      filamentRemaining: number | null;
      filamentLengthRemainingInM: number | null;
      filamentVolumeRemainingInMl?: number | null;
      source?: FilamentSourceMeasurement | null;
    }) =>
      aPrinterDetail({
        loadedFilaments: [
          {
            id: 'pf-1',
            filament: {
              id: 'spool-1',
              displayName: 'Prusament Galaxy Black',
              colorName: '',
              materialType: 'PLA',
              ...remaining,
            },
          },
        ] as never,
      });

    it('says Not tracked for a loaded spool with no starting weight', async () => {
      await setUp(
        loadedWith({
          filamentRemaining: null,
          filamentLengthRemainingInM: null,
        }),
        { settle: true }
      );

      expect(text()).toContain('Not tracked');
      expect(text()).not.toContain('(g) remaining');
      expect(text()).not.toContain('(m) remaining');
    });

    it('shows grams and meters remaining for a tracked loaded spool', async () => {
      await setUp(
        loadedWith({
          filamentRemaining: 250000,
          filamentLengthRemainingInM: 84,
        }),
        { settle: true }
      );

      expect(text()).toContain('250 (g) remaining');
      expect(text()).toContain('84 (m) remaining');
      expect(text()).not.toContain('Not tracked');
    });

    // printlog-bridge#97: a resin printer's vat holds a bottle measured in mL.
    it('shows mL remaining for a loaded resin bottle', async () => {
      await setUp(
        loadedWith({
          filamentRemaining: 935000,
          filamentLengthRemainingInM: null,
          filamentVolumeRemainingInMl: 850,
        }),
        { settle: true }
      );

      expect(text()).toContain('850 (mL) remaining');
      expect(text()).not.toContain('(g) remaining');
      expect(text()).not.toContain('(m) remaining');
    });

    it('keeps grams and meters, without mL, for a filament spool', async () => {
      await setUp(
        loadedWith({
          filamentRemaining: 250000,
          filamentLengthRemainingInM: 84,
          filamentVolumeRemainingInMl: 201,
        }),
        { settle: true }
      );

      expect(text()).toContain('250 (g) remaining');
      expect(text()).toContain('84 (m) remaining');
      expect(text()).not.toContain('(mL) remaining');
    });

    // 3d-print-log-api#294: the summary's source says which it is, so no guessing.
    it('shows mL for a bottle whose source is Volume, even with a length remaining', async () => {
      await setUp(
        loadedWith({
          filamentRemaining: 935000,
          filamentLengthRemainingInM: 12,
          filamentVolumeRemainingInMl: 850,
          source: FilamentSourceMeasurement.Volume,
        }),
        { settle: true }
      );

      expect(text()).toContain('850 (mL) remaining');
      expect(text()).not.toContain('(g) remaining');
    });

    it('shows grams for a spool tracked by weight, even with no length remaining', async () => {
      await setUp(
        loadedWith({
          filamentRemaining: 250000,
          filamentLengthRemainingInM: null,
          filamentVolumeRemainingInMl: 201,
          source: FilamentSourceMeasurement.Weight,
        }),
        { settle: true }
      );

      expect(text()).toContain('250 (g) remaining');
      expect(text()).not.toContain('(mL) remaining');
    });

    it('falls back to the remaining figures when an older API sends no source', async () => {
      await setUp(
        loadedWith({
          filamentRemaining: 935000,
          filamentLengthRemainingInM: null,
          filamentVolumeRemainingInMl: 850,
          source: null,
        }),
        { settle: true }
      );

      expect(text()).toContain('850 (mL) remaining');
      expect(text()).not.toContain('(g) remaining');
    });

    it('says Not tracked, with no mL line, for an untracked spool', async () => {
      await setUp(
        loadedWith({
          filamentRemaining: null,
          filamentLengthRemainingInM: null,
          filamentVolumeRemainingInMl: null,
        }),
        { settle: true }
      );

      expect(text()).toContain('Not tracked');
      expect(text()).not.toContain('(mL) remaining');
    });

    it('lists a spool picked in the filament dialog', async () => {
      await setUp(aPrinterDetail(), { settle: true });
      const closed = new Subject<unknown>();
      dialog.open.mockReturnValue({
        componentInstance: { dialogRef: { afterClosed: () => closed } },
      } as never);

      component.loadFilament();
      closed.next({
        id: 'spool-1',
        displayName: 'Prusament Galaxy Black',
        colorName: '',
        materialType: 'PLA',
      });
      fixture.detectChanges();

      expect(text()).toContain('Galaxy Black');
    });
  });

  describe('printer catalog', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const byTestId = <T extends HTMLElement = HTMLElement>(id: string) =>
      el().querySelector<T>(`[data-testid="${id}"]`);
    const card = () => byTestId('fill-specs-card');
    const control = (name: string) => component.printerForm().get(name)!;
    const typeInto = (id: string, value: string) => {
      const input = el().querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const specValues = () => {
      const v = component.printerForm().getRawValue();
      return {
        make: v.make,
        model: v.model,
        nozzleDiameter: v.nozzleDiameter,
        filamentDiameter: v.filamentDiameter,
        bedWidthMm: v.bedWidthMm,
        bedDepthMm: v.bedDepthMm,
        bedHeightMm: v.bedHeightMm,
        hasHeatedBed: v.hasHeatedBed,
        hasHeatedChamber: v.hasHeatedChamber,
        slotCount: v.slotCount,
        type: v.type,
      };
    };
    const savedPayload = () =>
      vi.mocked(printerService.updatePrinter).mock.lastCall[0];

    afterEach(() => {
      localStorage.removeItem('pl_fill_specs_dismissed_42');
    });

    it('feeds the make-and-model search from catalog.search after a 150 ms debounce', async () => {
      // Set up on real timers: only the debounce, which typing starts, needs faking.
      await setUp(null);
      vi.useFakeTimers();

      typeInto('edit-printer-catalog-search', 'P1');
      await vi.advanceTimersByTimeAsync(149);
      expect(catalog.search).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);

      expect(catalog.search).toHaveBeenCalledTimes(1);

      expect(catalog.search).toHaveBeenCalledWith('P1');
    });

    it('has no bundled make list: make and model are plain free-text inputs', async () => {
      await setUp(null);

      typeInto('edit-printer-make', 'My Own');
      typeInto('edit-printer-model', 'Printer 9000');

      expect(control('make').value).toBe('My Own');
      expect(control('model').value).toBe('Printer 9000');
      expect(
        el()
          .querySelector('#edit-printer-make')!
          .hasAttribute('aria-autocomplete'),
        'make has no autocomplete'
      ).toBe(false);
    });

    describe('on a new printer', () => {
      it('a pick fills make, model, bed and diameters, and links the model', async () => {
        await setUp(null);

        component.selectCatalogModel(P1S);
        fixture.detectChanges();

        expect(specValues()).toEqual(
          expect.objectContaining({
            make: 'Bambu Lab',
            model: 'P1S',
            nozzleDiameter: 0.4,
            filamentDiameter: 1.75,
            bedWidthMm: 256,
            bedDepthMm: 256,
            bedHeightMm: 256,
            hasHeatedBed: true,
            type: 'FFF',
          })
        );
        expect(control('name').value).toBe('P1S');
        component.onSubmit();
        expect(
          vi.mocked(printerService.addPrinter).mock.lastCall[0].catalogModelId
        ).toBe('bambu-lab-p1s');
      });

      it('a pick keeps a field the user already typed', async () => {
        await setUp(null);
        typeInto('edit-printer-nozzle-diameter', '0.6');
        typeInto('edit-printer-name', 'Garage printer');

        component.selectCatalogModel(P1S);
        fixture.detectChanges();

        expect(control('nozzleDiameter').value).toBe(0.6);
        expect(control('name').value).toBe('Garage printer');
        expect(control('bedWidthMm').value).toBe(256);
      });

      it('a hand edit of make after a pick drops the id from the payload', async () => {
        await setUp(null);
        component.selectCatalogModel(P1S);
        fixture.detectChanges();

        typeInto('edit-printer-make', 'Bambu');
        component.onSubmit();

        const saved = vi.mocked(printerService.addPrinter).mock.lastCall[0];
        expect(saved.catalogModelId).toBeNull();
        expect(saved.bedWidthMm).toBe(256);
      });

      it('shows no fill card: the pick already filled the form', async () => {
        await setUp(null);
        component.selectCatalogModel(P1S);
        fixture.detectChanges();

        expect(card()).toBeNull();
      });
    });

    describe('on an existing printer', () => {
      const fullySpecified = (overrides: Partial<PrinterDetail> = {}) =>
        aPrinterDetail({
          nozzleDiameter: 0.6,
          filamentDiameter: 2.85,
          bedWidthMm: 350,
          bedDepthMm: 350,
          bedHeightMm: 340,
          hasHeatedBed: true,
          hasHeatedChamber: true,
          ...overrides,
        });

      // Review Focus 2: no stored spec changes until the user presses Fill.
      it('picking a different model sets make, model and the link, and changes no spec control', async () => {
        await setUp(fullySpecified({ catalogModelId: 'voron-2-4-350' }), {
          linked: null,
        });
        const { make, model, ...specsBefore } = specValues();
        const nameBefore = control('name').value;

        component.selectCatalogModel(P1S);
        fixture.detectChanges();

        const {
          make: makeAfter,
          model: modelAfter,
          ...specsAfter
        } = specValues();
        expect(makeAfter).toBe('Bambu Lab');
        expect(modelAfter).toBe('P1S');
        expect(specsAfter).toEqual(specsBefore);
        expect(control('name').value).toBe(nameBefore);
        expect(component.printerForm().dirty).toBe(true);
        component.onSubmit();
        expect(savedPayload()).toEqual(
          expect.objectContaining({
            catalogModelId: 'bambu-lab-p1s',
            make: 'Bambu Lab',
            model: 'P1S',
            bedWidthMm: 350,
          })
        );
      });

      it('a hand edit of make after picking a new model drops the new link', async () => {
        await setUp(fullySpecified({ catalogModelId: 'voron-2-4-350' }), {
          linked: null,
        });
        component.selectCatalogModel(P1S);
        fixture.detectChanges();

        typeInto('edit-printer-make', 'Bambu');
        component.onSubmit();

        expect(savedPayload().make).toBe('Bambu');
        expect(savedPayload().catalogModelId).toBeNull();
      });

      it('picking a model on a printer with empty specs fills nothing until Fill', async () => {
        await setUp(aPrinterDetail());

        component.selectCatalogModel(P1S);
        fixture.detectChanges();

        expect(control('bedWidthMm').value).toBe(0);
        expect(control('nozzleDiameter').value).toBe(0);
        expect(card()).not.toBeNull();
      });

      it('loads the linked model and shows the card when it knows empty fields', async () => {
        await setUp(aPrinterDetail({ catalogModelId: 'bambu-lab-p1s' }), {
          linked: P1S,
        });

        expect(catalog.get).toHaveBeenCalledWith('bambu-lab-p1s');
        expect(card()).not.toBeNull();
        expect(card()!.textContent).toContain(
          "We know this printer's specs: fill bed size, nozzle and filament diameter?"
        );
        expect(logging.logEvent).toHaveBeenCalledWith(
          'PrinterSpecs_FillShown',
          expect.objectContaining({ catalogModelId: 'bambu-lab-p1s' })
        );
      });

      it('shows the linked model in the search without searching or dirtying the form', async () => {
        await setUp(aPrinterDetail({ catalogModelId: 'bambu-lab-p1s' }), {
          linked: P1S,
        });
        // Past the search debounce, so a search the label set off would have run.
        await new Promise((r) => setTimeout(r, 200));
        fixture.detectChanges();

        const input = el().querySelector<HTMLInputElement>(
          '#edit-printer-catalog-search'
        )!;
        expect(input.value).toBe('Bambu Lab P1S');
        expect(catalog.search).not.toHaveBeenCalled();
        expect(component.printerForm().pristine).toBe(true);
      });

      it('leaves the search empty when the linked model is unknown', async () => {
        await setUp(aPrinterDetail({ catalogModelId: 'gone' }), {
          linked: null,
        });

        expect(
          el().querySelector<HTMLInputElement>('#edit-printer-catalog-search')!
            .value
        ).toBe('');
      });

      it('names only the fields Fill would set', async () => {
        await setUp(
          fullySpecified({
            catalogModelId: 'bambu-lab-p1s',
            nozzleDiameter: undefined,
          }),
          { linked: P1S }
        );

        expect(card()!.textContent).toContain(
          "We know this printer's specs: fill nozzle?"
        );
      });

      it('Fill sets only the empty controls, marks them dirty, and does not save', async () => {
        await setUp(
          aPrinterDetail({
            catalogModelId: 'bambu-lab-p1s',
            nozzleDiameter: 0.6,
          }),
          { linked: P1S }
        );

        byTestId<HTMLButtonElement>('fill-specs-fill')!.click();
        fixture.detectChanges();

        expect(control('nozzleDiameter').value).toBe(0.6);
        expect(control('nozzleDiameter').dirty).toBe(false);
        expect(control('bedWidthMm').value).toBe(256);
        expect(control('bedWidthMm').dirty).toBe(true);
        expect(control('filamentDiameter').value).toBe(1.75);
        // A heated bed the form shows as off may be unknown or a real "no": Fill leaves it.
        expect(control('hasHeatedBed').value).toBe(false);
        expect(component.printerForm().dirty).toBe(true);
        expect(printerService.updatePrinter).not.toHaveBeenCalled();
        expect(card()).toBeNull();
        expect(logging.logEvent).toHaveBeenCalledWith('PrinterSpecs_Filled', {
          fields: [
            'filamentDiameter',
            'bedWidthMm',
            'bedDepthMm',
            'bedHeightMm',
          ],
        });
      });

      it('Dismiss hides the card, and it stays hidden when the page is opened again', async () => {
        await setUp(aPrinterDetail({ catalogModelId: 'bambu-lab-p1s' }), {
          linked: P1S,
        });

        byTestId<HTMLButtonElement>('fill-specs-dismiss')!.click();
        fixture.detectChanges();

        expect(card()).toBeNull();
        expect(
          localStorage.getItem('pl_fill_specs_dismissed_42')
        ).not.toBeNull();
        expect(logging.logEvent).toHaveBeenCalledWith(
          'PrinterSpecs_FillDismissed',
          expect.anything()
        );

        fixture.destroy();
        fixture = TestBed.createComponent(PrinterDetailComponent);
        fixture.detectChanges();
        expect(card()).toBeNull();
      });

      it('shows no card for a printer with every field set', async () => {
        await setUp(fullySpecified({ catalogModelId: 'bambu-lab-p1s' }), {
          linked: P1S,
        });

        expect(card()).toBeNull();
        expect(logging.logEvent).not.toHaveBeenCalledWith(
          'PrinterSpecs_FillShown',
          expect.anything()
        );
      });

      it('shows no card for a printer with no catalogModelId', async () => {
        await setUp(aPrinterDetail(), { linked: P1S });

        expect(catalog.get).not.toHaveBeenCalled();
        expect(card()).toBeNull();
      });

      it('saves a printer whose linked model no longer resolves', async () => {
        await setUp(aPrinterDetail({ catalogModelId: 'gone-model' }), {
          linked: null,
        });

        expect(card()).toBeNull();
        component.onSubmit();
        expect(printerService.updatePrinter).toHaveBeenCalled();
      });

      it('does not resend an unchanged link, so the API keeps it', async () => {
        await setUp(aPrinterDetail({ catalogModelId: 'bambu-lab-p1s' }), {
          linked: P1S,
        });

        component.onSubmit();

        expect(savedPayload().catalogModelId).toBeNull();
      });

      it('gives the Spoolman panel the saved catalog model id', async () => {
        await setUp(aPrinterDetail({ catalogModelId: 'snapmaker-u1' }));

        const spoolman = fixture.debugElement.query(
          By.directive(PrinterSpoolmanComponent)
        ).componentInstance as PrinterSpoolmanComponent;
        expect(spoolman.catalogModelId()).toBe('snapmaker-u1');
      });
    });
  });
});
