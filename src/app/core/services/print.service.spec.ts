import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { PrintService } from './print.service';

describe('PrintService', () => {
  let service: PrintService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PrintService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateElectricityCost', () => {
    it('returns invalid with empty message when printTimeSeconds is null', () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: null,
        kwhRate: '0.15',
        printerWattageW: 200,
        defaultWattageW: '150',
        currencySymbol: '$',
      });
      expect(result.valid).toBeFalse();
      expect((result as any).message).toBe('');
    });

    it('returns invalid with empty message when printTimeSeconds is 0', () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: 0,
        kwhRate: '0.15',
        printerWattageW: 200,
        defaultWattageW: '150',
        currencySymbol: '$',
      });
      expect(result.valid).toBeFalse();
      expect((result as any).message).toBe('');
    });

    it('returns invalid with rate message when kwhRate is null', () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: 3600,
        kwhRate: null,
        printerWattageW: 200,
        defaultWattageW: '150',
        currencySymbol: '$',
      });
      expect(result.valid).toBeFalse();
      expect((result as any).message).toBe('(Electricity rate not set)');
    });

    it('returns invalid with wattage message when both wattages are null', () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: 3600,
        kwhRate: '0.15',
        printerWattageW: null,
        defaultWattageW: null,
        currencySymbol: '$',
      });
      expect(result.valid).toBeFalse();
      expect((result as any).message).toBe('(Printer wattage not set)');
    });

    it('calculates correctly with printer wattage', () => {
      // 200W × 1h / 1000 × $0.15/kWh = $0.03
      const result = service.calculateElectricityCost({
        printTimeSeconds: 3600,
        kwhRate: '0.15',
        printerWattageW: 200,
        defaultWattageW: null,
        currencySymbol: '$',
      });
      expect(result.valid).toBeTrue();
      if (result.valid) {
        expect(result.cost.value).toBeCloseTo(0.03, 4);
        expect(result.usesDefaultWattage).toBeFalse();
        expect(result.wattageW).toBe(200);
        expect(result.printTimeHours).toBeCloseTo(1, 4);
      }
    });

    it('calculates correctly using default wattage when printer wattage is null', () => {
      // 150W × 2h / 1000 × $0.20/kWh = $0.06
      const result = service.calculateElectricityCost({
        printTimeSeconds: 7200,
        kwhRate: '0.20',
        printerWattageW: null,
        defaultWattageW: '150',
        currencySymbol: '$',
      });
      expect(result.valid).toBeTrue();
      if (result.valid) {
        expect(result.cost.value).toBeCloseTo(0.06, 4);
        expect(result.usesDefaultWattage).toBeTrue();
        expect(result.wattageW).toBe(150);
      }
    });
  });
});
