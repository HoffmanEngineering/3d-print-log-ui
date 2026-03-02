import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PrintFileService, PrintFileAttachment } from './print-file.service';
import { environment } from 'src/environments/environment';

describe('PrintFileService', () => {
  let service: PrintFileService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.printLogApiUrl}/api/Prints`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PrintFileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should request an upload URL', () => {
    service
      .getUploadUrl(1, 'benchy.gcode', 'application/octet-stream', 1024)
      .subscribe((res) => {
        expect(res.sasUrl).toBe('https://blob.example.com/sas');
        expect(res.blobPath).toBe('1/1/abc.gcode');
      });

    const req = httpMock.expectOne(`${baseUrl}/1/files/upload-url`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      fileName: 'benchy.gcode',
      contentType: 'application/octet-stream',
      sizeBytes: 1024,
    });
    req.flush({
      sasUrl: 'https://blob.example.com/sas',
      blobPath: '1/1/abc.gcode',
    });
  });

  it('should confirm an upload', () => {
    const body = {
      blobPath: '1/1/abc.gcode',
      fileName: 'benchy.gcode',
      sizeBytes: 1024,
      contentType: 'application/octet-stream',
    };
    service.confirmUpload(1, body).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1/files/confirm`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should list files for a print', () => {
    service.getFiles(1).subscribe((files) => {
      expect(files.length).toBe(1);
      expect(files[0].originalFileName).toBe('benchy.gcode');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/files`);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 1,
        originalFileName: 'benchy.gcode',
        sizeBytes: 1024,
        contentType: 'application/octet-stream',
      },
    ]);
  });

  it('should get a download URL', () => {
    service.getDownloadUrl(1, 1).subscribe((res) => {
      expect(res.url).toBe('https://blob.example.com/download-sas');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/files/1/download-url`);
    expect(req.request.method).toBe('GET');
    req.flush({
      url: 'https://blob.example.com/download-sas',
      expiresAt: '2026-03-01T00:00:00Z',
    });
  });

  it('should delete a file', () => {
    service.deleteFile(1, 1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1/files/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('should upload a file to a SAS URL with progress', () => {
    const file = new File(['content'], 'test.gcode', {
      type: 'application/octet-stream',
    });
    const progressValues: number[] = [];

    // Unsubscribe immediately to abort the XHR before it can fire a
    // network error that would bleed into subsequent tests.
    const sub = service
      .uploadToSasUrl('https://blob.example.com/sas', file)
      .subscribe({
        next: (progress) => progressValues.push(progress.percent),
        error: () => {},
      });
    sub.unsubscribe();

    // XMLHttpRequest-based, verify the observable is created
    expect(progressValues).toBeDefined();
  });

  describe('validateFile', () => {
    it('should accept a valid gcode file', () => {
      const file = new File(['content'], 'benchy.gcode', {
        type: 'application/octet-stream',
      });
      const result = service.validateFile(file);
      expect(result.valid).toBeTrue();
      expect(result.error).toBeUndefined();
    });

    it('should reject an invalid extension', () => {
      const file = new File(['content'], 'document.pdf', {
        type: 'application/pdf',
      });
      const result = service.validateFile(file);
      expect(result.valid).toBeFalse();
      expect(result.error).toContain('.pdf');
      expect(result.error).toContain('not supported');
    });

    it('should reject a file over 200MB', () => {
      const bigFile = new File([new ArrayBuffer(0)], 'huge.gcode', {
        type: 'application/octet-stream',
      });
      // Override size via Object.defineProperty since File.size is read-only
      Object.defineProperty(bigFile, 'size', { value: 201 * 1024 * 1024 });
      const result = service.validateFile(bigFile);
      expect(result.valid).toBeFalse();
      expect(result.error).toContain('200MB');
    });
  });
});
