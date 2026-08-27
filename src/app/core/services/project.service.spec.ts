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
  PutProjectDto,
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
      startDateOverride: null,
      finishDateOverride: null,
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

  describe('date overrides', () => {
    const basePutDto: PutProjectDto = {
      id: 'abc',
      name: 'Voron Build',
      status: ProjectStatus.InProgress,
      viewStatus: ProjectViewStatus.Private,
      startDateOverride: null,
      finishDateOverride: null,
    };

    it('sends date overrides in the update payload', () => {
      const dto: PutProjectDto = {
        ...basePutDto,
        startDateOverride: '2026-02-01',
        finishDateOverride: null,
      };

      service.updateProject('abc', dto).subscribe();

      const req = httpMock.expectOne(
        `${environment.printLogApiUrl}/api/Projects/abc`
      );
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.startDateOverride).toBe('2026-02-01');
      expect(req.request.body.finishDateOverride).toBeNull();
      req.flush({});
    });

    it('sends an explicit null rather than omitting the key when clearing', () => {
      service.updateProject('abc', { ...basePutDto }).subscribe();

      const req = httpMock.expectOne(
        `${environment.printLogApiUrl}/api/Projects/abc`
      );
      // PUT is a full replace: a payload that omits the key cannot clear an override, it
      // just leaves whatever the server already had.
      expect('startDateOverride' in req.request.body).toBeTrue();
      expect(req.request.body.startDateOverride).toBeNull();
      expect('finishDateOverride' in req.request.body).toBeTrue();
      expect(req.request.body.finishDateOverride).toBeNull();
      req.flush({});
    });

    it('sends overrides as YYYY-MM-DD strings, never as instants', () => {
      const dto: PutProjectDto = {
        ...basePutDto,
        startDateOverride: '2026-02-01',
        finishDateOverride: '2026-03-01',
      };

      service.updateProject('abc', dto).subscribe();

      const req = httpMock.expectOne(
        `${environment.printLogApiUrl}/api/Projects/abc`
      );
      // An ISO instant here would reintroduce the per-viewer day shift that carrying these
      // as civil dates exists to prevent.
      expect(req.request.body.startDateOverride).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(req.request.body.finishDateOverride).toMatch(
        /^\d{4}-\d{2}-\d{2}$/
      );
      req.flush({});
    });
  });
});
