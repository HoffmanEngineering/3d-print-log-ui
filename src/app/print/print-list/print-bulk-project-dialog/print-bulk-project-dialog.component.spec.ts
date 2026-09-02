import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import {
  ProjectService,
  ProjectStatus,
  ProjectViewStatus,
} from 'src/app/core/services/project.service';
import { PrintBulkProjectDialogComponent } from './print-bulk-project-dialog.component';

describe('PrintBulkProjectDialogComponent', () => {
  let projectService: jasmine.SpyObj<ProjectService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PrintBulkProjectDialogComponent>>;

  beforeEach(async () => {
    projectService = jasmine.createSpyObj<ProjectService>('ProjectService', [
      'createProject',
      'getProjectSummaries',
    ]);
    // ProjectSelectorComponent calls getProjectSummaries on init and expects a PagedList.
    projectService.getProjectSummaries.and.returnValue(
      of({
        paging: { currentPage: 1, totalPages: 1, pageSize: 25, totalCount: 0 },
        items: [],
      })
    );
    dialogRef = jasmine.createSpyObj<
      MatDialogRef<PrintBulkProjectDialogComponent>
    >('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [PrintBulkProjectDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: ProjectService, useValue: projectService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { count: 3 } },
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(PrintBulkProjectDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('closes with the id when an existing project is chosen', async () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.onSelection({
      type: 'existing',
      projectId: 'existing-id',
      projectName: 'Benchies',
    });
    await component.confirm();

    expect(projectService.createProject).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({
      projectId: 'existing-id',
      projectName: 'Benchies',
      created: false,
    });
  });

  it('creates the project once when a new name is typed, then closes with its id', async () => {
    projectService.createProject.and.returnValue(
      of({ id: 'created-id', name: 'New Batch' } as never)
    );
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.onSelection({ type: 'new', newProjectName: 'New Batch' });
    await component.confirm();

    expect(projectService.createProject).toHaveBeenCalledTimes(1);
    expect(projectService.createProject).toHaveBeenCalledWith({
      name: 'New Batch',
      status: ProjectStatus.InProgress,
      viewStatus: ProjectViewStatus.Private,
      startDateOverride: null,
      finishDateOverride: null,
    });
    expect(dialogRef.close).toHaveBeenCalledWith({
      projectId: 'created-id',
      projectName: 'New Batch',
      created: true,
    });
  });

  it('keeps the dialog open and shows an error when creating the project fails', async () => {
    projectService.createProject.and.returnValue(
      throwError(() => new Error('boom'))
    );
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.onSelection({ type: 'new', newProjectName: 'New Batch' });
    await component.confirm();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('could not be created');
  });

  it('closes with a remove instruction', () => {
    const fixture = createComponent();

    fixture.componentInstance.removeFromProject();

    expect(dialogRef.close).toHaveBeenCalledWith({ remove: true });
  });
});
