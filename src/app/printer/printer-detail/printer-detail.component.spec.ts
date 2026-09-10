import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AdsenseModule } from 'ng2-adsense';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';

import { SharedModule } from 'src/app/shared/shared.module';
import {
  PrinterDetail,
  PrinterService,
} from 'src/app/core/services/printer.service';
import { PrinterCategory } from 'src/app/core/services/printer-categories.service';
import { PrinterDetailComponent } from './printer-detail.component';

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
    ]);
    printerService.addPrinter.and.returnValue(of(aPrinterDetail()));
    printerService.updatePrinter.and.returnValue(of(aPrinterDetail()));

    router = jasmine.createSpyObj<Router>('Router', [
      'navigate',
      'navigateByUrl',
    ]);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    router.navigate.and.returnValue(Promise.resolve(true));

    const toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [PrinterDetailComponent],
      imports: [
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
        // The template renders app-ad for real, which needs the Adsense config.
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
      ],
      providers: [
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
});
