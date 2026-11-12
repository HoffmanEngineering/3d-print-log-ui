import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgModel } from '@angular/forms';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { of, Subject } from 'rxjs';

import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import {
  PrinterService,
  PrinterSummarySimple,
} from 'src/app/core/services/printer.service';
import { PagedList } from 'src/app/core/types/paging';
import { SignedImageComponent } from 'src/app/shared/signed-image/signed-image.component';
import { PrinterListComponent } from './printer-list.component';

/**
 * The component reads its first page from the route resolver, so every test supplies one.
 * `page()` builds the whole PagedList because the component reads `paging` for its
 * paginator state as well as `items`.
 */
const page = (
  items: Partial<PrinterSummarySimple>[]
): PagedList<PrinterSummarySimple> =>
  ({
    items: items as PrinterSummarySimple[],
    paging: {
      currentPage: 1,
      pageSize: 10,
      totalCount: items.length,
      totalPages: 1,
    },
  }) as PagedList<PrinterSummarySimple>;

const aPrinter = (
  overrides: Partial<PrinterSummarySimple> = {}
): Partial<PrinterSummarySimple> => ({
  id: 7,
  name: 'Voron 2.4',
  make: 'Formbot',
  model: 'Voron 2.4 350',
  isActive: true,
  loadedFilaments: [],
  category: { nickname: 'FFF', name: 'Fused Filament Fabrication' } as never,
  ...overrides,
});

