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
import { Subject, of } from 'rxjs';

import { SharedModule } from 'src/app/shared/shared.module';
import {
  PrinterDetail,
  PrinterService,
} from 'src/app/core/services/printer.service';
import { PrinterCategory } from 'src/app/core/services/printer-categories.service';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { EntityImagesPanelComponent } from 'src/app/shared/entity-images-panel/entity-images-panel.component';
import { PrinterDetailComponent } from './printer-detail.component';
import { PrinterConnectionsComponent } from '../printer-connections/printer-connections.component';
import { PrinterSlotsComponent } from '../printer-slots/printer-slots.component';

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

describe('PrinterDetailComponent', () => {
  let component: PrinterDetailComponent;
  let fixture: ComponentFixture<PrinterDetailComponent>;
  let printerService: jasmine.SpyObj<PrinterService>;
  let router: jasmine.SpyObj<Router>;

  /**
   * `printer` is null for the create route, which the resolver models the same way.
   */
  const setUp = async (printer: PrinterDetail | null) => {
    printerService = jasmine.createSpyObj<PrinterService>('PrinterService', [
      'addPrinter',
      'updatePrinter',
      'imageTarget',
    ]);
    printerService.addPrinter.and.returnValue(of(aPrinterDetail()));
    printerService.updatePrinter.and.returnValue(of(aPrinterDetail()));
    printerService.imageTarget.and.callFake((id) => ({
      id,
      gateway: jasmine.createSpyObj('EntityImageGateway', [
        'upload',
        'delete',
        'reorder',
        'setDefault',
      ]),
    }));

    router = jasmine.createSpyObj<Router>('Router', [
      'navigate',
      'navigateByUrl',
    ]);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    router.navigate.and.returnValue(Promise.resolve(true));

    const toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
      'warning',
    ]);
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [PrinterDetailComponent],
      imports: [
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
        PrinterConnectionsComponent,
        PrinterSlotsComponent,
        // The template renders app-ad for real, which needs the Adsense config.
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PrinterService, useValue: printerService },
        { provide: Router, useValue: router },
        { provide: ToastrService, useValue: toastr },
        { provide: MatDialog, useValue: dialog },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
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
  };

  it('creates', async () => {
    await setUp(aPrinterDetail());
    expect(component).toBeTruthy();
  });

  it('builds the form from the resolved printer', async () => {
    await setUp(aPrinterDetail());

    expect(component.printerForm.get('id')!.value).toBe(42);
    expect(component.printerForm.get('name')!.value).toBe('Voron 2.4');
  });

  // #252: a saved printer lists the connections logging it.
  it('shows the connections panel for a saved printer', async () => {
    await setUp(aPrinterDetail());

    const panel = fixture.debugElement.query(
      By.directive(PrinterConnectionsComponent)
    );
    expect(panel).withContext('app-printer-connections').not.toBeNull();
    expect(
      (panel.componentInstance as PrinterConnectionsComponent).printerId()
    ).toBe(42);
  });

  it('shows no connections panel before the printer is saved', async () => {
    await setUp(null);

    expect(
      fixture.debugElement.query(By.directive(PrinterConnectionsComponent))
    ).toBeNull();
  });

  it('starts with a null id on the create route', async () => {
    await setUp(null);

    expect(component.printerForm.get('id')!.value).toBeNull();
  });

  it('enables only the fields the selected category declares', async () => {
    await setUp(aPrinterDetail());

    // FFF shows a nozzle diameter and no beam diameter, so the beam control is disabled
    // and its value is left out of the payload entirely.
    expect(component.printerForm.get('nozzleDiameter')!.enabled).toBeTrue();
    expect(component.printerForm.get('beamDiameter')!.disabled).toBeTrue();
  });

  it('blocks deactivation while the form is dirty', async () => {
    await setUp(aPrinterDetail());

    expect(component.canDeactivate()).toBeTrue();

    component.printerForm.markAsDirty();
    expect(component.canDeactivate()).toBeFalse();
  });

  it('asks before the page unloads only while the form is dirty', async () => {
    await setUp(aPrinterDetail());
    expect(dispatchBeforeUnload().defaultPrevented).toBeFalse();

    component.printerForm.markAsDirty();
    expect(dispatchBeforeUnload().defaultPrevented).toBeTrue();
  });

  it('updates rather than creating when the form already carries an id', async () => {
    await setUp(aPrinterDetail());

    component.onSubmit();

    expect(printerService.updatePrinter).toHaveBeenCalled();
    expect(printerService.addPrinter).not.toHaveBeenCalled();
  });

  it('creates when the form has no id', async () => {
    await setUp(null);
    component.printerForm.patchValue({ name: 'New', make: 'X', model: 'Y' });

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

      expect(component.printerForm.get('slotCount')!.value).toBe(1);
    });

    it("saves the printer's slot count", async () => {
      await setUp(aPrinterDetail({ slotCount: 4 }));
      component.printerForm.patchValue({ slotCount: 2 });

      component.onSubmit();

      expect(
        printerService.updatePrinter.calls.mostRecent().args[0].slotCount
      ).toBe(2);
    });

    it('rejects a slot count below 1 or above 64', async () => {
      await setUp(aPrinterDetail());
      const control = component.printerForm.get('slotCount')!;

      control.setValue(0);
      expect(control.valid).toBeFalse();
      control.setValue(65);
      expect(control.valid).toBeFalse();
      control.setValue(4);
      expect(control.valid).toBeTrue();
    });

    it('shows the slots for a saved multi-slot printer', async () => {
      await setUp(aPrinterDetail({ slotCount: 4 }));

      const panel = slotsPanel();
      expect(panel).withContext('app-printer-slots').not.toBeNull();
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

      expect(component.printerForm.dirty).toBeFalse();
      component.onSubmit();
      const saved = printerService.updatePrinter.calls.mostRecent().args[0];
      expect(saved.loadedFilaments.map((pf) => pf.id)).toEqual(['pf-1']);
    });
  });

  describe('photos panel', () => {
    let panel: jasmine.SpyObj<EntityImagesPanelComponent>;

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
      panel = jasmine.createSpyObj<EntityImagesPanelComponent>(
        'EntityImagesPanelComponent',
        ['uploadStagedImages', 'retryFailedUploads'],
        {
          hasStagedImages: jasmine.createSpy().and.returnValue(staged) as never,
        }
      );
      (component as unknown as { imagesPanel: () => unknown }).imagesPanel =
        () => panel;
    };

    const fillCreateForm = () => {
      component.printerForm.get('id')!.setValue(null);
      component.printerForm.patchValue({
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
          component as unknown as { printerImages: () => unknown[] }
        ).printerImages().length
      ).toBe(1);
    });

    it('retargets the panel at the id the form currently holds', async () => {
      await setUp(aPrinterDetail());

      expect(
        (
          component as unknown as { imageTarget: () => { id: number | null } }
        ).imageTarget().id
      ).toBe(42);
    });

    it('uploads staged images before navigating away on create', async () => {
      await setUp(null);
      stubPanel(true);
      printerService.addPrinter.and.returnValue(of(aPrinterDetail({ id: 42 })));
      panel.uploadStagedImages.and.returnValue(succeeded());
      fillCreateForm();

      component.onSubmit();
      await fixture.whenStable();

      expect(panel.uploadStagedImages).toHaveBeenCalledWith(42);
      expect(router.navigateByUrl).toHaveBeenCalled();
    });

    it('stays on the page and writes back the id when an upload fails', async () => {
      await setUp(null);
      stubPanel(true);
      printerService.addPrinter.and.returnValue(of(aPrinterDetail({ id: 42 })));
      panel.uploadStagedImages.and.returnValue(transientlyFailed());
      fillCreateForm();

      component.onSubmit();
      await fixture.whenStable();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(component.printerForm.get('id')!.value).toBe(42);
      expect(component.saving).toBeFalse();
    });

    it('updates rather than re-creating after a failed upload', async () => {
      await setUp(null);
      stubPanel(true);
      printerService.addPrinter.and.returnValue(of(aPrinterDetail({ id: 42 })));
      panel.uploadStagedImages.and.returnValue(transientlyFailed());
      fillCreateForm();

      component.onSubmit();
      await fixture.whenStable();

      printerService.addPrinter.calls.reset();
      component.onSubmit();
      await fixture.whenStable();

      expect(printerService.addPrinter).not.toHaveBeenCalled();
      expect(printerService.updatePrinter).toHaveBeenCalled();
    });

    it('does not navigate while the staged photos are still uploading', async () => {
      await setUp(null);
      stubPanel(true);
      printerService.addPrinter.and.returnValue(of(aPrinterDetail({ id: 42 })));
      // Never emits: the upload is in flight for the whole test.
      panel.uploadStagedImages.and.returnValue(new Subject());
      fillCreateForm();

      component.onSubmit();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('blocks deactivation while images are staged', async () => {
      await setUp(aPrinterDetail());
      stubPanel(true);
      component.printerForm.markAsPristine();

      expect(component.canDeactivate()).toBeFalse();
    });

    it('leaves the guard alone for its own post-save URL rewrite', async () => {
      await setUp(null);
      stubPanel(true);
      printerService.addPrinter.and.returnValue(of(aPrinterDetail({ id: 42 })));
      panel.uploadStagedImages.and.returnValue(transientlyFailed());
      fillCreateForm();

      let guardAnswer: boolean | null = null;
      router.navigate.and.callFake(() => {
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
      expect(guardAnswer).toBeTrue();
    });
  });
});
