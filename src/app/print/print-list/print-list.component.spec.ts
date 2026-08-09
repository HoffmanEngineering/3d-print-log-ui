import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { By, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
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

import { PrintListComponent } from './print-list.component';
import { PrintEmptyStateComponent } from './print-empty-state/print-empty-state.component';

describe('PrintListComponent', () => {
  let component: PrintListComponent;
  let fixture: ComponentFixture<PrintListComponent>;

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

    const mockPrintService = jasmine.createSpyObj<PrintService>(
      'PrintService',
      ['deletePrint', 'getPrintSummaries']
    );
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
        PrintEmptyStateComponent,
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
});
