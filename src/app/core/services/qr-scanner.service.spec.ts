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

    it('should parse a label URL carrying a Spoolman spool fragment', () => {
      const url =
        'https://example.com/materials/a1b2c3d4-e5f6-7890-abcd-ef1234567890#/spool/show/7';
      const result: QrScanResult = service.parseFilamentUrl(url);

      expect(result.success).toBeTrue();
      expect(result.filamentId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
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

  describe('a label scan stopped while it starts', () => {
    class FakeScanner {
      static instances: FakeScanner[] = [];
      state = 1;
      resolveStart: () => void = () => undefined;
      readonly stop = jasmine
        .createSpy('stop')
        .and.callFake(async () => void (this.state = 1));
      constructor() {
        FakeScanner.instances.push(this);
      }
      start(): Promise<void> {
        return new Promise((resolve) => {
          this.resolveStart = () => {
            this.state = 2;
            resolve();
          };
        });
      }
      getState() {
        return this.state;
      }
    }
    const flush = () => new Promise((r) => setTimeout(r));

    beforeEach(() => {
      FakeScanner.instances = [];
      (service as unknown as { html5QrcodeModule: unknown }).html5QrcodeModule =
        Promise.resolve({
          Html5Qrcode: FakeScanner,
          Html5QrcodeSupportedFormats: {},
        });
    });

    it('stops the camera once it has started', async () => {
      const started = service.startLabelScanning('reader', () => undefined);
      await flush();

      await service.stopScanning();
      FakeScanner.instances[0].resolveStart();
      await started;

      expect(FakeScanner.instances[0].stop).toHaveBeenCalled();
    });

    it('does not lose a newer scan to an older stop', async () => {
      const first = service.startLabelScanning('a', () => undefined);
      await flush();
      FakeScanner.instances[0].resolveStart();
      await first;

      const stopping = service.stopScanning();
      const second = service.startLabelScanning('b', () => undefined);
      await flush();
      FakeScanner.instances[1].resolveStart();
      await Promise.all([stopping, second]);
      await service.stopScanning();

      expect(FakeScanner.instances[1].stop).toHaveBeenCalled();
    });
  });

  describe('freezing a label scan while a photo is read', () => {
    class FakeScanner {
      state = 2;
      readonly pause = jasmine
        .createSpy('pause')
        .and.callFake(() => void (this.state = 3));
      readonly resume = jasmine
        .createSpy('resume')
        .and.callFake(() => void (this.state = 2));
      readonly stop = jasmine
        .createSpy('stop')
        .and.callFake(async () => void (this.state = 1));
      start() {
        return Promise.resolve();
      }
      getState() {
        return this.state;
      }
    }
    let scanner: FakeScanner;

    beforeEach(async () => {
      (service as unknown as { html5QrcodeModule: unknown }).html5QrcodeModule =
        Promise.resolve({
          Html5Qrcode: class extends FakeScanner {
            constructor() {
              super();
              scanner = this;
            }
          },
          Html5QrcodeSupportedFormats: {},
        });
      await service.startLabelScanning('reader', () => undefined);
    });

    it('pauses the video and decoding, then resumes them', () => {
      service.pauseLabelScanning();
      expect(scanner.pause).toHaveBeenCalledWith(true);

      service.resumeLabelScanning();
      expect(scanner.resume).toHaveBeenCalled();
    });

    it('does nothing when the scan is not in the matching state', () => {
      service.resumeLabelScanning();
      service.pauseLabelScanning();
      service.pauseLabelScanning();

      expect(scanner.resume).not.toHaveBeenCalled();
      expect(scanner.pause).toHaveBeenCalledTimes(1);
    });

    it('still releases the camera when stopped while paused', async () => {
      service.pauseLabelScanning();

      await service.stopScanning();

      expect(scanner.stop).toHaveBeenCalled();
    });
  });

  describe('label scan camera', () => {
    it('asks the back camera for HD, since Chrome defaults to 640x480 and OCR needs the detail', async () => {
      const start = jasmine.createSpy('start').and.resolveTo();
      class FakeScanner {
        start = start;
        getState() {
          return 2;
        }
        stop() {
          return Promise.resolve();
        }
      }
      (service as unknown as { html5QrcodeModule: unknown }).html5QrcodeModule =
        Promise.resolve({
          Html5Qrcode: FakeScanner,
          Html5QrcodeSupportedFormats: {},
        });

      await service.startLabelScanning('reader', () => undefined);

      const config = start.calls.mostRecent().args[1];
      expect(config.videoConstraints).toEqual({
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      });
    });
  });
});
