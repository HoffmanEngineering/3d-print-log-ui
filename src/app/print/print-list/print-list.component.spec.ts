import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { By, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { Subject, of } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
} from 'src/app/core/services/print.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';
import { PagedList } from 'src/app/core/types/paging';
import { DurationPipe } from 'src/app/shared/pipes/duration.pipe';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { PrinterRedirectPromptService } from '../services/printer-redirect-prompt.service';

import { DEFERRED_SKELETON_DELAY_MS } from 'src/app/shared/skeleton/deferred-skeleton';
import { PrintListComponent } from './print-list.component';

describe('PrintListComponent', () => {
  let component: PrintListComponent;
  let fixture: ComponentFixture<PrintListComponent>;
  let mockPrintService: jasmine.SpyObj<PrintService>;

  beforeEach(waitForAsync(() => {
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
        MatDialogModule,
        MatMenuModule,
        MatTableModule,
      ],
      providers: [
        { provide: LoggingService, useValue: mockLogger },
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
    fixture = TestBed.createComponent(PrintListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display "No prints found. Add a new print or try a different search." when there are no prints in the list', () => {
    // Arrange
    const mockActivatedRoute = TestBed.inject(ActivatedRoute);
    const mockPrintPagedResult: PagedList<PrintSummary> = {
      items: [],
      paging: {
        currentPage: 1,
        pageSize: 10,
        totalCount: 0,
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
    const message = fixture.debugElement.query(By.css('.no-prints'))
      .nativeElement as HTMLDivElement;
    expect(message.innerText).toEqual(
      'No prints found. Add a new print or try a different search.'
    );
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

  it('should display a "No Active Printers" toast if the printerRedirectPromptService should show prompt', () => {
    // Arrange
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

    // Act
    fixture.detectChanges();

    // Assert
    expect(mockToastrService.info).toHaveBeenCalledWith(
      'Click here to add a new 3D Printer before logging prints.',
      'No Active Printers',
      jasmine.any(Object)
    );
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

    // Act
    fixture.detectChanges();

    // Assert
    expect(routerSpy).toHaveBeenCalledWith(['printers', 'new']);
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

    // "No prints found" next to a screen of shimmering placeholders is a lie.
    it('suppresses the empty-state message while loading', () => {
      fixture.detectChanges();
      component.isLoading = true;
      // Plain-field mutations do not mark the view dirty in the zoneless test
      // harness, so the embedded @if block would not be refreshed.
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.no-prints'))).toBeNull();
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
