import type { Mock, MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MediaMatcher } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { Subject, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PrintGroupedViewComponent } from './print-grouped-view.component';
import {
  ProjectService,
  GroupedFeedItemDto,
} from 'src/app/core/services/project.service';
import {
  PrintService,
  PrintStatus,
  PrintSummarySortColumn,
} from 'src/app/core/services/print.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { SortDirection } from 'src/app/core/types/sort-request';
import { PagedList } from 'src/app/core/types/paging';
import { RouterTestingModule } from '@angular/router/testing';
import { ComponentRef } from '@angular/core';
import { DEFERRED_SKELETON_DELAY_MS } from 'src/app/shared/skeleton/deferred-skeleton';
import { PrinterThumbnailStore } from 'src/app/core/stores/printer-thumbnail-store.service';
import { By } from '@angular/platform-browser';
import { PrintImageComponent } from 'src/app/shared/print-image/print-image.component';
import { ProjectImageComponent } from 'src/app/shared/project-image/project-image.component';
import {
  resinPrintSummary,
  resinUsageRow,
  unlinkedResinUsageRow,
} from 'src/app/print/testing/resin-print-fixtures';

function makePagedList<T>(items: T[]): PagedList<T> {
  return {
    items,
    paging: {
      currentPage: 1,
      pageSize: 20,
      totalCount: items.length,
      totalPages: 1,
    },
  };
}

const mockProjectItem: GroupedFeedItemDto = {
  type: 'project',
  projectStartDate: '2026-03-02',
  sortDate: new Date('2024-01-01'),
  projectId: 'proj-1',
  projectName: 'Test Project',
  projectStatus: 1,
  printCount: 5,
  filteredPrintCount: null,
  totalPrintTimeInSeconds: 3600,
  totalFilamentWeightMg: 100000,
  filamentUsage: [],
  printers: [],
};

const mockPrintItem: GroupedFeedItemDto = {
  type: 'print',
  projectStartDate: null,
  sortDate: new Date('2024-01-02'),
  print: {
    id: 42,
    title: 'Standalone Print',
    printer: {
      id: 1,
      name: '',
      make: 'Bambu',
      model: 'X1C',
      isActive: true,
      category: null,
    },
    startDate: new Date('2024-01-02'),
    status: PrintStatus.Success,
    defaultPrintImageId: 0,
    filamentUsage: [],
    totalFilamentWeightMg: 50000,
    commentCount: 0,
  },
};

