import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectSelectorComponent } from './project-selector.component';
import {
  ProjectService,
  ProjectSummaryDto,
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
      ['getProjectSummaries']
    );
    mockProjectService.getProjectSummaries.and.returnValue(
      of({
        items: mockProjects,
        paging: { totalCount: 1, currentPage: 1, pageSize: 100, totalPages: 1 },
      })
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
    fixture.detectChanges();
  });

  it('should load projects on init', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(mockProjectService.getProjectSummaries).toHaveBeenCalled();
  });

  it('should emit null when selection is cleared', () => {
    const emitted: any[] = [];
    fixture.componentInstance.projectSelected.subscribe((v: any) =>
      emitted.push(v)
    );
    fixture.componentInstance.clearProject();
    expect(emitted[0]).toBeNull();
  });
});
