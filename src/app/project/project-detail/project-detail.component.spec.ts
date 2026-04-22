import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { ProjectDetailComponent } from './project-detail.component';
import {
  ProjectService,
  ProjectDetailDto,
  ProjectStatus,
  ProjectViewStatus,
} from 'src/app/core/services/project.service';
import {
  PrintService,
  PrintSummary,
  PrintStatus,
} from 'src/app/core/services/print.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';

const mockProject: ProjectDetailDto = {
  id: 'abc-123',
  name: 'Test Voron Build',
  status: ProjectStatus.InProgress,
  viewStatus: ProjectViewStatus.Private,
  createdDate: new Date(),
  createdByUserId: 1,
  printCount: 2,
  totalPrintTimeInSeconds: 7200,
  totalEstimatedPrintTimeInSeconds: 8000,
  totalFilamentWeightMg: 250000,
  images: [],
};

describe('ProjectDetailComponent', () => {
  let fixture: ComponentFixture<ProjectDetailComponent>;
  let component: ProjectDetailComponent;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockPrintService: jasmine.SpyObj<PrintService>;
  let currentUserSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj<ProjectService>(
      'ProjectService',
      [
        'getProjectById',
        'deleteProject',
        'updateProject',
        'uploadImage',
        'deleteImage',
        'reorderImages',
        'setDefaultImage',
      ]
    );
    mockProjectService.getProjectById.and.returnValue(of(mockProject));

    mockPrintService = jasmine.createSpyObj('PrintService', [
      'getPrintSummaries',
      'deletePrint',
      'updatePrintStatus',
    ]);
    mockPrintService.getPrintSummaries.and.returnValue(
      of({
        items: [],
        paging: { totalCount: 0, currentPage: 1, pageSize: 100, totalPages: 0 },
      })
    );
    mockPrintService.deletePrint.and.returnValue(of(null));
    mockPrintService.updatePrintStatus.and.returnValue(of(null));

    currentUserSubject = new BehaviorSubject({ id: 1 });
    const mockAuthService = { userProfile$: currentUserSubject.asObservable() };

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: PrintService, useValue: mockPrintService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: 'abc-123' } } },
        },
        {
          provide: MatDialog,
          useValue: jasmine.createSpyObj('MatDialog', ['open']),
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('should display project name', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Test Voron Build');
  });

  it('should display print count', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2');
  });

  it('should show edit button for owner', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const editButton = fixture.nativeElement.querySelector(
      '[data-testid="edit-button"]'
    );
    expect(editButton).toBeTruthy();
  });

  it('should not show edit button for non-owner', async () => {
    currentUserSubject.next({ id: 99 });
    await fixture.whenStable();
    fixture.detectChanges();
    const editButton = fixture.nativeElement.querySelector(
      '[data-testid="edit-button"]'
    );
    expect(editButton).toBeNull();
  });

  it('should enter edit mode and show form when edit button clicked', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const editButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="edit-button"]'
    );
    editButton.click();
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('app-project-edit-form');
    expect(form).toBeTruthy();
  });

  it('should exit edit mode on cancel', async () => {
    await fixture.whenStable();
    component.onEditClick();
    fixture.detectChanges();
    component.onCancelEdit();
    fixture.detectChanges();
    expect(component.isEditing()).toBe(false);
  });

  it('should call updateProject and re-fetch project on save', async () => {
    mockProjectService.updateProject.and.returnValue(of(mockProject));
    mockProjectService.uploadImage = jasmine
      .createSpy()
      .and.returnValue(
        of({ id: 10, isDefault: false, displayOrder: 0 } as any)
      );
    mockProjectService.reorderImages.and.returnValue(of(void 0));
    mockProjectService.setDefaultImage.and.returnValue(of(void 0));
    mockProjectService.deleteImage.and.returnValue(of(void 0));

    await fixture.whenStable();
    fixture.detectChanges();
    component.onEditClick();

    component.onSave({
      name: 'Updated Name',
      reference: '',
      description: '',
      url: '',
      viewStatus: ProjectViewStatus.Public,
    });

    await fixture.whenStable();

    expect(mockProjectService.updateProject).toHaveBeenCalledWith(
      'abc-123',
      jasmine.objectContaining({
        name: 'Updated Name',
        status: ProjectStatus.InProgress,
      })
    );
    // Called once on init, once after save
    expect(mockProjectService.getProjectById).toHaveBeenCalledTimes(2);
    expect(component.isEditing()).toBe(false);
    expect(component.isSaving()).toBe(false);
  });

  it('should call PrintService.deletePrint when onPrintDeleted is called and confirmed', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const mockDialogRef = {
      afterClosed: () => of(true),
      componentInstance: {},
    } as any;
    // Spy directly on the component's injected dialog instance — SharedModule provides
    // the real MatDialog via MatDialogModule, which shadows the root-injector mock.
    spyOn((component as any).dialog, 'open').and.returnValue(mockDialogRef);

    const print: PrintSummary = {
      id: 7,
      title: 'Test Print',
      printer: { id: 1, make: 'Prusa', model: 'MK4', name: '' } as any,
      status: PrintStatus.Success,
      defaultPrintImageId: 0,
      createdByUserId: 1,
      estimatedPrintTimeInSeconds: 0,
      printTimeInSeconds: 0,
      sumActualFilamentWeightMg: 0,
      sumEstimatedFilamentWeightMg: 0,
      totalFilamentWeightMg: 0,
      filamentUsage: [],
      commentCount: 0,
    };

    component.onPrintDeleted(print);
    await fixture.whenStable();

    expect(mockPrintService.deletePrint).toHaveBeenCalledWith(7);
  });

  it('should call PrintService.updatePrintStatus when onPrintStatusChanged is called', async () => {
    component.onPrintStatusChanged({ id: 7, status: PrintStatus.Failed });
    await fixture.whenStable();
    expect(mockPrintService.updatePrintStatus).toHaveBeenCalledWith(
      7,
      PrintStatus.Failed
    );
  });
});

