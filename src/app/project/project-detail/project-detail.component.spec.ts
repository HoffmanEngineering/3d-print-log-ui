import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectDetailComponent } from './project-detail.component';
import {
  ProjectService,
  ProjectDetailDto,
  ProjectStatus,
  ProjectViewStatus,
} from 'src/app/core/services/project.service';
import { PrintService } from 'src/app/core/services/print.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
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
  let mockProjectService: jasmine.SpyObj<ProjectService>;

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj<ProjectService>(
      'ProjectService',
      ['getProjectById', 'deleteProject', 'updateProject']
    );
    mockProjectService.getProjectById.and.returnValue(of(mockProject));

    const mockPrintService = jasmine.createSpyObj('PrintService', [
      'getPrintSummaries',
    ]);
    mockPrintService.getPrintSummaries.and.returnValue(
      of({
        items: [],
        paging: { totalCount: 0, pageNumber: 1, pageSize: 100, totalPages: 0 },
      })
    );

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: PrintService, useValue: mockPrintService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: 'abc-123' } } },
        },
        {
          provide: MatDialog,
          useValue: jasmine.createSpyObj('MatDialog', ['open']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();
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
});
