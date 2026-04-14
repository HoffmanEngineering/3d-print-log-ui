import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrintGroupedViewComponent } from './print-grouped-view.component';
import { ProjectService } from 'src/app/core/services/project.service';
import { PrintService } from 'src/app/core/services/print.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('PrintGroupedViewComponent', () => {
  let fixture: ComponentFixture<PrintGroupedViewComponent>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockPrintService: jasmine.SpyObj<PrintService>;

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj<ProjectService>(
      'ProjectService',
      ['getGroupedFeed']
    );
    mockProjectService.getGroupedFeed.and.returnValue(
      of({
        items: [],
        paging: { totalCount: 0, currentPage: 1, pageSize: 20, totalPages: 0 },
      })
    );

    mockPrintService = jasmine.createSpyObj<PrintService>('PrintService', [
      'getPrintSummaries',
    ]);

    await TestBed.configureTestingModule({
      imports: [PrintGroupedViewComponent, NoopAnimationsModule],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: PrintService, useValue: mockPrintService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintGroupedViewComponent);
    fixture.detectChanges();
  });

  it('should call getGroupedFeed on init', () => {
    expect(mockProjectService.getGroupedFeed).toHaveBeenCalledWith(1, 20);
  });

  it('should display empty state when no items', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No prints yet');
  });
});
