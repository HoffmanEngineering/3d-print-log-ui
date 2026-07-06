import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { QrCodeService } from './qr-code.service';

/**
 * Simulates how the *production* build resolves `import('qrcode')`: the CommonJS
 * library is code-split into its own chunk that esbuild emits as a default-only
 * export, and the dynamically imported ESM namespace has a null prototype (so
 * `namespace.toString` is undefined, not Object.prototype.toString). Reproduces
 * the bug where the QR label dialog hung on "Generating QR Codes".
 */
@Injectable()
class ProdShapedQrCodeService extends QrCodeService {
  override importQrcode(): Promise<typeof import('qrcode')> {
    const api = {
      toString: () => Promise.resolve('<svg>default-export</svg>'),
      toDataURL: () => Promise.resolve('data:image/png;base64,default'),
    };
    // Default-only, null-prototype namespace (matches the split prod chunk).
    const ns = Object.assign(Object.create(null), { default: api });
    return Promise.resolve(ns as unknown as typeof import('qrcode'));
  }
}

describe('QrCodeService', () => {
  let service: QrCodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QrCodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('CommonJS default-export interop (production split chunk)', () => {
    it('unwraps .default so generateSvg resolves instead of hanging', async () => {
      const prodService = new ProdShapedQrCodeService();
      const svg = await prodService.generateSvg('https://example.com/x');
      expect(svg).toBe('<svg>default-export</svg>');
    });

    it('unwraps .default for generateDataUrl too', async () => {
      const prodService = new ProdShapedQrCodeService();
      const dataUrl = await prodService.generateDataUrl(
        'https://example.com/x'
      );
      expect(dataUrl).toBe('data:image/png;base64,default');
    });
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
