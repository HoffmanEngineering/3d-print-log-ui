import { MediaMatcher } from '@angular/cdk/layout';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { By, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, throwError } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
  PrintSummarySortColumn,
} from 'src/app/core/services/print.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';
import { PagedList } from 'src/app/core/types/paging';
import { DurationPipe } from 'src/app/shared/pipes/duration.pipe';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { PrinterRedirectPromptService } from '../services/printer-redirect-prompt.service';

import {
  DEFERRED_SKELETON_DELAY_MS,
  DEFERRED_SKELETON_MIN_VISIBLE_MS,
} from 'src/app/shared/skeleton/deferred-skeleton';
import { PrintListComponent } from './print-list.component';
import { PrintEmptyStateComponent } from './print-empty-state/print-empty-state.component';

describe('PrintListComponent', () => {
  let component: PrintListComponent;
  let fixture: ComponentFixture<PrintListComponent>;
  let mockPrintService: jasmine.SpyObj<PrintService>;

  /**
   * The list renders either the table or the card view, never both, so the
   * width has to be stated rather than inherited from whatever size the Karma
   * iframe happens to be. Only the handset query is faked; the other media
   * queries the component asks about still go to the real browser.
   */
  const HANDSET_QUERY = '(max-width: 959.98px)';
  let isHandsetViewport: boolean;
  let handsetListeners: Array<(event: MediaQueryListEvent) => void>;

  /** Simulates a resize across the breakpoint after the component is built. */
  const setHandsetViewport = (matches: boolean) => {
    isHandsetViewport = matches;
    handsetListeners.forEach((listener) =>
      listener({ matches } as MediaQueryListEvent)
    );
  };

  beforeEach(waitForAsync(() => {
    isHandsetViewport = false;
    handsetListeners = [];

    const mockMediaMatcher: MediaMatcher = {
      matchMedia: (query: string) => {
        if (query !== HANDSET_QUERY) {
          return window.matchMedia(query);
        }

        return {
          media: query,
          get matches() {
            return isHandsetViewport;
          },
          addEventListener: (
            _: string,
            listener: (event: MediaQueryListEvent) => void
          ) => handsetListeners.push(listener),
          removeEventListener: (
            _: string,
            listener: (event: MediaQueryListEvent) => void
          ) => {
            handsetListeners = handsetListeners.filter((l) => l !== listener);
          },
        } as unknown as MediaQueryList;
      },
    } as MediaMatcher;

    const mockLogger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logException',
      'logEvent',
    ]);

    const mockPrinterRedirectPromptService =
      jasmine.createSpyObj<PrinterRedirectPromptService>(
        'PrinterRedirectPromptService',
        {
          shouldShowAddPrinterPrompt: of(false),
        }
      );

    const mockPrintPagedResult: PagedList<PrintSummary> = {
      items: [],
      paging: {
        currentPage: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 1,
      },
    };

    const mockActivatedRoute = {
      data: of({
        printList: mockPrintPagedResult,
        printers: [],
        filaments: [],
      }),
      queryParamMap: of({ has: () => false }),
      snapshot: {},
    };

    const mockTitleService = jasmine.createSpyObj<Title>('Title', ['setTitle']);

    const mockToastrService = jasmine.createSpyObj<ToastrService>(
      'ToastrService',
      ['success', 'error', 'info', 'remove']
    );

    mockPrintService = jasmine.createSpyObj<PrintService>('PrintService', [
      'deletePrint',
      'getPrintSummaries',
    ]);
    mockPrintService.getPrintSummaries.and.returnValue(
      of(mockPrintPagedResult)
    );

    const mockUserSettingService = jasmine.createSpyObj<UserSettingService>(
      'UserSettingService',
      ['getCurrentUsersSettingByType']
    );
    mockUserSettingService.getCurrentUsersSettingByType.and.returnValue(
      Promise.resolve(null)
    );

    TestBed.configureTestingModule({
      declarations: [PrintListComponent],
      imports: [
        DurationPipe,
        LocaleDatePipe,
        RouterTestingModule,
        MatCheckboxModule,
        MatDialogModule,
        MatMenuModule,
        MatSortModule,
        MatTableModule,
        PrintEmptyStateComponent,
      ],
      providers: [
        { provide: LoggingService, useValue: mockLogger },
        { provide: MediaMatcher, useValue: mockMediaMatcher },
        {
          provide: PrinterRedirectPromptService,
          useValue: mockPrinterRedirectPromptService,
        },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Title, useValue: mockTitleService },
        { provide: ToastrService, useValue: mockToastrService },
        { provide: PrintService, useValue: mockPrintService },
        { provide: UserSettingService, useValue: mockUserSettingService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    // The saved table layout outlives a spec otherwise, so a test that picks
    // its own columns would decide what every later test renders.
    localStorage.removeItem('print_table_displayed_columns');

    fixture = TestBed.createComponent(PrintListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  /**
   * The table and the card list are two renderings of the same rows, and only
   * the one that fits gets built. Hiding the other with CSS after the fact used
   * to flash it on screen whenever this subtree was rebuilt - switching back
   * from Grouped by Project - and paid to lay out a tree nobody sees.
   */
  describe('table and card view', () => {
    const table = () => fixture.debugElement.query(By.css('table'));
    const cardView = () =>
      fixture.debugElement.query(By.css('.mobile-card-view'));

    it('renders only the table above the handset breakpoint', () => {
      fixture.detectChanges();

      expect(table()).toBeTruthy();
      expect(cardView()).toBeFalsy();
    });

    it('renders only the card view below the handset breakpoint', () => {
      isHandsetViewport = true;
      fixture = TestBed.createComponent(PrintListComponent);
      component = fixture.componentInstance;

      fixture.detectChanges();

      expect(cardView()).toBeTruthy();
      expect(table()).toBeFalsy();
    });

    it('swaps the two when the viewport crosses the breakpoint', () => {
      fixture.detectChanges();

      setHandsetViewport(true);
      fixture.detectChanges();

      expect(cardView()).toBeTruthy();
      expect(table()).toBeFalsy();

      setHandsetViewport(false);
      fixture.detectChanges();

      expect(table()).toBeTruthy();
      expect(cardView()).toBeFalsy();
    });

    it('stops listening for width changes once destroyed', () => {
      fixture.detectChanges();

      fixture.destroy();

      expect(handsetListeners.length).toBe(0);
    });
  });

  /**
   * Start Date, Start Time and Start Date/Time all sort by the same column, and
   * MatSort throws when two headers register the same id. That throw lands while
   * the header row is initializing and takes the pass that fills the data cells
   * with it, so the table renders a page of blank rows.
   */
  it('renders row data when two displayed columns sort by the same column', () => {
    const print = {
      id: 7,
      title: 'Benchy',
      status: PrintStatus.Success,
      startDate: new Date('2021-05-27'),
      printer: { id: 1, name: 'Printer Name', make: 'Test', model: 'Test' },
      filamentUsage: [],
      commentCount: 0,
      sumActualFilamentWeightMg: 0,
      sumEstimatedFilamentWeightMg: 0,
      totalFilamentWeightMg: 0,
    } as unknown as PrintSummary;

    TestBed.inject(ActivatedRoute).data = of({
      printList: {
        items: [print],
        paging: { currentPage: 1, pageSize: 10, totalCount: 1, totalPages: 1 },
      } as PagedList<PrintSummary>,
      printers: [],
      filaments: [],
    });
    // Through storage, because ngOnInit reads the saved layout back over
    // anything set on the instance.
    localStorage.setItem(
      'print_table_displayed_columns',
      JSON.stringify(['title', 'start-date', 'start-date-time', 'more'])
    );

    fixture.detectChanges();

    const row = fixture.debugElement.query(By.css('tr[mat-row]'))
      .nativeElement as HTMLElement;
    expect(row.textContent).toContain('Benchy');
  });

  it('sorts by start date whichever of its three columns is clicked', () => {
    fixture.detectChanges();

    Object.values(component.startDateSortHeaderIds).forEach((headerId) => {
      component.sortColumn = PrintSummarySortColumn.Title;

      component.sortData({ active: headerId, direction: 'asc' });

      expect(component.sortColumn as PrintSummarySortColumn)
        .withContext(headerId)
        .toBe(PrintSummarySortColumn.StartDate);
    });
  });

  it('should show the first-run empty state when there are no prints and no filters', () => {
    // Act
    fixture.detectChanges();

    // Assert
    const emptyState = fixture.debugElement.query(
      By.directive(PrintEmptyStateComponent)
    );
    expect(emptyState).toBeTruthy();

    const heading = emptyState.query(By.css('.empty-state__heading'))
      .nativeElement as HTMLElement;
    expect(heading.textContent.trim()).toEqual('Log your first print');

    expect(
      emptyState.query(By.css('[data-cy="empty-state-add-print"]'))
    ).toBeTruthy();
    expect(
      emptyState.query(By.css('[data-cy="empty-state-import-gcode"]'))
    ).toBeTruthy();
    expect(
      emptyState.query(By.css('[data-cy="empty-state-clear-filters"]'))
    ).toBeFalsy();
  });

  it('should show the filtered empty state and mention the active filter count', () => {
    // Arrange - ngOnInit resets the status filter, so apply filters after it runs
    fixture.detectChanges();
    component.filterByStatus.set(PrintStatus.Success);
    component.filterByPrinterIds.set([7]);
    component.searchText = 'benchy';

    // Act
    fixture.detectChanges();

    // Assert
    const emptyState = fixture.debugElement.query(
      By.directive(PrintEmptyStateComponent)
    );
    const heading = emptyState.query(By.css('.empty-state__heading'))
      .nativeElement as HTMLElement;
    const message = emptyState.query(By.css('.empty-state__message'))
      .nativeElement as HTMLElement;

    expect(heading.textContent.trim()).toEqual('No prints match your filters');
    expect(message.textContent).toContain('2 active filters');
    expect(message.textContent).toContain('a search for "benchy"');
    expect(
      emptyState.query(By.css('[data-cy="empty-state-add-print"]'))
    ).toBeFalsy();
  });

  it('should clear every filter when the empty state clear filters button is used', () => {
    // Arrange - ngOnInit resets the status filter, so apply filters after it runs
    fixture.detectChanges();
    component.filterByStatus.set(PrintStatus.Success);
    component.searchText = 'benchy';
    fixture.detectChanges();

    const clearButton = fixture.debugElement.query(
      By.css('[data-cy="empty-state-clear-filters"]')
    ).nativeElement as HTMLButtonElement;

    // Act
    clearButton.click();
    fixture.detectChanges();

    // Assert
    expect(component.searchText).toEqual('');
    expect(component.activeFilterCount()).toEqual(0);
  });

  it('should open the hidden g-code picker from the empty state import button', () => {
    // Arrange
    fixture.detectChanges();

    const fileInput = fixture.debugElement.query(By.css('input[type="file"]'))
      .nativeElement as HTMLInputElement;
    const clickSpy = spyOn(fileInput, 'click');

    // Act
    const importButton = fixture.debugElement.query(
      By.css('[data-cy="empty-state-import-gcode"]')
    ).nativeElement as HTMLButtonElement;
    importButton.click();

    // Assert
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should display a page worth of prints when passed in from the route resolver', () => {
    // Arrange
    const mockActivatedRoute = TestBed.inject(ActivatedRoute);
    const mockPrintPagedResult: PagedList<PrintSummary> = {
      items: [
        {
          id: 1,
          commentCount: 0,
          createdByUserId: 1,
          defaultPrintImageId: null,
          estimatedPrintTimeInSeconds: 1234,
          printTimeInSeconds: 1234,
          printer: {
            id: 1,
            isActive: true,
            make: 'Test',
            model: 'Test',
            name: 'Printer Name',
            category: {
              description: '',
              materialCategory: {
                description: 'true',
                hasDiameter: true,
                name: 'test',
                nickname: 'test',
                showBedTemperature: true,
                showInertGas: false,
                showMaterialRefreshRatio: false,
                showMeltingTemperature: false,
                showNozzleTemperature: false,
                showRecommendedInitialLayerTimeInSeconds: false,
                showRecommendedLayerTimeInSeconds: false,
              },
              name: 'test',
              nickname: 'test',
              showBeamDiameter: false,
              showBedSize: false,
              showFilamentDiameter: true,
              showHasHeatedBed: true,
              showHasHeatedChamber: true,
              showNozzleDiameter: true,
              showScreenResolution: false,
            },
          },
          status: PrintStatus.Success,
          title: 'Test Print',
          startDate: new Date('2021-05-27'),
          filamentUsage: [],
          sumActualFilamentWeightMg: 0,
          sumEstimatedFilamentWeightMg: 0,
          totalFilamentWeightMg: 0,
        },
      ],
      paging: {
        currentPage: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
    };

    (mockActivatedRoute.data = of({
      printList: mockPrintPagedResult,
      printers: [],
      filaments: [],
    })),
      // Act
      fixture.detectChanges();

    // Assert
    const table = fixture.debugElement.queryAll(By.css('table > tbody tr'));
    expect(table.length).toEqual(mockPrintPagedResult.items.length);
  });

  /** Puts the component in the "user owns no printers" state. */
  const withNoPrinters = () => {
    const mockPrinterRedirectPromptService = TestBed.inject(
      PrinterRedirectPromptService
    ) as jasmine.SpyObj<PrinterRedirectPromptService>;
    mockPrinterRedirectPromptService.shouldShowAddPrinterPrompt.and.returnValue(
      of(true)
    );

    const mockToastrService = TestBed.inject(
      ToastrService
    ) as jasmine.SpyObj<ToastrService>;
    mockToastrService.info.and.returnValue({
      onTap: of(),
      message: '',
      onAction: of(),
      title: '',
      toastId: 1,
      toastRef: {} as any,
      onHidden: of(),
      onShown: of(),
      portal: {} as any,
    });

    return mockToastrService;
  };

  /** Overrides the resolver payload so the list reports existing prints. */
  const withExistingPrints = (totalCount: number) => {
    const mockActivatedRoute = TestBed.inject(ActivatedRoute);
    mockActivatedRoute.data = of({
      printList: {
        items: [],
        paging: { currentPage: 1, pageSize: 10, totalCount, totalPages: 1 },
      },
      printers: [],
      filaments: [],
    });
  };

  it('should display a "No Active Printers" toast when the user has prints but no printer', () => {
    // Arrange - no empty state renders here, so the toast is the only guidance
    const mockToastrService = withNoPrinters();
    withExistingPrints(3);

    // Act
    fixture.detectChanges();

    // Assert
    expect(mockToastrService.info).toHaveBeenCalledWith(
      'Click here to add a new 3D Printer before logging prints.',
      'No Active Printers',
      jasmine.any(Object)
    );
    expect(component.printerRedirectToast).not.toBeNull();
  });

  it('should suppress the toast when the empty state already says to add a printer', () => {
    // Arrange - zero prints and zero printers
    const mockToastrService = withNoPrinters();

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.printerRedirectToast).toBeNull();
    expect(mockToastrService.remove).not.toHaveBeenCalledWith(
      jasmine.anything()
    );

    const emptyState = fixture.debugElement.query(
      By.directive(PrintEmptyStateComponent)
    );
    const heading = emptyState.query(By.css('.empty-state__heading'))
      .nativeElement as HTMLElement;
    expect(heading.textContent.trim()).toEqual('Add a printer to get started');
  });

  it('should keep the toast when a filter empties the list for a user with no printer', async () => {
    // Arrange - the empty state shows filter guidance, not printer guidance
    withNoPrinters();
    fixture.detectChanges();
    expect(component.printerRedirectToast).toBeNull();

    // Act - assert on component state only; re-running change detection here
    // would trip NG0100 because searchText is bound with two-way ngModel.
    component.searchText = 'benchy';
    await component.updateFilter();

    // Assert
    expect(component.printerRedirectToast).not.toBeNull();
  });

  it('should fall back to the add print state when the printer lookup fails', () => {
    // Arrange
    const mockPrinterRedirectPromptService = TestBed.inject(
      PrinterRedirectPromptService
    ) as jasmine.SpyObj<PrinterRedirectPromptService>;
    mockPrinterRedirectPromptService.shouldShowAddPrinterPrompt.and.returnValue(
      throwError(() => new Error('printer lookup failed'))
    );

    // Act
    fixture.detectChanges();

    // Assert - a failed lookup must not leave the page blank
    expect(component.hasPrinters()).toBeTrue();
    expect(
      fixture.debugElement.query(By.css('[data-cy="empty-state-add-print"]'))
    ).toBeTruthy();
  });

  it('should suppress the toast when the search text is only whitespace', async () => {
    // Arrange - the empty state still shows printer guidance for blank search
    withNoPrinters();
    fixture.detectChanges();

    // Act
    component.searchText = '   ';
    await component.updateFilter();

    // Assert
    expect(component.printerRedirectToast).toBeNull();
  });

  it('should show the add printer empty state instead of the add print CTA', () => {
    // Arrange
    withNoPrinters();

    // Act
    fixture.detectChanges();

    // Assert
    expect(
      fixture.debugElement.query(By.css('[data-cy="empty-state-add-printer"]'))
    ).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('[data-cy="empty-state-add-print"]'))
    ).toBeFalsy();
    expect(
      fixture.debugElement.query(By.css('[data-cy="empty-state-import-gcode"]'))
    ).toBeFalsy();
  });

  it('should keep the filter panel open when resetFilters is called', () => {
    // Arrange
    fixture.detectChanges();
    component.isFilterPanelOpen = true;

    // Act
    component.resetFilters();

    // Assert
    expect(component.isFilterPanelOpen).toBeTrue();
  });

  it('should redirect to printers/new when the Printer Redirect toast is tapped.', () => {
    // Arrange
    const router = TestBed.inject(Router);
    const routerSpy = spyOn(router, 'navigate');

    const mockPrinterRedirectPromptService = TestBed.inject(
      PrinterRedirectPromptService
    ) as jasmine.SpyObj<PrinterRedirectPromptService>;
    mockPrinterRedirectPromptService.shouldShowAddPrinterPrompt.and.returnValue(
      of(true)
    );

    const mockToastrService = TestBed.inject(
      ToastrService
    ) as jasmine.SpyObj<ToastrService>;
    mockToastrService.info.and.returnValue({
      onTap: of(true),
    } as any);

    // The toast only renders when no empty state gives the same guidance.
    withExistingPrints(3);

    // Act
    fixture.detectChanges();

    // Assert
    expect(routerSpy).toHaveBeenCalledWith(['printers', 'new']);
  });

  describe('bulk selection', () => {
    const selectablePrint = {
      id: 7,
      title: 'Benchy',
      status: PrintStatus.Success,
      startDate: new Date('2021-05-27'),
      printer: { id: 1, name: 'Printer Name', make: 'Test', model: 'Test' },
      filamentUsage: [],
      commentCount: 0,
      sumActualFilamentWeightMg: 0,
      sumEstimatedFilamentWeightMg: 0,
      totalFilamentWeightMg: 0,
    } as unknown as PrintSummary;

    it('should always render the select column first, ahead of the configured columns', () => {
      fixture.detectChanges();
      component.displayedColumns = ['title', 'status', 'more'];

      expect(component.tableColumns).toEqual([
        'select',
        'title',
        'status',
        'more',
      ]);
    });

    it('should keep the selection when the result set changes', () => {
      fixture.detectChanges();
      spyOn(TestBed.inject(Router), 'navigate').and.returnValue(
        Promise.resolve(true)
      );
      component.bulkActions.toggleSelection(selectablePrint);

      // Paging, searching, filtering and sorting all funnel through here. The
      // selection outlives them, so a batch can span more than one page.
      component.updateFilter();

      expect(component.bulkActions.isSelected(selectablePrint.id)).toBeTrue();
    });

    it('should keep the selection when refreshing after a bulk action', () => {
      fixture.detectChanges();
      spyOn(TestBed.inject(Router), 'navigate').and.returnValue(
        Promise.resolve(true)
      );
      component.bulkActions.toggleSelection(selectablePrint);

      component.onBulkActionCompleted();

      expect(component.bulkActions.isSelected(selectablePrint.id)).toBeTrue();
    });

    it('should drop a print from the selection when it is deleted on its own', () => {
      fixture.detectChanges();
      spyOn(TestBed.inject(Router), 'navigate').and.returnValue(
        Promise.resolve(true)
      );
      spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({
        componentInstance: {},
        afterClosed: () => of(true),
      } as MatDialogRef<unknown>);
      const printService = TestBed.inject(
        PrintService
      ) as jasmine.SpyObj<PrintService>;
      printService.deletePrint.and.returnValue(of({} as PrintSummary));
      component.bulkActions.toggleSelection(selectablePrint);

      component.deletePrint(selectablePrint);

      expect(component.bulkActions.isSelected(selectablePrint.id)).toBeFalse();
    });

    describe('row checkbox click handling', () => {
      /**
       * Renders a one-row table through the resolver so the row checkbox can be
       * clicked for real.
       */
      const renderSingleRow = (): HTMLInputElement => {
        TestBed.inject(ActivatedRoute).data = of({
          printList: {
            items: [selectablePrint],
            paging: {
              currentPage: 1,
              pageSize: 10,
              totalCount: 1,
              totalPages: 1,
            },
          } as PagedList<PrintSummary>,
          printers: [],
          filaments: [],
        });
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector(
          `[data-cy-select-print="${selectablePrint.id}"] input[type="checkbox"]`
        ) as HTMLInputElement | null;
        expect(input).withContext('row checkbox input').not.toBeNull();
        return input as HTMLInputElement;
      };

      it('should not cancel the checkbox activation, which would revert the tick', () => {
        const input = renderSingleRow();
        const cell = input.closest('td') as HTMLElement;
        let defaultPreventedAtCell: boolean | null = null;
        // Registered after the template listener on the same element, so it runs
        // second and sees whatever the template handler did to the event.
        cell.addEventListener('click', (event) => {
          defaultPreventedAtCell = event.defaultPrevented;
        });

        input.click();

        expect(component.bulkActions.isSelected(selectablePrint.id)).toBeTrue();
        expect(defaultPreventedAtCell)
          .withContext(
            'preventDefault runs the canceled-activation steps, which restore ' +
              'input.checked to false after Angular has already written true'
          )
          .toBeFalse();
      });

      it('should not let a checkbox click reach the row, which would navigate', () => {
        const input = renderSingleRow();
        const table = fixture.nativeElement.querySelector(
          'table'
        ) as HTMLElement;
        let reachedTable = false;
        table.addEventListener('click', () => (reachedTable = true));

        input.click();

        expect(reachedTable).toBeFalse();
      });
    });
  });

  it('should navigate to /projects/new when navigateToNewProject is called', () => {
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(
      Promise.resolve(true)
    );
    component.navigateToNewProject();
    expect(navigateSpy).toHaveBeenCalledWith(['/projects', 'new']);
  });

  // Searching and paging refetch without a route change, so the list used to sit
  // there showing the previous results with no sign that anything was happening.
  describe('loading placeholders', () => {
    const rowFor = (id: number): PrintSummary =>
      ({
        id,
        title: `Print ${id}`,
        status: PrintStatus.Success,
        startDate: new Date('2026-03-14T00:00:00Z'),
        printer: { id: 1, name: '', make: 'Prusa', model: 'MK3S' },
        filamentSummary: [],
        commentCount: 0,
      }) as unknown as PrintSummary;

    const rowsOnScreen = (): void => {
      component.prints = [rowFor(1), rowFor(2)];
      component.totalCount = 2;
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
    };

    /** A refetch that has gone out but not come back. */
    const pendingRefetch = (): Subject<PagedList<PrintSummary>> => {
      const pending = new Subject<PagedList<PrintSummary>>();
      mockPrintService.getPrintSummaries.and.returnValue(
        pending.asObservable() as any
      );
      component.updateFilter();
      return pending;
    };

    // Real time rather than tick(): updateFilter awaits router.navigate, which
    // does not settle inside fakeAsync here.
    const waitPastSkeletonDelay = async (): Promise<void> => {
      await new Promise((resolve) =>
        setTimeout(resolve, DEFERRED_SKELETON_DELAY_MS + 30)
      );
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
    };

    const waitPastSkeletonDwell = async (): Promise<void> => {
      await new Promise((resolve) =>
        setTimeout(resolve, DEFERRED_SKELETON_MIN_VISIBLE_MS + 30)
      );
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
    };

    const table = (): HTMLElement =>
      fixture.debugElement.query(By.css('table')).nativeElement;

    // The flash this mechanism exists to remove. Most refetches on a warm
    // connection settle well inside the delay, and a busy affordance that
    // appears and vanishes in 20ms reads as a glitch.
    it('shows no busy affordance at all when a refetch lands inside the delay', async () => {
      fixture.detectChanges();
      rowsOnScreen();

      component.updateFilter();
      await waitPastSkeletonDelay();

      expect(component.showRefreshing()).toBeFalse();
      expect(component.showSkeleton()).toBeFalse();
      expect(fixture.debugElement.query(By.css('mat-progress-bar'))).toBeNull();
    });

    // The behavioral change: a refetch has rows worth keeping. Replacing them
    // with placeholders throws away the reader's place and scroll position to
    // say something the progress bar says without destroying anything.
    it('keeps the rows and runs a progress bar while a slow refetch is in flight', async () => {
      fixture.detectChanges();
      rowsOnScreen();

      const pending = pendingRefetch();
      await waitPastSkeletonDelay();

      expect(component.showRefreshing()).toBeTrue();
      expect(
        fixture.debugElement.queryAll(By.css('app-print-list-skeleton')).length
      ).toBe(0);
      expect(fixture.debugElement.queryAll(By.css('tr[mat-row]')).length).toBe(
        2
      );
      expect(table().classList).not.toContain('loading');
      expect(table().classList).toContain('refreshing');
      expect(
        fixture.debugElement.query(By.css('mat-progress-bar'))
      ).toBeTruthy();

      pending.complete();
    });

    // A screen reader needs to know the region is being updated, but the rows
    // are staying put, so this is aria-busy's job rather than a placeholder's
    // role="status".
    it('marks the refreshing table busy for assistive technology', async () => {
      fixture.detectChanges();
      rowsOnScreen();
      expect(table().getAttribute('aria-busy')).toBeNull();

      const pending = pendingRefetch();
      await waitPastSkeletonDelay();

      expect(table().getAttribute('aria-busy')).toBe('true');
      pending.complete();
    });

    it('shows no skeleton once the results have landed', () => {
      fixture.detectChanges();
      component.isLoading = false;
      fixture.detectChanges();

      expect(
        fixture.debugElement.query(By.css('app-print-list-skeleton'))
      ).toBeNull();
    });

    // An empty state next to a screen of shimmering placeholders is a lie.
    // Gated on the raw isLoading rather than the deferred flag, so it stays
    // suppressed through the pre-skeleton window too.
    it('suppresses the empty state while loading', () => {
      fixture.detectChanges();
      component.isLoading = true;
      // Plain-field mutations do not mark the view dirty in the zoneless test
      // harness, so the embedded @if block would not be refreshed.
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();

      expect(
        fixture.debugElement.query(By.css('app-print-empty-state'))
      ).toBeNull();
    });

    // The minimum dwell keeps an indicator on screen for up to 400ms AFTER the
    // response lands, so isLoading going false is not enough to let the empty
    // state in — "no prints found" beside a running progress bar contradicts it.
    it('holds the empty state back while the indicator serves out its dwell', async () => {
      fixture.detectChanges();
      rowsOnScreen();

      const pending = pendingRefetch();
      await waitPastSkeletonDelay();
      expect(component.showRefreshing()).toBeTrue();

      // The refetch comes back with nothing.
      pending.next({
        items: [],
        paging: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 1,
        },
      });
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();

      expect(component.isLoading).toBeFalse();
      expect(component.isBusy()).toBeTrue();
      expect(
        fixture.debugElement.query(By.css('app-print-empty-state'))
      ).toBeNull();

      await waitPastSkeletonDwell();

      expect(component.isBusy()).toBeFalse();
      expect(
        fixture.debugElement.query(By.css('app-print-empty-state'))
      ).toBeTruthy();
      expect(fixture.debugElement.query(By.css('mat-progress-bar'))).toBeNull();
    });

    // The live region is silenced only for a first-paint skeleton, where the
    // table is losing its rows while the skeleton's own role="status" announces
    // "Loading prints" — two regions talking at once is worse than one. A
    // refetch keeps its rows and uses aria-busy, so the live region stays on to
    // announce the new rows when they land.
    it('leaves the table live region on through a refetch', async () => {
      fixture.detectChanges();
      rowsOnScreen();
      expect(table().getAttribute('aria-live')).toBe('polite');

      const pending = pendingRefetch();
      await waitPastSkeletonDelay();

      expect(table().getAttribute('aria-live')).toBe('polite');
      pending.complete();
    });

    it('caps the placeholder count so a 100-per-page view is not a wall of grey', () => {
      component.pageSize = 100;
      expect(component.skeletonRowCount()).toBe(10);
    });
  });
});
