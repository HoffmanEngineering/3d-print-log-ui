import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import {
  PendingSlicerUploadDto,
  SlicerUploadService,
  isValidSlicerInstallId,
} from './slicer-upload.service';

describe('SlicerUploadService', () => {
  let service: SlicerUploadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SlicerUploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gets the pending uploads for an install id', () => {
    const installId = '0123456789abcdef0123456789abcdef';
    const uploads: PendingSlicerUploadDto[] = [
      {
        settingId: 'abc',
        createdDate: '2026-10-17T12:00:00Z',
        printName: 'Benchy',
        fileName: 'benchy.gcode',
        estimatedPrintTimeSeconds: 3600,
        slicerVersion: '2.3.1',
        pluginVersion: 'orca-plugin/0.1.0',
        claimed: false,
      },
    ];
    let result: PendingSlicerUploadDto[] | undefined;

    service.getPendingUploads(installId).subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.printLogApiUrl}/api/Slicer/uploads/pending`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('installId')).toBe(installId);
    req.flush(uploads);

    expect(result).toEqual(uploads);
  });
});

describe('isValidSlicerInstallId', () => {
  it('accepts 32 lowercase hex characters', () => {
    expect(isValidSlicerInstallId('0123456789abcdef0123456789abcdef')).toBe(
      true
    );
  });

  it('rejects missing, short, long, uppercase and non-hex ids', () => {
    expect(isValidSlicerInstallId(null)).toBe(false);
    expect(isValidSlicerInstallId(undefined)).toBe(false);
    expect(isValidSlicerInstallId('')).toBe(false);
    expect(isValidSlicerInstallId('0123456789abcdef')).toBe(false);
    expect(isValidSlicerInstallId('0123456789abcdef0123456789abcdef0')).toBe(
      false
    );
    expect(isValidSlicerInstallId('0123456789ABCDEF0123456789ABCDEF')).toBe(
      false
    );
    expect(isValidSlicerInstallId('0123456789abcdeg0123456789abcdef')).toBe(
      false
    );
    expect(isValidSlicerInstallId('01234567-89ab-cdef-0123-456789abcdef')).toBe(
      false
    );
  });
});
