import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  tick,
} from '@angular/core/testing';
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
import { SharedModule } from 'src/app/shared/shared.module';
import { RouterTestingModule } from '@angular/router/testing';
import { ComponentRef } from '@angular/core';
import { DEFERRED_SKELETON_DELAY_MS } from 'src/app/shared/skeleton/deferred-skeleton';

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
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockPrintService: jasmine.SpyObj<PrintService>;
  let mockMediaMatcher: { matchMedia: jasmine.Spy };

  beforeEach(async () => {
    localStorage.clear();
    mockMediaMatcher = {
      matchMedia: jasmine.createSpy('matchMedia').and.returnValue({
        matches: false,
        addListener: jasmine.createSpy('addListener'),
        removeListener: jasmine.createSpy('removeListener'),
        addEventListener: jasmine.createSpy('addEventListener'),
        removeEventListener: jasmine.createSpy('removeEventListener'),
      }),
    };
    mockProjectService = jasmine.createSpyObj<ProjectService>(
      'ProjectService',
      ['getGroupedFeed']
    );
    mockPrintService = jasmine.createSpyObj<PrintService>('PrintService', [
      'getPrintSummaries',
      'calculateTotalPrintCost',
    ]);
    mockPrintService.calculateTotalPrintCost.and.returnValue({
      prices: [],
      total: { valid: false, message: 'Cannot calculate total' },
    });

    mockProjectService.getGroupedFeed.and.returnValue(
      of(makePagedList([mockProjectItem, mockPrintItem]))
    );
    mockPrintService.getPrintSummaries.and.returnValue(of(makePagedList([])));

    const mockToastrService = jasmine.createSpyObj<ToastrService>(
      'ToastrService',
      ['success', 'error']
    );
    const mockDialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    const mockLoggingService = jasmine.createSpyObj<LoggingService>(
      'LoggingService',
      ['logEvent', 'logException']
    );

    await TestBed.configureTestingModule({
      imports: [
        PrintGroupedViewComponent,
        NoopAnimationsModule,
        SharedModule,
        RouterTestingModule,
      ],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: PrintService, useValue: mockPrintService },
        { provide: ToastrService, useValue: mockToastrService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: LoggingService, useValue: mockLoggingService },
        { provide: MediaMatcher, useValue: mockMediaMatcher },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintGroupedViewComponent);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
  });

  it('calls getGroupedFeed on init with default inputs', fakeAsync(() => {
    fixture.detectChanges();
    tick(500);
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
  }));

  // Unlike the flat list, this view has no resolver: it genuinely fetches its
  // first page in ngOnInit, so both branches of the busy affordance are
  // reachable here.
  describe('deferred busy affordance', () => {
    const pendingFeed = (): Subject<PagedList<GroupedFeedItemDto>> => {
      const pending = new Subject<PagedList<GroupedFeedItemDto>>();
      mockProjectService.getGroupedFeed.and.returnValue(
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
    it('clears the busy affordance after a superseded request is cancelled', fakeAsync(() => {
      fixture.detectChanges();
      tick(500);
      fixture.detectChanges();

      // Two supersessions, matching what one keystroke actually produces.
      pendingFeed();
      component.loadFeed();
      tick(50);
      pendingFeed();
      component.loadFeed();
      tick(50);

      const settled = pendingFeed();
      component.loadFeed();
      tick(DEFERRED_SKELETON_DELAY_MS + 50);
      fixture.detectChanges();
      expect(component.isBusy()).toBeTrue();

      settled.next(makePagedList([mockProjectItem, mockPrintItem]));
      settled.complete();
      tick(1000);
      fixture.detectChanges();

      expect(component.isBusy()).toBeFalse();
      expect(progressBar()).toBeNull();

      discardPeriodicTasks();
    }));

    it('paints no skeleton when the first feed lands inside the delay', fakeAsync(() => {
      fixture.detectChanges();
      tick(DEFERRED_SKELETON_DELAY_MS + 50);
      fixture.detectChanges();

      expect(component.showSkeleton()).toBeFalse();
      expect(skeleton()).toBeNull();
    }));

    // The blank pre-skeleton window must not be mistaken for an empty result.
    it('shows neither skeleton nor empty state before the delay elapses', fakeAsync(() => {
      pendingFeed();
      fixture.detectChanges();
      tick(DEFERRED_SKELETON_DELAY_MS - 50);
      fixture.detectChanges();

      expect(skeleton()).toBeNull();
      expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();

      discardPeriodicTasks();
    }));

    it('shows the skeleton for a slow first load', fakeAsync(() => {
      const pending = pendingFeed();
      fixture.detectChanges();
      tick(DEFERRED_SKELETON_DELAY_MS + 50);
      fixture.detectChanges();

      expect(component.showSkeleton()).toBeTrue();
      expect(skeleton()).toBeTruthy();
      expect(progressBar()).toBeNull();

      pending.complete();
      discardPeriodicTasks();
    }));

    // Once rows exist they stay: a refetch gets the progress bar, never a
    // placeholder that would throw away the reader's place.
    it('keeps the rows and shows a progress bar on a slow refetch', fakeAsync(() => {
      fixture.detectChanges();
      tick(500);
      fixture.detectChanges();
      expect(component.flatRows().length).toBe(2);

      const pending = pendingFeed();
      component.loadFeed();
      tick(DEFERRED_SKELETON_DELAY_MS + 50);
      fixture.detectChanges();

      expect(component.showRefreshing()).toBeTrue();
      expect(component.showSkeleton()).toBeFalse();
      expect(skeleton()).toBeNull();
      expect(progressBar()).toBeTruthy();
      expect(component.flatRows().length).toBe(2);

      pending.complete();
      discardPeriodicTasks();
    }));
  });

  it('flatRows contains project and print rows from feed', fakeAsync(() => {
    fixture.detectChanges();
    tick(500);
    const rows = component.flatRows();
    expect(rows.length).toBe(2);
    expect(rows[0].kind).toBe('project');
    expect(rows[1].kind).toBe('print');
  }));

  it('calls getGroupedFeed again when filterByStatus input changes', fakeAsync(() => {
    fixture.detectChanges();
    tick(500);
    mockProjectService.getGroupedFeed.calls.reset();

    ref.setInput('filterByStatus', PrintStatus.Success);
    fixture.detectChanges();
    tick(500);

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
  }));

  it('calls getGroupedFeed after 400ms debounce when searchText input changes', fakeAsync(() => {
    fixture.detectChanges();
    tick(500);
    mockProjectService.getGroupedFeed.calls.reset();

    ref.setInput('searchText', 'benchy');
    fixture.detectChanges();
    tick(200);
    expect(mockProjectService.getGroupedFeed).not.toHaveBeenCalled();

    tick(200);
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
  }));

  it('inserts expanded-print rows after project row when project is toggled open', fakeAsync(() => {
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
    mockPrintService.getPrintSummaries.and.returnValue(
      of(makePagedList([expandedPrint as any]))
    );

    fixture.detectChanges();
    tick(500);

    component.onProjectToggle('proj-1', 5);
    tick();
    fixture.detectChanges();

    const rows = component.flatRows();
    expect(rows[0].kind).toBe('project');
    expect(rows[1].kind).toBe('expanded-print');
    expect(rows[2].kind).toBe('print'); // standalone print is still there
  }));

  it('shows more-prints row when filteredPrintCount < printCount', fakeAsync(() => {
    const itemWithFilter: GroupedFeedItemDto = {
      ...mockProjectItem,
      printCount: 5,
      filteredPrintCount: 2,
    };
    mockProjectService.getGroupedFeed.and.returnValue(
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
    mockPrintService.getPrintSummaries.and.returnValue(
      of(makePagedList([expandedPrint as any]))
    );

    fixture.detectChanges();
    tick(500);

    component.onProjectToggle('proj-1', 5);
    tick();
    fixture.detectChanges();

    const rows = component.flatRows();
    const morePrintsRow = rows.find((r) => r.kind === 'more-prints');
    expect(morePrintsRow).toBeTruthy();
    expect((morePrintsRow as any).count).toBe(3); // 5 total - 2 filtered
  }));

  it('removes expanded-print rows when project is toggled closed', fakeAsync(() => {
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
    mockPrintService.getPrintSummaries.and.returnValue(
      of(makePagedList([expandedPrint as any]))
    );

    fixture.detectChanges();
    tick(500);

    component.onProjectToggle('proj-1', 5); // open
    tick();
    component.onProjectToggle('proj-1', 5); // close
    fixture.detectChanges();

    const rows = component.flatRows();
    expect(rows.find((r) => r.kind === 'expanded-print')).toBeUndefined();
  }));

  it('clears expanded projects and reloads when filter changes', fakeAsync(() => {
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
    mockPrintService.getPrintSummaries.and.returnValue(
      of(makePagedList([expandedPrint as any]))
    );

    fixture.detectChanges();
    tick(500);

    component.onProjectToggle('proj-1', 5);
    tick();

    // Change a filter
    ref.setInput('filterByStatus', PrintStatus.Success);
    fixture.detectChanges();
    tick(500);

    // Expanded state should be cleared
    expect(component.expandedProjectPrints().size).toBe(0);
  }));

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
      mockPrintService.calculateTotalPrintCost.and.returnValue({
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
});
