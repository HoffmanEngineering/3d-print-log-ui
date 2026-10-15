import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AdsenseModule } from 'ng2-adsense';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { LoggingService } from 'src/app/core/services/logging.service';
import { DialogData } from 'src/app/print/print-list/print-table-layout/print-table-layout.component';
import {
  FilamentService,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { PrinterThumbnailStore } from 'src/app/core/stores/printer-thumbnail-store.service';
import { PagedList } from 'src/app/core/types/paging';
import { FilamentListContainerComponent } from './filament-list-container.component';
import {
  DEFAULT_FILAMENT_TABLE_COLUMNS,
  FILAMENT_TABLE_COLUMNS_KEY,
} from './filament-table-columns';

const aSpool = (overrides: Partial<FilamentSummary> = {}) =>
  ({
    id: 'spool-1',
    displayName: 'Galaxy Black PLA',
    brand: 'Prusament',
    materialType: 'PLA',
    colorName: 'Galaxy Black',
    colorHex: '000000',
    colors: ['000000'],
    effects: [],
    isActive: true,
    isFavorite: false,
    filamentRemaining: 800_000,
    loadedInPrinter: null,
    storageLocation: '',
    ...overrides,
  }) as FilamentSummary;

const page = (items: FilamentSummary[]): PagedList<FilamentSummary> =>
  ({
    items,
    paging: {
      currentPage: 1,
      pageSize: 10,
      totalCount: items.length,
      totalPages: 1,
    },
  }) as PagedList<FilamentSummary>;

/**
 * Renders the real template on a real route. The service answers only when a test
 * says so, the way HTTP does, and the app's zone change detection runs, so a view
 * that is not repainted after a response shows up as stale.
 */
describe('FilamentListContainerComponent (rendered)', () => {
  let harness: RouterTestingHarness;
  let filamentService: jasmine.SpyObj<FilamentService>;
  let listed: Subject<PagedList<FilamentSummary>>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let loggingService: jasmine.SpyObj<LoggingService>;
  let savedLayout: string | null;

  const text = () => (harness.routeNativeElement as HTMLElement).textContent;

  /** The column keys of the header row, in the order the table renders them. */
  const headerColumns = () =>
    Array.from(
      (harness.routeNativeElement as HTMLElement).querySelectorAll(
        'tr.mat-mdc-header-row th'
      )
    ).map((cell) =>
      Array.from(cell.classList)
        .find((name) => name.startsWith('mat-column-'))!
        .slice('mat-column-'.length)
    );

  const open = async () => {
    harness = await RouterTestingHarness.create('/materials');
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeDebugElement!
      .componentInstance as FilamentListContainerComponent;
  };

  beforeEach(() => {
    savedLayout = localStorage.getItem(FILAMENT_TABLE_COLUMNS_KEY);
    localStorage.removeItem(FILAMENT_TABLE_COLUMNS_KEY);

    listed = new Subject();
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    loggingService = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    filamentService = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'getCurrentUserFilamentSummaries',
      'changeFavorite',
    ]);
    filamentService.getCurrentUserFilamentSummaries.and.returnValue(listed);

    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        // The template renders app-ad for real, which needs the Adsense config.
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
      ],
      providers: [
        provideZoneChangeDetection(),
        provideRouter([
          {
            path: 'materials',
            component: FilamentListContainerComponent,
            data: {
              filamentList: page([aSpool()]),
              materialCategories: [],
              storageLocations: [],
            },
          },
        ]),
        { provide: FilamentService, useValue: filamentService },
        { provide: MatDialog, useValue: dialog },
        { provide: LoggingService, useValue: loggingService },
        {
          provide: ToastrService,
          useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']),
        },
        // Stubbed: the real store would issue its own authenticated fetch.
        {
          provide: PrinterThumbnailStore,
          useValue: jasmine.createSpyObj('PrinterThumbnailStore', [
            'thumbnailFor',
            'invalidate',
            'noteLoadFailure',
          ]),
        },
      ],
    });
  });

  afterEach(() => {
    if (savedLayout === null) {
      localStorage.removeItem(FILAMENT_TABLE_COLUMNS_KEY);
    } else {
      localStorage.setItem(FILAMENT_TABLE_COLUMNS_KEY, savedLayout);
    }
  });

  it('shows the next page', async () => {
    const component = await open();

    await component.pageChange({ pageIndex: 1, pageSize: 10 } as never);
    harness.detectChanges();
    await harness.fixture.whenStable();

    listed.next(
      page([
        aSpool({
          id: 'spool-2',
          displayName: 'Jet Black PETG',
          colorName: 'Jet Black',
          materialType: 'PETG',
        }),
      ])
    );
    harness.detectChanges();

    expect(text()).toContain('Jet Black PETG');
    expect(text()).not.toContain('Galaxy Black');
  });

  it('stars a favorite once the server confirms it', async () => {
    const favorited = new Subject<unknown>();
    filamentService.changeFavorite.and.returnValue(favorited as never);
    const component = await open();
    const stars = () =>
      Array.from(
        (harness.routeNativeElement as HTMLElement).querySelectorAll('mat-icon')
      ).filter((icon) => icon.textContent!.trim() === 'star').length;
    const before = stars();

    component.toggleFavorite(component.filaments()[0]);
    favorited.next(undefined);
    harness.detectChanges();

    expect(stars()).toBeGreaterThan(before);
  });

  describe('column layout', () => {
    it('renders the same columns as before when nothing is saved', async () => {
      await open();

      expect(headerColumns()).toEqual([
        'select',
        ...DEFAULT_FILAMENT_TABLE_COLUMNS,
        'more',
      ]);
    });

    it('renders a saved layout in its saved order', async () => {
      localStorage.setItem(
        FILAMENT_TABLE_COLUMNS_KEY,
        JSON.stringify(['filamentRemaining', 'displayName', 'brand'])
      );

      await open();

      expect(headerColumns()).toEqual([
        'select',
        'filamentRemaining',
        'displayName',
        'brand',
        'more',
      ]);
      expect(text()).toContain('Galaxy Black PLA');
    });

    it('falls back to the defaults when the saved layout is unreadable', async () => {
      localStorage.setItem(FILAMENT_TABLE_COLUMNS_KEY, '{not json');

      await open();

      expect(headerColumns()).toEqual([
        'select',
        ...DEFAULT_FILAMENT_TABLE_COLUMNS,
        'more',
      ]);
    });

    it('offers the layout dialog from the table header', async () => {
      await open();

      const button = (harness.routeNativeElement as HTMLElement).querySelector(
        'tr.mat-mdc-header-row [data-cy-table-settings]'
      );
      expect(button?.getAttribute('aria-label')).toBe('Open table settings');
    });

    it('applies and saves the layout chosen in the dialog', async () => {
      const closed = new Subject<unknown>();
      dialog.open.and.returnValue({ afterClosed: () => closed } as never);
      const component = await open();

      component.openTableLayout();
      const data = dialog.open.calls.mostRecent().args[1]!.data as DialogData;
      expect(data.currentColumns).toEqual([...DEFAULT_FILAMENT_TABLE_COLUMNS]);
      expect(data.defaultColumns).toEqual([...DEFAULT_FILAMENT_TABLE_COLUMNS]);
      expect(data.allPossibleColumns.map((column) => column.key)).toEqual([
        ...DEFAULT_FILAMENT_TABLE_COLUMNS,
      ]);

      data.changeEvent.next(['brand', 'colorName']);
      harness.detectChanges();

      expect(headerColumns()).toEqual(['select', 'brand', 'colorName', 'more']);
      expect(
        JSON.parse(localStorage.getItem(FILAMENT_TABLE_COLUMNS_KEY)!)
      ).toEqual(['brand', 'colorName']);

      closed.next(undefined);
      expect(loggingService.logEvent).toHaveBeenCalledWith(
        'FilamentList_LayoutChanged',
        { columns: JSON.stringify(['brand', 'colorName']) }
      );
    });

    it('restores the defaults when the dialog resets them', async () => {
      localStorage.setItem(
        FILAMENT_TABLE_COLUMNS_KEY,
        JSON.stringify(['brand'])
      );
      const closed = new Subject<unknown>();
      dialog.open.and.returnValue({ afterClosed: () => closed } as never);
      const component = await open();

      component.openTableLayout();
      const data = dialog.open.calls.mostRecent().args[1]!.data as DialogData;
      data.changeEvent.next(data.defaultColumns);
      harness.detectChanges();

      expect(headerColumns()).toEqual([
        'select',
        ...DEFAULT_FILAMENT_TABLE_COLUMNS,
        'more',
      ]);
    });
  });
});
