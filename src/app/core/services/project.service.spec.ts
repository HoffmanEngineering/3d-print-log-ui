import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  ProjectService,
  ProjectStatus,
  ProjectViewStatus,
  AddProjectDto,
} from './project.service';
import { environment } from 'src/environments/environment.unittest';

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProjectService],
    });
    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should create a project', () => {
    const dto: AddProjectDto = {
      name: 'Voron Build',
      status: ProjectStatus.InProgress,
      viewStatus: ProjectViewStatus.Private,
    };
    service.createProject(dto).subscribe((result) => {
      expect(result.name).toBe('Voron Build');
    });

    const req = httpMock.expectOne(
      `${environment.printLogApiUrl}/api/Projects`
    );
    expect(req.request.method).toBe('POST');
    req.flush({
      id: 'some-guid',
      name: 'Voron Build',
      status: 1,
      viewStatus: 3,
      printCount: 0,
    });
  });

  it('should get project summaries', () => {
    service.getProjectSummaries(1, 10).subscribe((result) => {
      expect(result.items.length).toBe(0);
    });
    const req = httpMock.expectOne((r) => r.url.includes('/api/Projects'));
    expect(req.request.method).toBe('GET');
    req.flush({
      items: [],
      paging: { totalCount: 0, pageNumber: 1, pageSize: 10 },
    });
  });

  describe('getProjectImage', () => {
    it('fetches image blob and returns base64 data URL', (done) => {
      const projectId = 'abc-123';
      const imageId = 7;
      const fakeBlob = new Blob(['fake'], { type: 'image/png' });

      service.getProjectImage(projectId, imageId).subscribe((result) => {
        expect(result).toContain('data:');
        done();
      });

      const req = httpMock.expectOne(
        `${environment.printLogApiUrl}/api/Projects/${projectId}/images/${imageId}`
      );
      expect(req.request.headers.has('allow-anonymous-request')).toBeTrue();
      req.flush(fakeBlob);
    });

    it('returns empty string on HTTP error', (done) => {
      service.getProjectImage('abc-123', 7).subscribe((result) => {
        expect(result).toBe('');
        done();
      });

      httpMock
        .expectOne(
          `${environment.printLogApiUrl}/api/Projects/abc-123/images/7`
        )
        .flush(new Blob(), { status: 404, statusText: 'Not Found' });
    });
  });
});
