import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
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

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj<ProjectService>(
      'ProjectService',
      ['getGroupedFeed']
    );
    mockPrintService = jasmine.createSpyObj<PrintService>('PrintService', [
      'getPrintSummaries',
    ]);

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
      20,
      '',
      null,
      [],
      [],
      PrintSummarySortColumn.StartDate,
      SortDirection.Desc
    );
  }));

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
      20,
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
      20,
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
});
