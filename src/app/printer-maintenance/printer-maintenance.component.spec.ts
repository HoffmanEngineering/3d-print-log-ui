import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AdsenseModule } from 'ng2-adsense';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';

import { SharedModule } from 'src/app/shared/shared.module';
import {
  PrinterMaintenanceDto,
  PrinterMaintenanceService,
} from 'src/app/core/services/printer-maintenance.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { PagedList } from 'src/app/core/types/paging';
import { PrinterMaintenanceComponent } from './printer-maintenance.component';
import { PrinterThumbnailStore } from 'src/app/core/stores/printer-thumbnail-store.service';
import { PrinterAvatarComponent } from 'src/app/shared/printer-avatar/printer-avatar.component';

const page = (
  items: Partial<PrinterMaintenanceDto>[]
): PagedList<PrinterMaintenanceDto> =>
  ({
    items: items as PrinterMaintenanceDto[],
    paging: {
      currentPage: 1,
      pageSize: 10,
      totalCount: items.length,
      totalPages: 1,
    },
  }) as PagedList<PrinterMaintenanceDto>;

const aPrinter = (overrides: Partial<PrinterSummary> = {}) =>
  ({
    id: 7,
    name: 'Voron 2.4',
    make: 'Formbot',
    model: 'Voron 2.4 350',
    isActive: true,
    ...overrides,
  }) as PrinterSummary;

const anEntry = (overrides: Partial<PrinterMaintenanceDto> = {}) =>
  ({
    id: 'b8f0e1a2-0000-4000-8000-000000000001',
    printerId: 7,
    printer: aPrinter(),
    category: 'Nozzle',
    description: 'Replace nozzle',
    date: '2026-01-01T00:00:00Z',
    done: false,
    ...overrides,
  }) as unknown as PrinterMaintenanceDto;

describe('PrinterMaintenanceComponent', () => {
  let component: PrinterMaintenanceComponent;
  let fixture: ComponentFixture<PrinterMaintenanceComponent>;
  let maintenanceService: jasmine.SpyObj<PrinterMaintenanceService>;

  const setUp = async (
    entries: Partial<PrinterMaintenanceDto>[],
    printers: PrinterSummary[] = [aPrinter()]
  ) => {
    maintenanceService = jasmine.createSpyObj<PrinterMaintenanceService>(
      'PrinterMaintenanceService',
      [
        'getPrinterMaintenanceCategories',
        'getCurrentUserPrinterMaintenance',
        'deletePrinterMaintenanceEntry',
        'getPrinterMaintenanceEntry',
      ]
    );
    maintenanceService.getPrinterMaintenanceCategories.and.returnValue(
      of({ categories: ['Nozzle', 'Belts'] } as never)
    );
    maintenanceService.getCurrentUserPrinterMaintenance.and.returnValue(
      of(page(entries))
    );

    const router = jasmine.createSpyObj<Router>('Router', [
      'navigate',
      'navigateByUrl',
    ]);
    router.navigate.and.returnValue(Promise.resolve(true));

    const toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [PrinterMaintenanceComponent],
      imports: [
        SharedModule,
        FormsModule,
        NoopAnimationsModule,
        PrinterAvatarComponent,
        // The template renders app-ad for real, which needs the Adsense config.
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
      ],
      providers: [
        // Stubbed: the real store would issue its own authenticated fetch.
        {
          provide: PrinterThumbnailStore,
          useValue: jasmine.createSpyObj<PrinterThumbnailStore>(
            'PrinterThumbnailStore',
            ['thumbnailFor', 'invalidate', 'noteLoadFailure']
          ),
        },
        {
          provide: PrinterMaintenanceService,
          useValue: maintenanceService,
        },
        { provide: Router, useValue: router },
        { provide: ToastrService, useValue: toastr },
        { provide: MatDialog, useValue: dialog },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
            data: of({
              entries: page(entries),
              printers,
              preferredCurrencySymbolSetting: { value: '$' },
            }),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrinterMaintenanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('creates', async () => {
    await setUp([anEntry()]);
    expect(component).toBeTruthy();
  });

  it('takes its first page and its printers from the resolver', async () => {
    await setUp([anEntry()]);

    expect(component.entries.length).toBe(1);
    expect(component.printers.length).toBe(1);
    expect(
      maintenanceService.getCurrentUserPrinterMaintenance
    ).not.toHaveBeenCalled();
  });

  it('loads the category list for the filter', async () => {
    await setUp([anEntry()]);

    expect(component.categories).toEqual(['Nozzle', 'Belts']);
  });

  it('shows a printer avatar beside the printer name on each row', async () => {
    await setUp([anEntry()]);

    expect(
      fixture.nativeElement.querySelector('td app-printer-avatar')
    ).toBeTruthy();
  });
});
