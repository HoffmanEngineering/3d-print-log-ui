import { TestBed } from '@angular/core/testing';
import { QrCodeService } from './qr-code.service';

describe('QrCodeService', () => {
  let service: QrCodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QrCodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateSvg', () => {
    it('should generate a valid SVG string', async () => {
      const data = 'https://example.com/test';
      const svg = await service.generateSvg(data);

      expect(svg).toBeTruthy();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('should respect custom options', async () => {
      const data = 'https://example.com/test';
      const svg = await service.generateSvg(data, {
        width: 100,
        margin: 2,
      });

      expect(svg).toBeTruthy();
      expect(svg).toContain('<svg');
    });
  });

  describe('generateDataUrl', () => {
    it('should generate a valid data URL', async () => {
      const data = 'https://example.com/test';
      const dataUrl = await service.generateDataUrl(data);

      expect(dataUrl).toBeTruthy();
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('generateFilamentUrl', () => {
    it('should generate a URL with the filament ID', () => {
      const filamentId = 'abc-123-def';
      const url = service.generateFilamentUrl(filamentId);

      expect(url).toContain('/materials/abc-123-def');
      expect(url).toContain(window.location.origin);
    });

    it('should handle different filament IDs', () => {
      const filamentId1 = 'id-1';
      const filamentId2 = 'id-2';

      const url1 = service.generateFilamentUrl(filamentId1);
      const url2 = service.generateFilamentUrl(filamentId2);

      expect(url1).toContain('/materials/id-1');
      expect(url2).toContain('/materials/id-2');
      expect(url1).not.toEqual(url2);
    });
  });
});
