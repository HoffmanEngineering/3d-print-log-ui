import { TestBed } from '@angular/core/testing';
import { QrScannerService, QrScanResult } from './qr-scanner.service';

describe('QrScannerService', () => {
  let service: QrScannerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QrScannerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('parseFilamentUrl', () => {
    it('should parse valid filament URL with lowercase GUID', () => {
      const url =
        'https://example.com/materials/a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const result: QrScanResult = service.parseFilamentUrl(url);

      expect(result.success).toBeTrue();
      expect(result.filamentId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(result.rawText).toBe(url);
      expect(result.error).toBeUndefined();
    });

    it('should parse valid filament URL with uppercase GUID', () => {
      const url =
        'https://example.com/materials/A1B2C3D4-E5F6-7890-ABCD-EF1234567890';
      const result: QrScanResult = service.parseFilamentUrl(url);

      expect(result.success).toBeTrue();
      expect(result.filamentId).toBe('A1B2C3D4-E5F6-7890-ABCD-EF1234567890');
      expect(result.rawText).toBe(url);
    });

    it('should parse valid filament URL with mixed case GUID', () => {
      const url =
        'https://example.com/materials/a1B2c3D4-e5F6-7890-AbCd-eF1234567890';
      const result: QrScanResult = service.parseFilamentUrl(url);

      expect(result.success).toBeTrue();
      expect(result.filamentId).toBe('a1B2c3D4-e5F6-7890-AbCd-eF1234567890');
    });

    it('should parse valid filament URL from different origins', () => {
      const urls = [
        'https://3dprintlog.com/materials/12345678-1234-1234-1234-123456789012',
        'http://localhost:4200/materials/12345678-1234-1234-1234-123456789012',
        'https://app.3dprintlog.com/materials/12345678-1234-1234-1234-123456789012',
      ];

      urls.forEach((url) => {
        const result = service.parseFilamentUrl(url);
        expect(result.success).toBeTrue();
        expect(result.filamentId).toBe('12345678-1234-1234-1234-123456789012');
      });
    });

    it('should return error for invalid URL format', () => {
      const result = service.parseFilamentUrl('not-a-url');

      expect(result.success).toBeFalse();
      expect(result.filamentId).toBeUndefined();
      expect(result.error).toBe(
        'This QR code is not a 3D Print Log filament label'
      );
      expect(result.rawText).toBe('not-a-url');
    });

    it('should return error for URL with wrong path', () => {
      const result = service.parseFilamentUrl(
        'https://example.com/filaments/12345678-1234-1234-1234-123456789012'
      );

      expect(result.success).toBeFalse();
      expect(result.filamentId).toBeUndefined();
      expect(result.error).toBe(
        'This QR code is not a 3D Print Log filament label'
      );
    });

    it('should return error for URL without ID', () => {
      const result = service.parseFilamentUrl('https://example.com/materials/');

      expect(result.success).toBeFalse();
      expect(result.filamentId).toBeUndefined();
      expect(result.error).toBe(
        'This QR code is not a 3D Print Log filament label'
      );
    });

    it('should return error for URL with invalid GUID format', () => {
      const result = service.parseFilamentUrl(
        'https://example.com/materials/not-a-guid'
      );

      expect(result.success).toBeFalse();
      expect(result.filamentId).toBeUndefined();
      expect(result.error).toBe(
        'This QR code is not a 3D Print Log filament label'
      );
    });

    it('should return error for URL with extra path segments', () => {
      const result = service.parseFilamentUrl(
        'https://example.com/materials/12345678-1234-1234-1234-123456789012/edit'
      );

      expect(result.success).toBeFalse();
      expect(result.filamentId).toBeUndefined();
      expect(result.error).toBe(
        'This QR code is not a 3D Print Log filament label'
      );
    });

    it('should handle URL with query parameters', () => {
      const url =
        'https://example.com/materials/12345678-1234-1234-1234-123456789012?source=label';
      const result = service.parseFilamentUrl(url);

      expect(result.success).toBeTrue();
      expect(result.filamentId).toBe('12345678-1234-1234-1234-123456789012');
    });

    it('should return error for empty string', () => {
      const result = service.parseFilamentUrl('');

      expect(result.success).toBeFalse();
      expect(result.error).toBe(
        'This QR code is not a 3D Print Log filament label'
      );
    });

    it('should return error for non-HTTP URL', () => {
      const result = service.parseFilamentUrl(
        'file:///materials/12345678-1234-1234-1234-123456789012'
      );

      expect(result.success).toBeTrue();
      expect(result.filamentId).toBe('12345678-1234-1234-1234-123456789012');
    });
  });

  describe('stopScanning', () => {
    it('should not throw when called without active scanner', async () => {
      await expectAsync(service.stopScanning()).toBeResolved();
    });
  });
});
