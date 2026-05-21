import {
  ComponentFixture,
  TestBed,
  fakeAsync,
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
import { of } from 'rxjs';
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
});
