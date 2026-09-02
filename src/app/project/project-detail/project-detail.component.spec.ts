import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { ADSENSE_TOKEN } from 'ng2-adsense';
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
import { BehaviorSubject, of, throwError } from 'rxjs';
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
  startDate: '2026-03-02',
  finishDate: '2026-03-06',
  startDateOverride: null,
  finishDateOverride: null,
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
        {
          provide: ADSENSE_TOKEN,
          useValue: { adClient: 'ca-pub-0', adSlot: 0 },
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
      startDateOverride: null,
      finishDateOverride: null,
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

  it('should show "Edit Project" as card title when editing', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    component.onEditClick();
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('mat-card-title');
    expect(title?.textContent?.trim()).toBe('Edit Project');
  });

  it('should include an ad component', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const ad = fixture.nativeElement.querySelector('app-ad');
    expect(ad).toBeTruthy();
  });

  it('should include a sidebar ad component', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const sidebarAd = fixture.nativeElement.querySelector('app-sidebar-ad');
    expect(sidebarAd).toBeTruthy();
  });

  describe('project dates', () => {
    const baseFormValue = {
      name: 'Test Voron Build',
      reference: '',
      description: '',
      url: '',
      viewStatus: ProjectViewStatus.Private,
      startDateOverride: null,
      finishDateOverride: null,
    };

    beforeEach(async () => {
      // onStatusChange pipes the result, so a spy with no return value throws on undefined.
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
    });

    /**
     * The regression this whole task exists for. PUT is a full replace and onStatusChange
     * builds its payload independently of the edit form, so omitting the override fields
     * there wipes a user's manual dates every time they change a project's status.
     */
    it('preserves date overrides when only the status changes', () => {
      component.project.set({
        ...mockProject,
        startDateOverride: '2026-02-01',
        finishDateOverride: '2026-03-01',
      });

      component.onStatusChange(ProjectStatus.Complete);

      const dto = mockProjectService.updateProject.calls.mostRecent().args[1];
      expect(dto.startDateOverride).toBe('2026-02-01');
      expect(dto.finishDateOverride).toBe('2026-03-01');
    });

    it('leaves automatic dates automatic when only the status changes', () => {
      component.project.set({
        ...mockProject,
        startDateOverride: null,
        finishDateOverride: null,
      });

      component.onStatusChange(ProjectStatus.Complete);

      const dto = mockProjectService.updateProject.calls.mostRecent().args[1];
      expect(dto.startDateOverride).toBeNull();
      expect(dto.finishDateOverride).toBeNull();
    });

    it('forwards date overrides from the edit form on update', () => {
      component.project.set(mockProject);
      component.onEditClick();

      component.onSave({
        ...baseFormValue,
        startDateOverride: '2026-02-01',
        finishDateOverride: null,
      });

      const dto = mockProjectService.updateProject.calls.mostRecent().args[1];
      expect(dto.startDateOverride).toBe('2026-02-01');
      expect(dto.finishDateOverride).toBeNull();
    });

    /**
     * The date pickers make a 400 an ordinary outcome of this form rather than only a
     * server fault, so the save error has to reach the user. Swallowing it leaves the
     * form open, no longer spinning, with nothing said about why.
     */
    it('shows the API message when a save is rejected as an inverted range', async () => {
      const message =
        "A project's finish date cannot be before its start date.";
      mockProjectService.updateProject.and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: message,
            })
        )
      );

      component.project.set(mockProject);
      component.onEditClick();
      component.onSave({
        ...baseFormValue,
        startDateOverride: '2026-03-01',
        finishDateOverride: '2026-02-01',
      });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.saveErrorMessage()).toBe(message);
      expect(component.isSaving()).toBeFalse();
      // Stays open so the user can correct the dates rather than re-entering the whole form.
      expect(component.isEditing()).toBeTrue();

      const el = fixture.nativeElement.querySelector(
        '[data-cy="project-save-error"]'
      );
      expect(el.textContent.trim()).toBe(message);
    });

    it('falls back to generic copy for a non-400 save failure', async () => {
      mockProjectService.updateProject.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 500 }))
      );

      component.project.set(mockProject);
      component.onEditClick();
      component.onSave(baseFormValue);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.saveErrorMessage()).toBe(
        'This project could not be saved. Please try again.'
      );
    });

    it('clears a previous save error when the next save starts', async () => {
      mockProjectService.updateProject.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 400, error: 'nope' }))
      );
      component.project.set(mockProject);
      component.onEditClick();
      component.onSave(baseFormValue);
      await fixture.whenStable();
      expect(component.saveErrorMessage()).toBe('nope');

      mockProjectService.updateProject.and.returnValue(of(mockProject));
      component.onSave(baseFormValue);
      await fixture.whenStable();

      expect(component.saveErrorMessage()).toBe('');
    });

    it('renders the resolved dates', () => {
      component.project.set({
        ...mockProject,
        startDate: '2026-03-02',
        finishDate: '2026-03-06',
      });
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Mar 2, 2026');
      expect(text).toContain('Mar 6, 2026');
    });

    it('renders an em dash for a project with no finish date', () => {
      component.project.set({
        ...mockProject,
        startDate: '2026-03-02',
        finishDate: null,
      });
      fixture.detectChanges();

      const cell = fixture.nativeElement.querySelector(
        '[data-cy="project-finish-date"]'
      );
      expect(cell.textContent.trim()).toBe('\u2014');
    });

    it('does not shift the rendered day into the previous one', () => {
      // '2026-03-02' through a plain Date would parse as UTC midnight and render as Mar 1
      // for every viewer west of UTC.
      component.project.set({
        ...mockProject,
        startDate: '2026-03-02',
        finishDate: null,
      });
      fixture.detectChanges();

      const cell = fixture.nativeElement.querySelector(
        '[data-cy="project-start-date"]'
      );
      expect(cell.textContent.trim()).toBe('Mar 2, 2026');
    });
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
    mockProjectService.getProjectById.and.returnValue(
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
        {
          provide: ADSENSE_TOKEN,
          useValue: { adClient: 'ca-pub-0', adSlot: 0 },
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('should show "New Project" as card title in create mode', () => {
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('mat-card-title');
    expect(title?.textContent?.trim()).toBe('New Project');
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

  it('should navigate to /prints when onCancelEdit is called in create mode', () => {
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    component.onCancelEdit();
    expect(router.navigate).toHaveBeenCalledWith(['/prints']);
  });

  it('should call createProject with form values on save', async () => {
    mockProjectService.reorderImages.and.returnValue(of(void 0));

    component.onSave({
      name: 'My New Project',
      reference: '',
      description: '',
      url: '',
      viewStatus: ProjectViewStatus.Private,
      startDateOverride: null,
      finishDateOverride: null,
    });

    await fixture.whenStable();

    expect(mockProjectService.createProject).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'My New Project',
        status: ProjectStatus.InProgress,
        viewStatus: ProjectViewStatus.Private,
        startDateOverride: null,
        finishDateOverride: null,
      })
    );
  });

  it('forwards non-null date overrides from the create form', async () => {
    // Asserting only the null case would stay green even if both create-payload
    // assignments were deleted, since an absent key reads as undefined either way.
    mockProjectService.reorderImages.and.returnValue(of(void 0));

    component.onSave({
      name: 'Pinned Project',
      reference: '',
      description: '',
      url: '',
      viewStatus: ProjectViewStatus.Private,
      startDateOverride: '2026-02-01',
      finishDateOverride: '2026-03-01',
    });

    await fixture.whenStable();

    const dto = mockProjectService.createProject.calls.mostRecent().args[0];
    expect(dto.startDateOverride).toBe('2026-02-01');
    expect(dto.finishDateOverride).toBe('2026-03-01');
  });

  it('should exit edit mode, set the created project, and update the URL after successful creation', async () => {
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockProjectService.reorderImages.and.returnValue(of(void 0));

    component.onSave({
      name: 'My New Project',
      reference: '',
      description: '',
      url: '',
      viewStatus: ProjectViewStatus.Private,
      startDateOverride: null,
      finishDateOverride: null,
    });

    await fixture.whenStable();

    expect(component.isEditing()).toBe(false);
    expect(component.isSaving()).toBe(false);
    expect(component.project()?.id).toBe('new-guid-123');
    expect(component.isCreating()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/projects', 'new-guid-123'],
      { replaceUrl: true }
    );
  });
});
