import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
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
      providers: [
        { provide: PrintService, useValue: mockPrintService },
        // routerLink only activates on the linkFilaments path, so the router
        // was never needed until this component could render an anchor.
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FilamentUsageSummaryComponent);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('fail-closed link and price gating', () => {
    // `source` is required: getFilamentPreferredDisplay resolves the recorded
    // value via actualValue(fu, fu.source), so an undefined source renders an
    // empty usage cell and the assertions below would pass vacuously.
    const usageWithFilament = {
      filament: {
        id: 'f1',
        displayName: 'Test Filament',
        colorName: 'Fire Red',
        colors: ['c62828'],
        colorPattern: 1,
        finishType: 1,
        effects: [],
      },
      amountMg: 1000,
      source: PrintFilamentSourceMeasurement.Weight,
      estimatedSource: PrintFilamentSourceMeasurement.Weight,
    } as any;

    it('renders filament names as plain text by default', () => {
      fixture.componentRef.setInput('filamentUsage', [usageWithFilament]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('a')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Test Filament');
    });

    it('links filament names when linkFilaments is true', () => {
      fixture.componentRef.setInput('filamentUsage', [usageWithFilament]);
      fixture.componentRef.setInput('linkFilaments', true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('a')).toBeTruthy();
    });

    it('omits the price column by default', () => {
      fixture.componentRef.setInput('filamentUsage', [usageWithFilament]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.price-cell')).toBeNull();
    });

    it('renders the price column when showPrices is true', () => {
      fixture.componentRef.setInput('filamentUsage', [usageWithFilament]);
      fixture.componentRef.setInput('showPrices', true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.price-cell')).toBeTruthy();
    });
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
