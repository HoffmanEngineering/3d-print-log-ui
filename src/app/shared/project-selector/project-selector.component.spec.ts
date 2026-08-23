import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
  tick,
} from '@angular/core/testing';
import { ProjectSelectorComponent } from './project-selector.component';
import {
  ProjectService,
  ProjectSummaryDto,
  ProjectDetailDto,
  ProjectStatus,
  ProjectViewStatus,
} from 'src/app/core/services/project.service';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ProjectSelectorComponent', () => {
  let fixture: ComponentFixture<ProjectSelectorComponent>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;

  const mockProjects: ProjectSummaryDto[] = [
    {
      id: 'abc',
      name: 'Voron Build',
      status: ProjectStatus.InProgress,
      viewStatus: ProjectViewStatus.Private,
      createdDate: new Date(),
      printCount: 3,
      totalPrintTimeInSeconds: 0,
      totalEstimatedPrintTimeInSeconds: 0,
      totalFilamentWeightMg: 0,
      defaultImageId: 0,
    },
  ];

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj<ProjectService>(
      'ProjectService',
      ['getProjectSummaries', 'getProjectById']
    );
    mockProjectService.getProjectSummaries.and.returnValue(
      of({
        items: mockProjects,
        paging: { totalCount: 1, currentPage: 1, pageSize: 25, totalPages: 1 },
      })
    );
    mockProjectService.getProjectById.and.returnValue(
      of({
        id: 'abc',
        name: 'Voron Build',
        status: ProjectStatus.InProgress,
      } as ProjectDetailDto)
    );

    await TestBed.configureTestingModule({
      imports: [
        ProjectSelectorComponent,
        ReactiveFormsModule,
        NoopAnimationsModule,
      ],
      providers: [{ provide: ProjectService, useValue: mockProjectService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectSelectorComponent);
    // detectChanges is called inside each fakeAsync test so timers register in the fake zone
  });

  it('should load active projects by default on init', fakeAsync(() => {
    fixture.detectChanges(); // triggers ngOnInit, registers debounce timer in fake zone
    tick(250);
    fixture.detectChanges();
    expect(mockProjectService.getProjectSummaries).toHaveBeenCalledWith(1, 25, {
      status: ProjectStatus.InProgress,
      sortBy: 'updatedDate',
    });
    expect(fixture.componentInstance.isDefaultView()).toBeTrue();
  }));

  it('should search all projects when user types', fakeAsync(() => {
    fixture.detectChanges();
    tick(250); // initial load
    fixture.componentInstance.searchControl.setValue('voron');
    tick(250); // debounce for search
    fixture.detectChanges();
    expect(mockProjectService.getProjectSummaries).toHaveBeenCalledWith(1, 25, {
      search: 'voron',
    });
    expect(fixture.componentInstance.isDefaultView()).toBeFalse();
  }));

  it('should reload defaults when search is cleared', fakeAsync(() => {
    fixture.detectChanges();
    tick(250); // initial load
    fixture.componentInstance.searchControl.setValue('voron');
    tick(250); // search
    fixture.componentInstance.searchControl.setValue('');
    tick(250); // reload defaults
    fixture.detectChanges();
    expect(fixture.componentInstance.isDefaultView()).toBeTrue();
    expect(
      mockProjectService.getProjectSummaries.calls.mostRecent().args
    ).toEqual([
      1,
      25,
      { status: ProjectStatus.InProgress, sortBy: 'updatedDate' },
    ]);
  }));

  it('should emit null when selection is cleared', fakeAsync(() => {
    fixture.detectChanges();
    tick(250); // initial load
    const emitted: any[] = [];
    fixture.componentInstance.projectSelected.subscribe((v: any) =>
      emitted.push(v)
    );
    fixture.componentInstance.clearProject();
    tick(250); // debounce from setValue('')
    expect(emitted[0]).toBeNull();
  }));

  it('should initialize selectedProject signal when initial project inputs are provided', fakeAsync(() => {
    fixture.componentRef.setInput('initialProjectId', 'abc');
    fixture.componentRef.setInput('initialProjectName', 'Voron Build');
    fixture.detectChanges();
    tick(250);

    const selected = fixture.componentInstance.selectedProject();
    expect(selected).not.toBeNull();
    expect(selected?.type).toBe('existing');
    if (selected?.type === 'existing') {
      expect(selected.projectId).toBe('abc');
      expect(selected.projectName).toBe('Voron Build');
    }
    expect(fixture.componentInstance.searchControl.value).toBe('Voron Build');
  }));

  it('should show clear button when initial project is provided', fakeAsync(() => {
    fixture.componentRef.setInput('initialProjectId', 'abc');
    fixture.componentRef.setInput('initialProjectName', 'Voron Build');
    fixture.detectChanges();
    tick(250);
    fixture.detectChanges();

    const clearButton = fixture.nativeElement.querySelector(
      'button[aria-label="Clear"]'
    );
    expect(clearButton).not.toBeNull();
  }));

  it('should fetch project by id and initialize when only initialProjectId is provided', fakeAsync(() => {
    fixture.componentRef.setInput('initialProjectId', 'abc');
    fixture.detectChanges();
    tick(250);
    fixture.detectChanges();

    expect(mockProjectService.getProjectById).toHaveBeenCalledWith('abc');
    const selected = fixture.componentInstance.selectedProject();
    expect(selected).not.toBeNull();
    expect(selected?.type).toBe('existing');
    if (selected?.type === 'existing') {
      expect(selected.projectId).toBe('abc');
      expect(selected.projectName).toBe('Voron Build');
    }
    expect(fixture.componentInstance.searchControl.value).toBe('Voron Build');
  }));

  it('should not overwrite text the user typed while the project name was still loading', fakeAsync(() => {
    // The print detail payload carries projectId but not projectName, so the name arrives
    // on a round trip that can land after the user has started typing. Prefilling then
    // splices the old name into the new one (#projects e2e).
    mockProjectService.getProjectById.and.returnValue(
      of({
        id: 'abc',
        name: 'Voron Build',
        status: ProjectStatus.InProgress,
      } as ProjectDetailDto).pipe(delay(100))
    );

    fixture.componentRef.setInput('initialProjectId', 'abc');
    fixture.detectChanges();

    // The user types before the name resolves.
    fixture.componentInstance.searchControl.markAsDirty();
    fixture.componentInstance.searchControl.setValue('Benchy Batch');

    tick(250);
    fixture.detectChanges();

    expect(fixture.componentInstance.searchControl.value).toBe('Benchy Batch');
  }));

  it('should clear selectedProject and emit null when clear button clicked after initial project', fakeAsync(() => {
    fixture.componentRef.setInput('initialProjectId', 'abc');
    fixture.componentRef.setInput('initialProjectName', 'Voron Build');
    fixture.detectChanges();
    tick(250);

    const emitted: any[] = [];
    fixture.componentInstance.projectSelected.subscribe((v: any) =>
      emitted.push(v)
    );
    fixture.componentInstance.clearProject();
    tick(250);

    expect(fixture.componentInstance.selectedProject()).toBeNull();
    expect(emitted[0]).toBeNull();
  }));

  it('reports a failed lookup and clears the message once a retry succeeds', fakeAsync(() => {
    // Without a handler the failure would leave an empty autocomplete with no
    // explanation, and the stream would be dead for the rest of the dialog's life.
    mockProjectService.getProjectSummaries.and.returnValue(
      throwError(() => new Error('boom'))
    );
    fixture.detectChanges();
    tick(250);

    expect(fixture.componentInstance.loadFailed()).toBeTrue();
    // A failed lookup returns an empty list, which must not be read as
    // "that name is free" - offering to create is how duplicates happen.
    expect(fixture.componentInstance.showNewOption()).toBeFalse();
    fixture.detectChanges();

    mockProjectService.getProjectSummaries.and.returnValue(
      of({
        paging: { currentPage: 1, totalPages: 1, pageSize: 25, totalCount: 1 },
        items: [{ id: 'p1', name: 'Recovered', status: 1 }],
      } as any)
    );
    const callsBefore = mockProjectService.getProjectSummaries.calls.count();

    // Clicked through the DOM on purpose. Calling retry() directly would pass
    // even with the button nested somewhere it cannot be reached.
    const retryButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-cy="project-lookup-retry"]'
    );
    expect(retryButton)
      .withContext('the retry control must be in the DOM')
      .toBeTruthy();
    retryButton.click();
    tick(250);

    expect(mockProjectService.getProjectSummaries.calls.count()).toBe(
      callsBefore + 1
    );
    expect(fixture.componentInstance.loadFailed()).toBeFalse();
    expect(fixture.componentInstance.filteredProjects().length).toBe(1);
  }));

  // Regression: typing a name that existing projects merely CONTAIN pushed the create
  // option below the fold of the panel, so it was never clicked, nothing was selected,
  // and the bulk dialog's confirm button stayed disabled with nothing explaining why.
  it('offers to create the typed name above the projects that contain it', fakeAsync(() => {
    mockProjectService.getProjectSummaries.and.returnValue(
      of({
        paging: { currentPage: 1, totalPages: 1, pageSize: 25, totalCount: 2 },
        items: [
          { id: 'p1', name: 'Test Project 2', status: 1 },
          { id: 'p2', name: 'Test Project 3', status: 1 },
        ],
      } as any)
    );
    fixture.detectChanges();

    fixture.componentInstance.searchControl.setValue('Test Project');
    tick(250);
    fixture.detectChanges();

    expect(fixture.componentInstance.showNewOption()).toBeTrue();

    // The panel only renders once it is open.
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-cy="project-selector-input"]'
    );
    input.dispatchEvent(new Event('focusin'));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const options = Array.from(
      document.querySelectorAll('mat-option')
    ) as HTMLElement[];
    expect(options.length).toBe(3);
    expect(options[0].textContent).toContain('Create project');
    expect(options[1].textContent).toContain('Test Project 2');

    flush();
  }));
});
