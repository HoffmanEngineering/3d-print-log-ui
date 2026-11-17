import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PrinterRow } from '../../models/analytics.models';
import { PrinterComparisonComponent } from './printer-comparison.component';
import { PrinterThumbnailStore } from 'src/app/core/stores/printer-thumbnail-store.service';

const row = (overrides: Partial<PrinterRow>): PrinterRow => ({
  printerId: 1,
  name: 'Ender 3',
  isIdle: false,
  printCount: 5,
  successRatePercent: 80,
  printTimeSeconds: 3600,
  materialMg: 50000,
  materialMl: 0,
  avgDurationSeconds: 720,
  cost: 12.5,
  maintenanceCost: 5,
  utilizationPercent: 10,
  costPerPrintHour: 5,
  ...overrides,
});

describe('PrinterComparisonComponent', () => {
  let fixture: ComponentFixture<PrinterComparisonComponent>;
  let component: PrinterComparisonComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrinterComparisonComponent, NoopAnimationsModule],
      providers: [
        // Stubbed: the real store would issue its own authenticated fetch.
        {
          provide: PrinterThumbnailStore,
          useValue: {
            thumbnailFor: vi
              .fn()
              .mockName('PrinterThumbnailStore.thumbnailFor'),
            invalidate: vi.fn().mockName('PrinterThumbnailStore.invalidate'),
            noteLoadFailure: vi
              .fn()
              .mockName('PrinterThumbnailStore.noteLoadFailure'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrinterComparisonComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('currency', 'USD');
    fixture.componentRef.setInput('layout', 'table');
  });

  it('sorts descending by print count by default', () => {
    fixture.componentRef.setInput('rows', [
      row({ printerId: 1, printCount: 2 }),
      row({ printerId: 2, printCount: 9 }),
    ]);
    fixture.detectChanges();

    expect(component.sorted().map((r) => r.printerId)).toEqual([2, 1]);
  });

  it('toggles direction when the same column is chosen twice', () => {
    fixture.componentRef.setInput('rows', [
      row({ printerId: 1, printCount: 2 }),
      row({ printerId: 2, printCount: 9 }),
    ]);
    fixture.detectChanges();

    component.sortBy('printCount');
    expect(component.sorted().map((r) => r.printerId)).toEqual([1, 2]);

    component.sortBy('printCount');
    expect(component.sorted().map((r) => r.printerId)).toEqual([2, 1]);
  });

  it('sorts nulls last in both directions', () => {
    fixture.componentRef.setInput('rows', [
      row({ printerId: 1, successRatePercent: null }),
      row({ printerId: 2, successRatePercent: 50 }),
    ]);
    fixture.detectChanges();

    component.sortBy('successRatePercent');
    expect(component.sorted()[1].printerId).toBe(1);

    component.sortBy('successRatePercent');
    // Still last: "no success rate" is not "the worst success rate".
    expect(component.sorted()[1].printerId).toBe(1);
  });

  it('renders a table when layout is table and a card list when it is cards', () => {
    fixture.componentRef.setInput('rows', [row({})]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('table.printer-comparison__table')
    ).toBeTruthy();

    fixture.componentRef.setInput('layout', 'cards');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('table.printer-comparison__table')
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.printer-comparison__card')
    ).toBeTruthy();
  });

  it('marks an idle printer explicitly rather than showing a row of zeroes', () => {
    fixture.componentRef.setInput('rows', [
      row({
        printerId: 3,
        isIdle: true,
        printCount: 0,
        successRatePercent: null,
      }),
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No prints in this range'
    );
  });

  it('emits the selected printer', () => {
    fixture.componentRef.setInput('rows', [row({ printerId: 7 })]);
    fixture.detectChanges();

    let emitted: {
      printerId: number;
    } | null = null;
    component.printerSelect.subscribe((event) => (emitted = event));

    component.onSelect(component.sorted()[0]);

    expect(emitted).toEqual({ printerId: 7 });
  });

  it('shows a printer avatar beside each printer name', () => {
    fixture.componentRef.setInput('rows', [row({ printerId: 7 })]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('th app-printer-avatar')
    ).toBeTruthy();
  });

  // 3d-print-log-api#294: a resin printer's material is in mL.
  describe('material column', () => {
    const cells = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          'tbody td'
        ) as NodeListOf<HTMLElement>
      ).map((td) => td.textContent?.trim());
    const headers = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          'thead th'
        ) as NodeListOf<HTMLElement>
      ).map((th) => th.textContent?.trim());

    it('keeps grams, and the Filament header, for a filament-only fleet', () => {
      fixture.componentRef.setInput('rows', [row({ materialMg: 50000 })]);
      fixture.detectChanges();

      expect(cells()).toContain('50 g');
      expect(fixture.nativeElement.textContent).not.toContain('mL');
      expect(headers()).toContain('Filament');
    });

    it('shows mL only for a resin printer', () => {
      fixture.componentRef.setInput('rows', [
        row({ printerId: 3, materialMg: 80025, materialMl: 72.75 }),
      ]);
      fixture.componentRef.setInput('resinPrinterIds', new Set([3]));
      fixture.detectChanges();

      expect(cells()).toContain('72.8 mL');
      expect(fixture.nativeElement.textContent).not.toContain('80 g');
      expect(headers()).toContain('Material');
    });

    it('shows mL only when a printer has no grams (an unlinked vat)', () => {
      fixture.componentRef.setInput('rows', [
        row({ materialMg: 0, materialMl: 7.5 }),
      ]);
      fixture.detectChanges();

      expect(cells()).toContain('7.5 mL');
      expect(fixture.nativeElement.textContent).not.toContain('0 g');
    });

    it('shows both for a printer that is not a resin printer', () => {
      fixture.componentRef.setInput('rows', [
        row({ materialMg: 34000000, materialMl: 20 }),
      ]);
      fixture.detectChanges();

      expect(cells()).toContain('34,000 g · 20.0 mL');
    });

    it('shows the same figure on the phone cards', () => {
      fixture.componentRef.setInput('layout', 'cards');
      fixture.componentRef.setInput('rows', [
        row({ printerId: 3, materialMg: 80025, materialMl: 72.75 }),
      ]);
      fixture.componentRef.setInput('resinPrinterIds', new Set([3]));
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('72.8 mL');
      expect(text).toContain('Material');
      expect(text).not.toContain('80 g');
    });
  });
});