describe('ProjectDetailComponent — create mode (id === "new")', () => {
  let fixture: ComponentFixture<ProjectDetailComponent>;
  let component: ProjectDetailComponent;
  let mockProjectService: jasmine.SpyObj<ProjectService>;

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj<ProjectService>(
      'ProjectService',
      [
        'getProjectById',
        'createProject',
        'deleteProject',
        'updateProject',
        'uploadImage',
        'deleteImage',
        'reorderImages',
        'setDefaultImage',
      ]
    );
    mockProjectService.createProject.and.returnValue(
      of({ ...mockProject, id: 'new-guid-123' })
    );

    const mockPrintService = jasmine.createSpyObj('PrintService', [
      'getPrintSummaries',
      'deletePrint',
      'updatePrintStatus',
    ]);
    mockPrintService.getPrintSummaries.and.returnValue(
      of({
        items: [],
        paging: { totalCount: 0, currentPage: 1, pageSize: 100, totalPages: 0 },
      })
    );

    const currentUserSubject = new BehaviorSubject({ id: 1 });
    const mockAuthService = {
      userProfile$: currentUserSubject.asObservable(),
    };

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: PrintService, useValue: mockPrintService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: 'new' } } },
        },
        {
          provide: MatDialog,
          useValue: jasmine.createSpyObj('MatDialog', ['open']),
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate']),
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('should not call getProjectById', () => {
    expect(mockProjectService.getProjectById).not.toHaveBeenCalled();
  });

  it('should be in editing mode immediately', () => {
    expect(component.isEditing()).toBe(true);
  });

  it('isCreating should be true', () => {
    expect(component.isCreating()).toBe(true);
  });

  it('should not be loading', () => {
    expect(component.loading()).toBe(false);
  });
});