describe('PrinterListComponent', () => {
  let component: PrinterListComponent;
  let fixture: ComponentFixture<PrinterListComponent>;
  let printerService: MockedObject<PrinterService>;

  /**
   * `later` makes the service answer only when the test says so, the way HTTP
   * does. Those tests settle startup first (the TestBed is zoneless, like the app),
   * so a view that is not repainted shows up as stale.
   */
  const setUp = async (
    items: Partial<PrinterSummarySimple>[],
    later?: Subject<PagedList<PrinterSummarySimple>>
  ) => {
    printerService = {
      getCurrentUserPrinterSummaries: vi
        .fn()
        .mockName('PrinterService.getCurrentUserPrinterSummaries'),
      unloadFilament: vi.fn().mockName('PrinterService.unloadFilament'),
      deletePrinter: vi.fn().mockName('PrinterService.deletePrinter'),
    } as unknown as MockedObject<PrinterService>;
    printerService.getCurrentUserPrinterSummaries.mockReturnValue(
      later ?? of(page(items))
    );

    const toastr = {
      success: vi.fn().mockName('ToastrService.success'),
      error: vi.fn().mockName('ToastrService.error'),
    };
    const dialog = {
      open: vi.fn().mockName('MatDialog.open'),
    };

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        EmptyStateComponent,
        SignedImageComponent,
        // The table rows and the empty-state buttons are routerLinks.
        RouterTestingModule,
        PrinterListComponent,
      ],
      providers: [
        { provide: PrinterService, useValue: printerService },
        { provide: ToastrService, useValue: toastr },
        { provide: MatDialog, useValue: dialog },
        {
          provide: ActivatedRoute,
          useValue: { data: of({ printerList: page(items) }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrinterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    if (later) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
  };

  it('creates', async () => {
    await setUp([aPrinter()]);
    expect(component).toBeTruthy();
  });

  it('takes its first page from the resolver rather than fetching', async () => {
    await setUp([aPrinter()]);

    expect(component.printers().length).toBe(1);
    expect(
      printerService.getCurrentUserPrinterSummaries
    ).not.toHaveBeenCalled();
  });

  it('reports an active search only when the box has non-whitespace text', async () => {
    await setUp([aPrinter()]);

    expect(component.hasActiveSearch).toBe(false);

    component.searchText = '   ';
    expect(component.hasActiveSearch).toBe(false);

    component.searchText = 'voron';
    expect(component.hasActiveSearch).toBe(true);
  });

  describe('default photo thumbnail', () => {
    it('renders a thumbnail when the printer has a default image', async () => {
      await setUp([
        aPrinter({
          defaultImageThumbnailUrl: 'https://blob.example/thumb.webp?sig=abc',
        }),
      ]);

      const image = fixture.debugElement.query(By.css('app-signed-image'));
      expect(image).toBeTruthy();
      expect(image.componentInstance.alt() as string).toContain('Voron 2.4');
    });

    it('renders no thumbnail element when there is no default image', async () => {
      await setUp([aPrinter({ defaultImageThumbnailUrl: null })]);

      expect(fixture.debugElement.query(By.css('app-signed-image'))).toBeNull();
    });
  });

  describe('paging from page 3', () => {
    const rows = () =>
      (fixture.nativeElement as HTMLElement).querySelectorAll('tr.mat-mdc-row')
        .length;
    const paginator = () =>
      fixture.debugElement.query(By.directive(MatPaginator))
        .componentInstance as MatPaginator;
    const lastCall = () =>
      vi.mocked(printerService.getCurrentUserPrinterSummaries).mock.lastCall!;

    let all: PrinterSummarySimple[];

    // Like the API: Skip((page-1)*size), no clamping, the requested page echoed back.
    const api = (pageNumber: number, size: number, search: string) => {
      const matched = all.filter((p) => !search || p.name.includes(search));
      return {
        items: matched.slice((pageNumber - 1) * size, pageNumber * size),
        paging: {
          currentPage: pageNumber,
          pageSize: size,
          totalCount: matched.length,
          totalPages: Math.ceil(matched.length / size),
        },
      } as PagedList<PrinterSummarySimple>;
    };

    const setUpOnPage3 = async (count: number) => {
      all = Array.from({ length: count }, (_, i) =>
        aPrinter({ id: i + 1, name: i < 2 ? `Prusa ${i}` : `Ender ${i}` })
      ) as PrinterSummarySimple[];
      await setUp([]);
      printerService.getCurrentUserPrinterSummaries.mockImplementation(((
        pageNumber: number,
        size: number,
        search: string
      ) => of(api(pageNumber, size, search))) as never);
      // Start from a first page of five, then page with the paginator.
      component['handlePagedList'](api(1, 5, ''));
      fixture.detectChanges();
      paginator().nextPage();
      paginator().nextPage();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(lastCall()[0]).toBe(3);
    };

    it('asks for page 1 when the search changes', async () => {
      await setUpOnPage3(12);
      vi.useFakeTimers();
      const input = (fixture.nativeElement as HTMLElement).querySelector(
        '#printer-list-search-input'
      ) as HTMLInputElement;
      input.value = 'Prusa';
      input.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(500);
      vi.useRealTimers();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(lastCall()[2]).toBe('Prusa');
      expect(lastCall()[0]).toBe(1);
      expect(rows()).toBe(2);
      expect(paginator().pageIndex).toBe(0);
    });

    it('asks for page 1 when Include Inactive is toggled', async () => {
      await setUpOnPage3(12);
      fixture.debugElement
        .query(By.directive(MatCheckbox))
        .injector.get(NgModel)
        .viewToModelUpdate(true);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(lastCall()[3]).toBe(true);
      expect(lastCall()[0]).toBe(1);
      expect(paginator().pageIndex).toBe(0);
    });

    it('steps back a page when a delete empties the last one', async () => {
      await setUpOnPage3(11);
      expect(rows()).toBe(1);
      vi.mocked(TestBed.inject(MatDialog).open).mockReturnValue({
        afterClosed: () => of(true),
      } as never);
      printerService.deletePrinter.mockImplementation(((id: number) => {
        all = all.filter((p) => p.id !== id);
        return of(undefined);
      }) as never);

      component.deletePrinter(all[10]);
      await fixture.whenStable();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(lastCall()[0]).toBe(2);
      expect(rows()).toBe(5);
      expect(paginator().pageIndex).toBe(1);
    });
  });

  describe('once a response arrives', () => {
    const text = () => (fixture.nativeElement as HTMLElement).textContent;
    let later: Subject<PagedList<PrinterSummarySimple>>;

    beforeEach(async () => {
      later = new Subject();
      await setUp([aPrinter()], later);
    });

    it('shows the next page', () => {
      component.pageChange({ pageIndex: 1, pageSize: 10 } as never);
      fixture.detectChanges();

      later.next(
        page([
          aPrinter({ id: 8, name: 'Prusa MK4', make: 'Prusa', model: 'MK4' }),
        ])
      );
      fixture.detectChanges();

      expect(text()).toContain('Prusa MK4');
      expect(text()).not.toContain('Voron 2.4');
    });

    it('says so when a search matches nothing', async () => {
      component.searchText = 'bambu';
      const searched = component.updateFilter();
      fixture.detectChanges();

      later.next(page([]));
      later.complete();
      await searched;
      fixture.detectChanges();

      expect(text()).toContain('No printers match your search');
    });
  });
});
