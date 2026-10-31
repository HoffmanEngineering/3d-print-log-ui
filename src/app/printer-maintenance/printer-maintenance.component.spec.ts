import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AdsenseModule } from 'ng2-adsense';
import { ToastrService } from 'ngx-toastr';
import { of, Subject } from 'rxjs';

import {
  PrinterMaintenanceDto,
  PrinterMaintenanceService,
} from 'src/app/core/services/printer-maintenance.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { PagedList } from 'src/app/core/types/paging';
import { provideSectionProviders } from 'src/app/shared/section-providers';
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
  let maintenanceService: MockedObject<PrinterMaintenanceService>;

  /**
   * `later` makes the list and save calls answer only when the test says so, the
   * way HTTP does. Those tests settle startup first (the TestBed is zoneless, like
   * the app), so a view that is not repainted shows up as stale.
   */
  const setUp = async (
    entries: Partial<PrinterMaintenanceDto>[],
    printers: PrinterSummary[] = [aPrinter()],
    later?: Subject<unknown>
  ) => {
    maintenanceService = {
      getPrinterMaintenanceCategories: vi
        .fn()
        .mockName('PrinterMaintenanceService.getPrinterMaintenanceCategories'),
      getCurrentUserPrinterMaintenance: vi
        .fn()
        .mockName('PrinterMaintenanceService.getCurrentUserPrinterMaintenance'),
      deletePrinterMaintenanceEntry: vi
        .fn()
        .mockName('PrinterMaintenanceService.deletePrinterMaintenanceEntry'),
      getPrinterMaintenanceEntry: vi
        .fn()
        .mockName('PrinterMaintenanceService.getPrinterMaintenanceEntry'),
      updatePrinterMaintenanceEntry: vi
        .fn()
        .mockName('PrinterMaintenanceService.updatePrinterMaintenanceEntry'),
    } as unknown as MockedObject<PrinterMaintenanceService>;
    maintenanceService.getPrinterMaintenanceCategories.mockReturnValue(
      of({ categories: ['Nozzle', 'Belts'] } as never)
    );
    maintenanceService.getCurrentUserPrinterMaintenance.mockReturnValue(
      later ? (later as never) : of(page(entries))
    );
    maintenanceService.updatePrinterMaintenanceEntry.mockReturnValue(
      (later ?? of()) as never
    );

    const router = {
      navigate: vi.fn().mockName('Router.navigate'),
      navigateByUrl: vi.fn().mockName('Router.navigateByUrl'),
    };
    router.navigate.mockReturnValue(Promise.resolve(true));

    const toastr = {
      success: vi.fn().mockName('ToastrService.success'),
      error: vi.fn().mockName('ToastrService.error'),
    };
    const dialog = {
      open: vi.fn().mockName('MatDialog.open'),
    };

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        NoopAnimationsModule,
        PrinterAvatarComponent,
        // The template renders app-ad for real, which needs the Adsense config.
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
        PrinterMaintenanceComponent,
      ],
      providers: [
        // The section route's providers: the datepickers need its DateAdapter.
        ...provideSectionProviders(),
        // Stubbed: the real store would issue its own authenticated fetch.
        {
          provide: PrinterThumbnailStore,
          useValue: {
            thumbnailFor: vi
              .fn()
              .mockName('PrinterThumbnailStore.thumbnailFor'),
            invalidate: vi.fn().mockName('PrinterThumbnailStore.invalidate'),
            noteLoadFailure: vi
              .fn()
              .mockName('PrinterThumbnailStore.noteLoadFailure'),
          },
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
    if (later) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
  };

  it('creates', async () => {
    await setUp([anEntry()]);
    expect(component).toBeTruthy();
  });

  it('takes its first page and its printers from the resolver', async () => {
    await setUp([anEntry()]);

    expect(component.entries().length).toBe(1);
    expect(component.printers().length).toBe(1);
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

  describe('once a response arrives', () => {
    const text = () => (fixture.nativeElement as HTMLElement).textContent;
    let later: Subject<unknown>;

    beforeEach(async () => {
      later = new Subject();
      await setUp([anEntry()], [aPrinter()], later);
    });

    it('shows the next page', async () => {
      await component.updateFilter();
      fixture.detectChanges();

      later.next(
        page([anEntry({ id: 'second-page', description: 'Tighten belts' })])
      );
      fixture.detectChanges();

      expect(text()).toContain('Tighten belts');
      expect(text()).not.toContain('Replace nozzle');
    });

    it('leaves edit mode showing the saved entry', () => {
      const entry = component.entries()[0];
      component.editEntry(entry);
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('td input[matInput]'),
        'editing'
      ).toBeTruthy();

      component.saveEntry(entry);
      later.next({ ...entry, description: 'Replace nozzle, 0.6 mm' });
      fixture.detectChanges();

      expect(text()).toContain('Replace nozzle, 0.6 mm');
      expect(
        fixture.nativeElement.querySelector('td input[matInput]'),
        'editing'
      ).toBeNull();
    });

    it('saves what was typed, with its printer', () => {
      const other = aPrinter({ id: 9, name: 'Ender 3' });
      component.printers.set([aPrinter(), other]);
      const entry = component.entries()[0];
      component.editEntry(entry);
      component.editForm.patchValue({
        printerId: 9,
        category: 'Belts',
        description: 'Tension belts',
      });

      component.saveEntry(entry);

      const sent = vi.mocked(maintenanceService.updatePrinterMaintenanceEntry)
        .mock.lastCall[0] as PrinterMaintenanceDto;
      expect(sent.id).toBe(entry.id);
      expect(sent.category).toBe('Belts');
      expect(sent.description).toBe('Tension belts');
      expect(sent.printerId).toBe(9);
      expect(sent.printer).toBe(other);
    });

    it('leaves the row as it was on cancel', () => {
      const entry = component.entries()[0];
      component.editEntry(entry);
      component.editForm.patchValue({ description: 'Typed, then cancelled' });

      component.cancelEdit();
      fixture.detectChanges();

      expect(component.entries()[0]).toBe(entry);
      expect(entry.description).toBe('Replace nozzle');
      expect(text()).toContain('Replace nozzle');
    });
  });
});
