import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import currency from 'currency.js';
import { FilamentUsageSummaryComponent } from './filament-usage-summary.component';
import {
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
  PrintService,
} from 'src/app/core/services/print.service';

describe('FilamentUsageSummaryComponent', () => {
  let fixture: ComponentFixture<FilamentUsageSummaryComponent>;

  beforeEach(async () => {
    const mockPrintService = jasmine.createSpyObj<PrintService>(
      'PrintService',
      ['calculatePrintCost']
    );
    mockPrintService.calculatePrintCost.and.returnValue({
      valid: true,
      price: currency(0),
      formattedPrice: '$0.00',
      symbol: '$',
      usesDefaultPrice: false,
    });

    await TestBed.configureTestingModule({
      imports: [FilamentUsageSummaryComponent, NoopAnimationsModule],
      providers: [{ provide: PrintService, useValue: mockPrintService }],
    }).compileComponents();

    fixture = TestBed.createComponent(FilamentUsageSummaryComponent);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('FilamentUsageSummaryComponent — preferred unit', () => {
    function makeFu(
      overrides: Partial<PrintFilamentSummaryDto> = {}
    ): PrintFilamentSummaryDto {
      return {
        id: 'abc',
        filament: null,
        amountMg: 0,
        lengthInM: 0,
        volumeMl: 0,
        estimatedAmountMg: 0,
        estimatedLengthInM: 0,
        estimatedVolumeMl: 0,
        source: PrintFilamentSourceMeasurement.Weight,
        estimatedSource: PrintFilamentSourceMeasurement.Weight,
        notes: '',
        ...overrides,
      };
    }

    it('displays weight when preferredUnit=Weight and amountMg is set', async () => {
      fixture.componentRef.setInput('filamentUsage', [
        makeFu({ amountMg: 25300 }),
      ]);
      fixture.componentRef.setInput(
        'preferredUnit',
        PrintFilamentSourceMeasurement.Weight
      );
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain('25.3g');
    });

    it('displays length when preferredUnit=Length and lengthInM is set', async () => {
      fixture.componentRef.setInput('filamentUsage', [
        makeFu({
          lengthInM: 5.2,
          source: PrintFilamentSourceMeasurement.Length,
        }),
      ]);
      fixture.componentRef.setInput(
        'preferredUnit',
        PrintFilamentSourceMeasurement.Length
      );
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain('5.2m');
    });

    it('displays source unit with * when weight is estimated', async () => {
      fixture.componentRef.setInput('filamentUsage', [
        makeFu({ estimatedAmountMg: 8000 }),
      ]);
      fixture.componentRef.setInput(
        'preferredUnit',
        PrintFilamentSourceMeasurement.Weight
      );
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain('8.0g');
      expect(fixture.nativeElement.textContent).toContain('*');
    });
  });
});