describe('PrintGroupedViewComponent', () => {
  let fixture: ComponentFixture<PrintGroupedViewComponent>;
  let component: PrintGroupedViewComponent;
  let ref: ComponentRef<PrintGroupedViewComponent>;
  let mockProjectService: MockedObject<ProjectService>;
  let mockPrintService: MockedObject<PrintService>;
  let mockMediaMatcher: {
    matchMedia: Mock;
  };

  beforeEach(async () => {
    localStorage.clear();
    mockMediaMatcher = {
      matchMedia: vi.fn().mockReturnValue({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    };
    mockProjectService = {
      getGroupedFeed: vi.fn().mockName('ProjectService.getGroupedFeed'),
    } as unknown as MockedObject<ProjectService>;
    mockPrintService = {
      getPrintSummaries: vi.fn().mockName('PrintService.getPrintSummaries'),
      calculateTotalPrintCost: vi
        .fn()
        .mockName('PrintService.calculateTotalPrintCost'),
    } as unknown as MockedObject<PrintService>;
    mockPrintService.calculateTotalPrintCost.mockReturnValue({
      prices: [],
      total: { valid: false, message: 'Cannot calculate total' },
    });

    mockProjectService.getGroupedFeed.mockReturnValue(
      of(makePagedList([mockProjectItem, mockPrintItem]))
    );
    mockPrintService.getPrintSummaries.mockReturnValue(of(makePagedList([])));

    const mockToastrService = {
      success: vi.fn().mockName('ToastrService.success'),
      error: vi.fn().mockName('ToastrService.error'),
    };
    const mockDialog = {
      open: vi.fn().mockName('MatDialog.open'),
    };
    const mockLoggingService = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    };

    await TestBed.configureTestingModule({
      imports: [
        PrintGroupedViewComponent,
        NoopAnimationsModule,
        RouterTestingModule,
      ],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: PrintService, useValue: mockPrintService },
        { provide: ToastrService, useValue: mockToastrService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: LoggingService, useValue: mockLoggingService },
        { provide: MediaMatcher, useValue: mockMediaMatcher },
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintGroupedViewComponent);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
  });

  it('calls getGroupedFeed on init with default inputs', async () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);
    expect(mockProjectService.getGroupedFeed).toHaveBeenCalledWith(
      1,
      10,
      '',
      null,
      [],
      [],
      PrintSummarySortColumn.StartDate,
      SortDirection.Desc
    );
  });

  // Unlike the flat list, this view has no resolver: it genuinely fetches its
  // first page in ngOnInit, so both branches of the busy affordance are
  // reachable here.
  describe('deferred busy affordance', () => {
    const pendingFeed = (): Subject<PagedList<GroupedFeedItemDto>> => {
      const pending = new Subject<PagedList<GroupedFeedItemDto>>();
      mockProjectService.getGroupedFeed.mockReturnValue(
        pending.asObservable() as any
      );
      return pending;
    };

    const skeleton = () =>
      fixture.nativeElement.querySelector('app-print-list-skeleton');
    const progressBar = () =>
      fixture.nativeElement.querySelector('mat-progress-bar');

    // A superseded request is UNSUBSCRIBED, so it never reaches next or error.
    // The busy indicator is refcounted, so the stop() that would balance its
    // start() has to happen on cancellation too, or `pending` never returns to
    // zero and the progress bar stays up for the life of the page.
    it('clears the busy affordance after a superseded request is cancelled', async () => {
      vi.useFakeTimers();
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(500);
      fixture.detectChanges();

      // Two supersessions, matching what one keystroke actually produces.
      pendingFeed();
      component.loadFeed();
      await vi.advanceTimersByTimeAsync(50);
      pendingFeed();
      component.loadFeed();
      await vi.advanceTimersByTimeAsync(50);

      const settled = pendingFeed();
      component.loadFeed();
      await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS + 50);
      fixture.detectChanges();
      expect(component.isBusy()).toBe(true);

      settled.next(makePagedList([mockProjectItem, mockPrintItem]));
      settled.complete();
      await vi.advanceTimersByTimeAsync(1000);
      fixture.detectChanges();

      expect(component.isBusy()).toBe(false);
      expect(progressBar()).toBeNull();

      vi.clearAllTimers();
    });

    it('paints no skeleton when the first feed lands inside the delay', async () => {
      vi.useFakeTimers();
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS + 50);
      fixture.detectChanges();

      expect(component.showSkeleton()).toBe(false);
      expect(skeleton()).toBeNull();
    });

    // The blank pre-skeleton window must not be mistaken for an empty result.
    it('shows neither skeleton nor empty state before the delay elapses', async () => {
      vi.useFakeTimers();
      pendingFeed();
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS - 50);
      fixture.detectChanges();

      expect(skeleton()).toBeNull();
      expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();

      vi.clearAllTimers();
    });

    it('shows the skeleton for a slow first load', async () => {
      vi.useFakeTimers();
      const pending = pendingFeed();
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS + 50);
      fixture.detectChanges();

      expect(component.showSkeleton()).toBe(true);
      expect(skeleton()).toBeTruthy();
      expect(progressBar()).toBeNull();

      pending.complete();
      vi.clearAllTimers();
    });

    // Once rows exist they stay: a refetch gets the progress bar, never a
    // placeholder that would throw away the reader's place.
    it('keeps the rows and shows a progress bar on a slow refetch', async () => {
      vi.useFakeTimers();
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(500);
      fixture.detectChanges();
      expect(component.flatRows().length).toBe(2);

      const pending = pendingFeed();
      component.loadFeed();
      await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS + 50);
      fixture.detectChanges();

      expect(component.showRefreshing()).toBe(true);
      expect(component.showSkeleton()).toBe(false);
      expect(skeleton()).toBeNull();
      expect(progressBar()).toBeTruthy();
      expect(component.flatRows().length).toBe(2);

      pending.complete();
      vi.clearAllTimers();
    });
  });

  it('flatRows contains project and print rows from feed', async () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);
    const rows = component.flatRows();
    expect(rows.length).toBe(2);
    expect(rows[0].kind).toBe('project');
    expect(rows[1].kind).toBe('print');
  });

  it('calls getGroupedFeed again when filterByStatus input changes', async () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);
    mockProjectService.getGroupedFeed.mockClear();

    ref.setInput('filterByStatus', PrintStatus.Success);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);

    expect(mockProjectService.getGroupedFeed).toHaveBeenCalledWith(
      1,
      10,
      '',
      PrintStatus.Success,
      [],
      [],
      PrintSummarySortColumn.StartDate,
      SortDirection.Desc
    );
  });

  it('calls getGroupedFeed after 400ms debounce when searchText input changes', async () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);
    mockProjectService.getGroupedFeed.mockClear();

    ref.setInput('searchText', 'benchy');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(200);
    expect(mockProjectService.getGroupedFeed).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);
    expect(mockProjectService.getGroupedFeed).toHaveBeenCalledWith(
      1,
      10,
      'benchy',
      null,
      [],
      [],
      PrintSummarySortColumn.StartDate,
      SortDirection.Desc
    );
  });

  it('inserts expanded-print rows after project row when project is toggled open', async () => {
    vi.useFakeTimers();
    const expandedPrint = {
      id: 99,
      title: 'Project Print',
      printer: null,
      status: PrintStatus.Success,
      defaultPrintImageId: 0,
      filamentUsage: [],
      totalFilamentWeightMg: 0,
      commentCount: 0,
    };
    mockPrintService.getPrintSummaries.mockReturnValue(
      of(makePagedList([expandedPrint as any]))
    );

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);

    component.onProjectToggle('proj-1', 5);
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    const rows = component.flatRows();
    expect(rows[0].kind).toBe('project');
    expect(rows[1].kind).toBe('expanded-print');
    expect(rows[2].kind).toBe('print'); // standalone print is still there
  });

  it('shows more-prints row when filteredPrintCount < printCount', async () => {
    vi.useFakeTimers();
    const itemWithFilter: GroupedFeedItemDto = {
      ...mockProjectItem,
      printCount: 5,
      filteredPrintCount: 2,
    };
    mockProjectService.getGroupedFeed.mockReturnValue(
      of(makePagedList([itemWithFilter]))
    );

    const expandedPrint = {
      id: 99,
      title: 'Project Print',
      printer: null,
      status: PrintStatus.Success,
      defaultPrintImageId: 0,
      filamentUsage: [],
      totalFilamentWeightMg: 0,
      commentCount: 0,
    };
    mockPrintService.getPrintSummaries.mockReturnValue(
      of(makePagedList([expandedPrint as any]))
    );

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);

    component.onProjectToggle('proj-1', 5);
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    const rows = component.flatRows();
    const morePrintsRow = rows.find((r) => r.kind === 'more-prints');
    expect(morePrintsRow).toBeTruthy();
    expect((morePrintsRow as any).count).toBe(3); // 5 total - 2 filtered
  });

  it('removes expanded-print rows when project is toggled closed', async () => {
    vi.useFakeTimers();
    const expandedPrint = {
      id: 99,
      title: 'Project Print',
      printer: null,
      status: PrintStatus.Success,
      defaultPrintImageId: 0,
      filamentUsage: [],
      totalFilamentWeightMg: 0,
      commentCount: 0,
    };
    mockPrintService.getPrintSummaries.mockReturnValue(
      of(makePagedList([expandedPrint as any]))
    );

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);

    component.onProjectToggle('proj-1', 5); // open
    await vi.advanceTimersByTimeAsync(0);
    component.onProjectToggle('proj-1', 5); // close
    fixture.detectChanges();

    const rows = component.flatRows();
    expect(rows.find((r) => r.kind === 'expanded-print')).toBeUndefined();
  });

  it('clears expanded projects and reloads when filter changes', async () => {
    vi.useFakeTimers();
    const expandedPrint = {
      id: 99,
      title: 'Project Print',
      printer: null,
      status: PrintStatus.Success,
      defaultPrintImageId: 0,
      filamentUsage: [],
      totalFilamentWeightMg: 0,
      commentCount: 0,
    };
    mockPrintService.getPrintSummaries.mockReturnValue(
      of(makePagedList([expandedPrint as any]))
    );

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);

    component.onProjectToggle('proj-1', 5);
    await vi.advanceTimersByTimeAsync(0);

    // Change a filter
    ref.setInput('filterByStatus', PrintStatus.Success);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);

    // Expanded state should be cleared
    expect(component.expandedProjectPrints().size).toBe(0);
  });

  describe('getPrintEndDate', () => {
    it('returns null when print is undefined', () => {
      fixture.detectChanges();
      expect(component.getPrintEndDate(undefined)).toBeNull();
    });

    it('returns null when print has no times', () => {
      fixture.detectChanges();
      const print = {
        startDate: new Date('2024-01-01'),
        printTimeInSeconds: 0,
        estimatedPrintTimeInSeconds: 0,
      } as any;
      expect(component.getPrintEndDate(print)).toBeNull();
    });

    it('returns null when startDate is not set', () => {
      fixture.detectChanges();
      const print = {
        startDate: undefined,
        printTimeInSeconds: 3600,
        estimatedPrintTimeInSeconds: 0,
      } as any;
      expect(component.getPrintEndDate(print)).toBeNull();
    });

    it('returns startDate + actual time when printTimeInSeconds is set', () => {
      fixture.detectChanges();
      const start = new Date('2024-01-01T10:00:00Z');
      const print = {
        startDate: start,
        printTimeInSeconds: 3600,
        estimatedPrintTimeInSeconds: 0,
      } as any;
      const result = component.getPrintEndDate(print);
      expect(result).not.toBeNull();
      expect(result!.getTime()).toBe(
        new Date('2024-01-01T11:00:00Z').getTime()
      );
    });

    it('falls back to estimated time when printTimeInSeconds is 0', () => {
      fixture.detectChanges();
      const start = new Date('2024-01-01T10:00:00Z');
      const print = {
        startDate: start,
        printTimeInSeconds: 0,
        estimatedPrintTimeInSeconds: 1800,
      } as any;
      const result = component.getPrintEndDate(print);
      expect(result).not.toBeNull();
      expect(result!.getTime()).toBe(
        new Date('2024-01-01T10:30:00Z').getTime()
      );
    });
  });

  describe('getProjectTotalCost', () => {
    it('returns empty string when cost cannot be calculated', () => {
      fixture.detectChanges();
      expect(component.getProjectTotalCost(mockProjectItem)).toBe('');
    });

    it('returns formatted price when material cost is valid', () => {
      mockPrintService.calculateTotalPrintCost.mockReturnValue({
        prices: [],
        total: {
          valid: true,
          formattedPrice: '$1.50',
          price: null as any,
          symbol: '$',
          usesDefaultPrice: false,
        },
      });
      fixture.detectChanges();
      expect(component.getProjectTotalCost(mockProjectItem)).toBe('$1.50');
    });
  });

  it('shows a printer avatar beside the printer name', async () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('app-printer-avatar')
    ).toBeTruthy();

    vi.clearAllTimers();
  });

  // #281: the API reports a thumbnail per default image; small slots should use it. An API
  // without the fields leaves them undefined and the image components fetch the full image.
  it('passes the thumbnail paths to the project and print images', async () => {
    vi.useFakeTimers();
    // The image components render for real here and fetch their image.
    (mockProjectService as any).getProjectImage = vi
      .fn()
      .mockReturnValue(of(''));
    (mockPrintService as any).getPrintImage = vi.fn().mockReturnValue(of(''));
    mockProjectService.getGroupedFeed.mockReturnValue(
      of(
        makePagedList([
          {
            ...mockProjectItem,
            defaultProjectImageId: 3,
            defaultProjectImageThumbnailUrl:
              '/api/Projects/proj-1/images/3/thumbnail',
          },
          {
            ...mockPrintItem,
            print: {
              ...mockPrintItem.print,
              defaultPrintImageId: 9,
              defaultPrintImageThumbnailUrl: '/api/Prints/42/image/9/thumbnail',
            },
          },
        ])
      )
    );
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();

    const projectImages = fixture.debugElement
      .queryAll(By.directive(ProjectImageComponent))
      .map((d) =>
        (d.componentInstance as ProjectImageComponent).thumbnailUrl()
      );
    const printImages = fixture.debugElement
      .queryAll(By.directive(PrintImageComponent))
      .map((d) => (d.componentInstance as PrintImageComponent).thumbnailUrl());

    expect(projectImages.length).toBeGreaterThan(0);
    expect(printImages.length).toBeGreaterThan(0);
    expect(projectImages).toEqual(
      projectImages.map(() => '/api/Projects/proj-1/images/3/thumbnail')
    );
    expect(printImages).toEqual(
      printImages.map(() => '/api/Prints/42/image/9/thumbnail')
    );

    vi.clearAllTimers();
  });

  // printlog-bridge#97: a resin print reports mL. The server's gram total converts that through
  // the bottle's density (and is 0 with no bottle), so the list must not show it for resin.
  describe('a resin print', () => {
    const resinItem: GroupedFeedItemDto = {
      type: 'print',
      projectStartDate: null,
      sortDate: new Date('2026-10-20'),
      print: resinPrintSummary([resinUsageRow(), unlinkedResinUsageRow()]),
    };

    async function renderedText(): Promise<string> {
      // A print with usage rows renders their per-row prices.
      (mockPrintService as unknown as Record<string, unknown>)[
        'calculatePrintCost'
      ] = vi.fn().mockReturnValue({ valid: false, message: 'No price' });
      mockProjectService.getGroupedFeed.mockReturnValue(
        of(makePagedList([resinItem]))
      );
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(500);
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).textContent ?? '';
    }

    it('shows the bottle chip in mL, marked estimated', async () => {
      vi.useFakeTimers();
      expect(await renderedText()).toContain('(42.5mL*)');
      vi.clearAllTimers();
    });

    it('totals the rows in mL instead of the gram total', async () => {
      vi.useFakeTimers();
      component.displayedColumns.set(['title', 'totalFilamentUsage', 'more']);
      const text = await renderedText();
      expect(text).toContain('85.0 mL*');
      expect(text).not.toContain('46.8');
      expect(text).not.toContain('0.0g');
      vi.clearAllTimers();
    });
  });
});
