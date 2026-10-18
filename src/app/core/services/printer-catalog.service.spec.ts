import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { PrinterCatalogService, PrinterModel } from './printer-catalog.service';

const base = `${environment.printLogApiUrl}/api/PrinterModels`;

const fullModel: PrinterModel = {
  id: 'bambu-lab-x1c',
  make: 'Bambu Lab',
  model: 'X1C',
  technology: 'FFF',
  bedWidthMm: 256,
  bedDepthMm: 256,
  bedHeightMm: 256,
  nozzleOptionsMm: [0.2, 0.4, 0.6],
  defaultNozzleMm: 0.4,
  filamentDiameterMm: 1.75,
  hasHeatedBed: true,
  hasHeatedChamber: false,
  extruderCount: 1,
  defaultSlotCount: 4,
};

describe('PrinterCatalogService', () => {
  let service: PrinterCatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PrinterCatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('search sends the query and limit, anonymously', () => {
    let result: PrinterModel[] | undefined;
    service.search('ender 3', 5).subscribe((r) => (result = r));

    const req = http.expectOne(
      (r) =>
        r.url === base &&
        r.params.get('search') === 'ender 3' &&
        r.params.get('limit') === '5'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('allow-anonymous-request')).toBe('true');
    req.flush([fullModel]);
    expect(result).toEqual([fullModel]);
  });

  it('search defaults the limit to 20', () => {
    service.search('x').subscribe();
    const req = http.expectOne((r) => r.url === base);
    expect(req.request.params.get('limit')).toBe('20');
    req.flush([]);
  });

  it('search maps a 500 to an empty list', () => {
    let result: PrinterModel[] | undefined;
    service.search('x').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url === base)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    expect(result).toEqual([]);
  });

  it('popular requests the popular endpoint with a limit and is fetched once for two subscribers', () => {
    const results: PrinterModel[][] = [];
    service.popular(8).subscribe((r) => results.push(r));
    service.popular(8).subscribe((r) => results.push(r));

    const req = http.expectOne((r) => r.url === `${base}/popular`);
    expect(req.request.params.get('limit')).toBe('8');
    expect(req.request.headers.get('allow-anonymous-request')).toBe('true');
    req.flush([fullModel]);
    expect(results).toEqual([[fullModel], [fullModel]]);
  });

  it('popular maps a 500 to an empty list', () => {
    let result: PrinterModel[] | undefined;
    service.popular().subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url === `${base}/popular`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    expect(result).toEqual([]);
  });

  it('get fetches by id, anonymously, and caches per id', () => {
    const results: (PrinterModel | null)[] = [];
    service.get('bambu-lab-x1c').subscribe((r) => results.push(r));
    service.get('bambu-lab-x1c').subscribe((r) => results.push(r));

    const req = http.expectOne(`${base}/bambu-lab-x1c`);
    expect(req.request.headers.get('allow-anonymous-request')).toBe('true');
    req.flush(fullModel);
    expect(results).toEqual([fullModel, fullModel]);
  });

  it('get maps a 404 to null', () => {
    let result: PrinterModel | null | undefined;
    service.get('nope').subscribe((r) => (result = r));
    http
      .expectOne(`${base}/nope`)
      .flush(
        { code: 'printer_model_not_found' },
        { status: 404, statusText: 'Not Found' }
      );
    expect(result).toBeNull();
  });

  it('get maps a 500 to null', () => {
    let result: PrinterModel | null | undefined;
    service.get('x').subscribe((r) => (result = r));
    http
      .expectOne(`${base}/x`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    expect(result).toBeNull();
  });

  it('match sends the name anonymously and returns the match', () => {
    let result: { id: string; confidence: string } | null | undefined;
    service.match('Prusa MK4').subscribe((r) => (result = r));
    const req = http.expectOne(
      (r) => r.url === `${base}/match` && r.params.get('name') === 'Prusa MK4'
    );
    expect(req.request.headers.get('allow-anonymous-request')).toBe('true');
    req.flush({ id: 'prusa-mk4', confidence: 'exact' });
    expect(result).toEqual({ id: 'prusa-mk4', confidence: 'exact' });
  });

  it('match maps a 204 to null', () => {
    let result: { id: string; confidence: string } | null | undefined;
    service.match('zzz').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url === `${base}/match`)
      .flush(null, { status: 204, statusText: 'No Content' });
    expect(result).toBeNull();
  });

  it('match maps a 500 to null', () => {
    let result: { id: string; confidence: string } | null | undefined;
    service.match('zzz').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url === `${base}/match`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    expect(result).toBeNull();
  });

  it('popular refetches after a failure, then caches a success', () => {
    const results: PrinterModel[][] = [];
    service.popular().subscribe((r) => results.push(r));
    http
      .expectOne((r) => r.url === `${base}/popular`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    service.popular().subscribe((r) => results.push(r));
    http.expectOne((r) => r.url === `${base}/popular`).flush([fullModel]);
    service.popular().subscribe((r) => results.push(r));
    http.expectNone((r) => r.url === `${base}/popular`);
    expect(results).toEqual([[], [fullModel], [fullModel]]);
  });

  it('get refetches after a 500', () => {
    const results: (PrinterModel | null)[] = [];
    service.get('x').subscribe((r) => results.push(r));
    http
      .expectOne(`${base}/x`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    service.get('x').subscribe((r) => results.push(r));
    http.expectOne(`${base}/x`).flush(fullModel);
    expect(results).toEqual([null, fullModel]);
  });

  it('get caches a 404 as null', () => {
    const results: (PrinterModel | null)[] = [];
    service.get('nope').subscribe((r) => results.push(r));
    http
      .expectOne(`${base}/nope`)
      .flush({}, { status: 404, statusText: 'Not Found' });
    service.get('nope').subscribe((r) => results.push(r));
    http.expectNone(`${base}/nope`);
    expect(results).toEqual([null, null]);
  });

  describe('specSummary', () => {
    it('omits the slot part for a single slot', () => {
      const m: PrinterModel = { ...fullModel, defaultSlotCount: 1 };
      expect(PrinterCatalogService.specSummary(m)).toBe(
        '256 × 256 × 256 mm · 0.4 mm nozzle · 1.75 mm · heated bed'
      );
    });

    it('an explicit slot count of 1 overrides a default of 4', () => {
      expect(PrinterCatalogService.specSummary(fullModel, undefined, 1)).toBe(
        '256 × 256 × 256 mm · 0.4 mm nozzle · 1.75 mm · heated bed'
      );
    });

    it('describes a full model', () => {
      expect(PrinterCatalogService.specSummary(fullModel)).toBe(
        '256 × 256 × 256 mm · 0.4 mm nozzle · 1.75 mm · heated bed · 4 slots'
      );
    });

    it('prefers the given nozzle and slot count', () => {
      expect(PrinterCatalogService.specSummary(fullModel, 0.6, 2)).toBe(
        '256 × 256 × 256 mm · 0.6 mm nozzle · 1.75 mm · heated bed · 2 slots'
      );
    });

    it('omits the bed when the model has none', () => {
      const partial: PrinterModel = {
        id: 'x',
        make: 'A',
        model: 'B',
        technology: 'FFF',
        defaultNozzleMm: 0.4,
        hasHeatedBed: true,
      };
      expect(PrinterCatalogService.specSummary(partial)).toBe(
        '0.4 mm nozzle · heated bed'
      );
    });

    it('describes a resin model without nozzle or filament', () => {
      const resin: PrinterModel = {
        id: 'elegoo-saturn-4',
        make: 'Elegoo',
        model: 'Saturn 4',
        technology: 'Resin',
        bedWidthMm: 218.88,
        bedDepthMm: 122.88,
        bedHeightMm: 220,
      };
      expect(PrinterCatalogService.specSummary(resin)).toBe(
        '218.88 × 122.88 × 220 mm'
      );
    });

    it('returns an empty string when nothing is known', () => {
      expect(
        PrinterCatalogService.specSummary({
          id: 'x',
          make: 'A',
          model: 'B',
          technology: 'FFF',
        })
      ).toBe('');
    });

    it('mentions a heated chamber', () => {
      expect(
        PrinterCatalogService.specSummary({
          id: 'x',
          make: 'A',
          model: 'B',
          technology: 'FFF',
          hasHeatedChamber: true,
        })
      ).toBe('heated chamber');
    });
  });
});
