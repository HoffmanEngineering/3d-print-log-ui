import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import {
  PrintFilamentSourceMeasurement,
  PrintService,
  PrintStatus,
  PrintSummary,
} from 'src/app/core/services/print.service';
import { FilamentPrintRowComponent } from './filament-print-row.component';

const FILAMENT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

function usage(amountMg: number | undefined, estimatedAmountMg?: number) {
  return {
    id: 'usage-' + amountMg + '-' + estimatedAmountMg,
    filament: {
      id: FILAMENT_ID,
      materialDensityGramPerCubicCm: 1.24,
      diameterMm: 1.75,
    },
    amountMg,
    estimatedAmountMg,
    source: PrintFilamentSourceMeasurement.Weight,
    estimatedSource: PrintFilamentSourceMeasurement.Weight,
  } as never;
}

function printWith(
  usages: unknown[],
  overrides: Partial<PrintSummary> = {}
): PrintSummary {
  return {
    id: 7,
    title: 'Benchy',
    startDate: new Date('2026-07-30T10:00:00Z'),
    status: PrintStatus.Success,
    defaultPrintImageId: 3,
    filamentUsage: usages,
    ...overrides,
  } as PrintSummary;
}

describe('FilamentPrintRowComponent', () => {
  let fixture: ComponentFixture<FilamentPrintRowComponent>;

  beforeEach(async () => {
    const printService = jasmine.createSpyObj<PrintService>('PrintService', [
      'getPrintImage',
    ]);
    printService.getPrintImage.and.returnValue(of('data:image/png;base64,AAA'));

    await TestBed.configureTestingModule({
      imports: [FilamentPrintRowComponent],
      providers: [
        provideRouter([]),
        { provide: PrintService, useValue: printService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FilamentPrintRowComponent);
  });

  function render(print: PrintSummary): HTMLElement {
    fixture.componentRef.setInput('print', print);
    fixture.componentRef.setInput('filamentId', FILAMENT_ID);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('links to the print', () => {
    const el = render(printWith([usage(12_000)]));
    expect(el.querySelector('a')?.getAttribute('href')).toContain('/prints/7');
  });

  it('sums every usage row for this filament, not just the first', () => {
    const el = render(printWith([usage(12_000), usage(30_000)]));
    expect(el.textContent).toContain('42');
    expect(el.textContent).not.toContain('12 g');
  });

  it('ignores usage rows for other filaments', () => {
    const other = {
      ...(usage(99_000) as object),
      filament: { id: 'other' },
    } as never;
    const el = render(printWith([usage(12_000), other]));
    expect(el.textContent).toContain('12');
    expect(el.textContent).not.toContain('99');
  });

  it('marks estimated usage', () => {
    const el = render(printWith([usage(undefined, 12_000)]));
    expect(el.querySelector('.estimated-marker')).toBeTruthy();
  });

  it('sums a mixed actual and estimated pair', () => {
    // Resolving actual-else-estimated per row gives 12 + 30. Merging the rows'
    // columns first and preferring actual across the merge would show 12 alone.
    const el = render(printWith([usage(12_000), usage(undefined, 30_000)]));
    expect(el.textContent).toContain('42');
    expect(el.querySelector('.estimated-marker')).toBeTruthy();
  });

  it('does not mark a purely actual multi-row usage as estimated', () => {
    const el = render(printWith([usage(12_000), usage(30_000)]));
    expect(el.querySelector('.estimated-marker')).toBeFalsy();
  });

  it('sums rows recorded in different units', () => {
    // 12 g of actual weight plus a 10 m estimated length row. Totalling each
    // column separately and then formatting with the FIRST row's source unit
    // would report 12 g and silently drop the 10 m entirely.
    const lengthRow = {
      id: 'usage-length',
      filament: {
        id: FILAMENT_ID,
        materialDensityGramPerCubicCm: 1.24,
        diameterMm: 1.75,
      },
      estimatedLengthInM: 10,
      estimatedSource: PrintFilamentSourceMeasurement.Length,
      source: PrintFilamentSourceMeasurement.Length,
    } as never;

    const el = render(printWith([usage(12_000), lengthRow]));

    // 10 m of 1.75mm PLA is ~29.8 g, so the total is ~41.8 g, not 12 g.
    expect(el.textContent).not.toContain('12.0g');
    expect(el.textContent).toContain('41.8g');
  });

  it('sums rows that are all recorded as lengths', () => {
    const lengthRow = (m: number) =>
      ({
        id: 'usage-' + m,
        filament: {
          id: FILAMENT_ID,
          materialDensityGramPerCubicCm: 1.24,
          diameterMm: 1.75,
        },
        lengthInM: m,
        source: PrintFilamentSourceMeasurement.Length,
      }) as never;

    const el = render(printWith([lengthRow(4), lengthRow(6)]));

    // Preferred unit is Weight, so a combined 10 m converts to ~29.8 g.
    expect(el.textContent).toContain('29.8g');
  });

  it('renders a placeholder when the print has no image', () => {
    const el = render(printWith([usage(12_000)], { defaultPrintImageId: 0 }));
    expect(el.querySelector('.thumb-placeholder')).toBeTruthy();
  });
});
