import {
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
} from 'src/app/core/services/print.service';
import {
  FilamentPreferredDisplayResult,
  buildConversionFallbackTooltip,
  convertFilamentValue,
  getActualPreferredDisplay,
  getEstimatedPreferredDisplay,
  formatMilliliters,
  formatVolumeTotal,
  getFilamentPreferredDisplay,
  isVolumeUsage,
  volumeUsageTotal,
  withMilliliters,
} from './filament-display.utils';
import {
  estimateOnlyResinUsageRow,
  resinUsageRow,
  resinUsageRowWithGrams,
  unlinkedResinUsageRow,
} from 'src/app/print/testing/resin-print-fixtures';

const STANDARD_FILAMENT = {
  materialDensityGramPerCubicCm: 1.24,
  diameterMm: 1.75,
};

function makeFu(
  overrides: Partial<PrintFilamentSummaryDto> = {}
): PrintFilamentSummaryDto {
  return {
    id: 'test-id',
    filament: null,
    amountMg: 0,
    lengthInM: 0,
    volumeMl: 0,
    estimatedAmountMg: 0,
    estimatedLengthInM: 0,
    estimatedVolumeMl: 0,
    source: PrintFilamentSourceMeasurement.Weight,
    estimatedSource: PrintFilamentSourceMeasurement.Weight,
    ...overrides,
  };
}

describe('getFilamentPreferredDisplay', () => {
  // api#282: a bridge on a printer that can't measure reports the slicer's figure as the actual.
  describe('an actual figure marked as an estimate', () => {
    const fu = makeFu({
      amountMg: 12340,
      lengthInM: 4.1,
      actualIsEstimate: true,
      filament: STANDARD_FILAMENT as PrintFilamentSummaryDto['filament'],
    });

    it('shows the actual figure, marked as estimated', () => {
      const result = getFilamentPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.displayString).toBe('12.3g');
      expect(result.isEstimated).toBe(true);
    });

    it('stays marked when shown as recorded or converted', () => {
      expect(
        getFilamentPreferredDisplay(
          fu,
          PrintFilamentSourceMeasurement.AsRecorded
        )!.isEstimated
      ).toBe(true);
      expect(
        getFilamentPreferredDisplay(fu, PrintFilamentSourceMeasurement.Volume)!
          .isEstimated
      ).toBe(true);
      expect(
        getActualPreferredDisplay(fu, PrintFilamentSourceMeasurement.Weight)!
          .isEstimated
      ).toBe(true);
    });

    it('leaves a measured figure unmarked', () => {
      const measured = { ...fu, actualIsEstimate: false };
      expect(
        getFilamentPreferredDisplay(
          measured,
          PrintFilamentSourceMeasurement.Weight
        )!.isEstimated
      ).toBe(false);
    });
  });

  describe('preferred unit matches actual data', () => {
    it('returns weight when preferred=Weight and amountMg is set', () => {
      const fu = makeFu({
        amountMg: 25300,
        source: PrintFilamentSourceMeasurement.Weight,
      });
      const result = getFilamentPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.displayString).toBe('25.3g');
      expect(result.isEstimated).toBe(false);
      expect(result.isFallback).toBe(false);
      expect(result.fallbackTooltip).toBeNull();
    });

    it('returns length when preferred=Length and lengthInM is set', () => {
      const fu = makeFu({
        lengthInM: 5.2,
        source: PrintFilamentSourceMeasurement.Length,
      });
      const result = getFilamentPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Length
      )!;
      expect(result.displayString).toBe('5.2m');
      expect(result.isEstimated).toBe(false);
    });

    it('returns volume when preferred=Volume and volumeMl is set', () => {
      const fu = makeFu({
        volumeMl: 12.1,
        source: PrintFilamentSourceMeasurement.Volume,
      });
      const result = getFilamentPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Volume
      )!;
      expect(result.displayString).toBe('12.1mL');
    });
  });

  describe('preferred unit matches estimated data (no actual)', () => {
    it('returns estimated weight with isEstimated=true when only estimatedAmountMg is set', () => {
      const fu = makeFu({
        amountMg: 0,
        estimatedAmountMg: 10500,
        estimatedSource: PrintFilamentSourceMeasurement.Weight,
      });
      const result = getFilamentPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.displayString).toBe('10.5g');
      expect(result.isEstimated).toBe(true);
      expect(result.isFallback).toBe(false);
    });
  });

  describe('unit conversion when filament has density and diameter', () => {
    it('converts actual length to weight when preferred=Weight and filament data is available', () => {
      const fu = makeFu({
        amountMg: 0,
        estimatedAmountMg: 0,
        lengthInM: 10,
        source: PrintFilamentSourceMeasurement.Length,
        filament: STANDARD_FILAMENT as any,
      });
      const result = getFilamentPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.isFallback).toBe(false);
      expect(result.isEstimated).toBe(false);
      // 10m of 1.75mm PLA at 1.24 g/cm³ ≈ 29.8g = 29800mg
      const weightG = parseFloat(result.displayString);
      expect(weightG).toBeGreaterThan(29);
      expect(weightG).toBeLessThan(31);
    });

    it('converts estimated length to weight when preferred=Weight and filament data is available', () => {
      const fu = makeFu({
        estimatedLengthInM: 5,
        estimatedSource: PrintFilamentSourceMeasurement.Length,
        filament: STANDARD_FILAMENT as any,
      });
      const result = getFilamentPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.isFallback).toBe(false);
      expect(result.isEstimated).toBe(true);
    });
  });

  describe('preferred unit unavailable — fallback to source (no filament data)', () => {
    it('falls back to actual source length when preferred=Weight and no weight data and no filament', () => {
      const fu = makeFu({
        amountMg: 0,
        estimatedAmountMg: 0,
        lengthInM: 5.2,
        source: PrintFilamentSourceMeasurement.Length,
      });
      const result = getFilamentPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.displayString).toBe('5.2m');
      expect(result.isFallback).toBe(true);
      expect(result.isEstimated).toBe(false);
      expect(result.fallbackTooltip).toBe(
        'Weight unavailable — showing source unit (length)'
      );
    });

    it('falls back with a specific tooltip when filament has density but no diameter', () => {
      const fu = makeFu({
        amountMg: 0,
        estimatedAmountMg: 0,
        lengthInM: 5.2,
        source: PrintFilamentSourceMeasurement.Length,
        filament: {
          materialDensityGramPerCubicCm: 1.24,
          diameterMm: null,
        } as any,
      });
      const result = getFilamentPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.displayString).toBe('5.2m');
      expect(result.isFallback).toBe(true);
      expect(result.fallbackTooltip).toBe(
        'Cannot convert to weight — set filament diameter'
      );
    });

    it('falls back to estimated source length when preferred=Weight and no actual data and no filament', () => {
      const fu = makeFu({
        amountMg: 0,
        estimatedAmountMg: 0,
        lengthInM: 0,
        estimatedLengthInM: 3.1,
        source: PrintFilamentSourceMeasurement.Length,
        estimatedSource: PrintFilamentSourceMeasurement.Length,
      });
      const result = getFilamentPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.displayString).toBe('3.1m');
      expect(result.isFallback).toBe(true);
      expect(result.isEstimated).toBe(true);
    });
  });

  describe('buildConversionFallbackTooltip', () => {
    it('returns generic message when filament is null', () => {
      expect(
        buildConversionFallbackTooltip(
          PrintFilamentSourceMeasurement.Weight,
          PrintFilamentSourceMeasurement.Length,
          null
        )
      ).toBe('Weight unavailable — showing source unit (length)');
    });

    it('returns diameter-specific message when filament has density but no diameter', () => {
      expect(
        buildConversionFallbackTooltip(
          PrintFilamentSourceMeasurement.Weight,
          PrintFilamentSourceMeasurement.Length,
          { materialDensityGramPerCubicCm: 1.24, diameterMm: null }
        )
      ).toBe('Cannot convert to weight — set filament diameter');
    });

    it('returns density-specific message when filament has diameter but no density', () => {
      expect(
        buildConversionFallbackTooltip(
          PrintFilamentSourceMeasurement.Weight,
          PrintFilamentSourceMeasurement.Volume,
          { materialDensityGramPerCubicCm: null, diameterMm: 1.75 }
        )
      ).toBe('Cannot convert to weight — set filament density');
    });
  });

  describe('convertFilamentValue', () => {
    it('returns null when filament is null', () => {
      expect(
        convertFilamentValue(
          10,
          PrintFilamentSourceMeasurement.Length,
          PrintFilamentSourceMeasurement.Weight,
          null
        )
      ).toBeNull();
    });

    it('returns the value unchanged when fromUnit === toUnit', () => {
      expect(
        convertFilamentValue(
          5000,
          PrintFilamentSourceMeasurement.Weight,
          PrintFilamentSourceMeasurement.Weight,
          STANDARD_FILAMENT
        )
      ).toBe(5000);
    });

    it('converts length to weight (mg)', () => {
      const mg = convertFilamentValue(
        10,
        PrintFilamentSourceMeasurement.Length,
        PrintFilamentSourceMeasurement.Weight,
        STANDARD_FILAMENT
      )!;
      // 10m × π×(0.0875cm)² × 1.24 g/cm³ × 1000 ≈ 29826 mg
      expect(mg).toBeGreaterThan(29000);
      expect(mg).toBeLessThan(31000);
    });

    it('converts weight to length (m)', () => {
      const m = convertFilamentValue(
        29826,
        PrintFilamentSourceMeasurement.Weight,
        PrintFilamentSourceMeasurement.Length,
        STANDARD_FILAMENT
      )!;
      expect(m).toBeCloseTo(10, 0);
    });
  });

  describe('no data at all', () => {
    it('returns null when all values are zero', () => {
      const fu = makeFu();
      const result = getFilamentPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      );
      expect(result).toBeNull();
    });
  });

  describe('buildConversionFallbackTooltip — preferred equals source', () => {
    it('returns a non-self-referential message when preferred === source', () => {
      const tooltip = buildConversionFallbackTooltip(
        PrintFilamentSourceMeasurement.Volume,
        PrintFilamentSourceMeasurement.Volume,
        null
      );
      expect(tooltip).toBe('Volume data unavailable');
      expect(tooltip).not.toContain('showing source unit (volume)');
    });
  });

  describe('getActualPreferredDisplay', () => {
    it('returns direct actual match', () => {
      const fu = makeFu({
        amountMg: 25000,
        source: PrintFilamentSourceMeasurement.Weight,
      });
      const result = getActualPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.displayString).toBe('25.0g');
      expect(result.isFallback).toBe(false);
      expect(result.isEstimated).toBe(false);
    });

    it('converts actual source to preferred unit', () => {
      const fu = makeFu({
        lengthInM: 10,
        source: PrintFilamentSourceMeasurement.Length,
        filament: STANDARD_FILAMENT as any,
      });
      const result = getActualPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.isFallback).toBe(false);
      expect(parseFloat(result.displayString)).toBeGreaterThan(29);
    });

    it('falls back when conversion is not possible', () => {
      const fu = makeFu({
        lengthInM: 5,
        source: PrintFilamentSourceMeasurement.Length,
      });
      const result = getActualPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.displayString).toBe('5.0m');
      expect(result.isFallback).toBe(true);
    });

    it('returns null when no actual data', () => {
      const fu = makeFu({
        estimatedAmountMg: 10000,
        estimatedSource: PrintFilamentSourceMeasurement.Weight,
      });
      expect(
        getActualPreferredDisplay(fu, PrintFilamentSourceMeasurement.Weight)
      ).toBeNull();
    });
  });

  describe('getEstimatedPreferredDisplay', () => {
    it('returns direct estimated match', () => {
      const fu = makeFu({
        estimatedAmountMg: 15000,
        estimatedSource: PrintFilamentSourceMeasurement.Weight,
      });
      const result = getEstimatedPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.displayString).toBe('15.0g');
      expect(result.isEstimated).toBe(true);
      expect(result.isFallback).toBe(false);
    });

    it('converts estimated source to preferred unit', () => {
      const fu = makeFu({
        estimatedLengthInM: 5,
        estimatedSource: PrintFilamentSourceMeasurement.Length,
        filament: STANDARD_FILAMENT as any,
      });
      const result = getEstimatedPreferredDisplay(
        fu,
        PrintFilamentSourceMeasurement.Weight
      )!;
      expect(result.isEstimated).toBe(true);
      expect(result.isFallback).toBe(false);
    });

    it('returns null when no estimated data', () => {
      const fu = makeFu({
        amountMg: 10000,
        source: PrintFilamentSourceMeasurement.Weight,
      });
      expect(
        getEstimatedPreferredDisplay(fu, PrintFilamentSourceMeasurement.Weight)
      ).toBeNull();
    });
  });
});

// printlog-bridge#97: a resin row is measured in mL. Whatever unit the reader prefers, it shows
// mL and never a weight or length converted through the bottle's density or a filament diameter.
describe('volume-sourced (resin) usage', () => {
  const ALL_UNITS = [
    PrintFilamentSourceMeasurement.AsRecorded,
    PrintFilamentSourceMeasurement.Weight,
    PrintFilamentSourceMeasurement.Length,
    PrintFilamentSourceMeasurement.Volume,
  ];

  const variants: [string, PrintFilamentSummaryDto][] = [
    ['linked to a bottle', resinUsageRow()],
    ['with no bottle linked', unlinkedResinUsageRow()],
    ['with grams the API filled from density', resinUsageRowWithGrams()],
  ];

  for (const [name, fu] of variants) {
    describe(name, () => {
      for (const unit of ALL_UNITS) {
        it(`shows the actual in mL, marked estimated, for preferred unit ${unit}`, () => {
          const result = getFilamentPreferredDisplay(fu, unit)!;
          expect(result.displayString).toBe('42.5mL');
          expect(result.isEstimated).toBe(true);
          expect(result.isFallback).toBe(false);
          expect(result.fallbackTooltip).toBeNull();
        });

        it(`shows each side in mL for preferred unit ${unit}`, () => {
          expect(getActualPreferredDisplay(fu, unit)!.displayString).toBe(
            '42.5mL'
          );
          const estimate = getEstimatedPreferredDisplay(fu, unit)!;
          expect(estimate.displayString).toBe('40.0mL');
          expect(estimate.isFallback).toBe(false);
        });
      }
    });
  }

  it('shows an estimate-only row as its estimate in mL', () => {
    for (const unit of ALL_UNITS) {
      const result = getFilamentPreferredDisplay(
        estimateOnlyResinUsageRow(),
        unit
      )!;
      expect(result.displayString).toBe('40.0mL');
      expect(result.isEstimated).toBe(true);
      expect(result.isFallback).toBe(false);
    }
  });

  it('still converts a weight-sourced row to the preferred unit', () => {
    const fu = makeFu({
      amountMg: 12400,
      filament: STANDARD_FILAMENT as PrintFilamentSummaryDto['filament'],
    });
    expect(
      getFilamentPreferredDisplay(fu, PrintFilamentSourceMeasurement.Volume)!
        .displayString
    ).toBe('10.0mL');
  });
});

describe('isVolumeUsage', () => {
  it('is true for a resin row, linked or not, actual or estimate-only', () => {
    expect(isVolumeUsage(resinUsageRow())).toBe(true);
    expect(isVolumeUsage(unlinkedResinUsageRow())).toBe(true);
    expect(isVolumeUsage(estimateOnlyResinUsageRow())).toBe(true);
  });

  it('is false for a filament row', () => {
    expect(isVolumeUsage(makeFu({ amountMg: 1000 }))).toBe(false);
  });
});

describe('volumeUsageTotal', () => {
  it('sums the actual of each resin row, marked estimated when any is', () => {
    expect(
      volumeUsageTotal([resinUsageRow(), unlinkedResinUsageRow()])
    ).toEqual({ ml: 85, isEstimated: true });
  });

  it('takes the estimate of a row with no actual', () => {
    expect(
      volumeUsageTotal([
        resinUsageRow({ actualIsEstimate: false }),
        estimateOnlyResinUsageRow(),
      ])
    ).toEqual({ ml: 82.5, isEstimated: true });
  });

  it('is not estimated when every actual was measured', () => {
    expect(
      volumeUsageTotal([resinUsageRow({ actualIsEstimate: false })])
    ).toEqual({ ml: 42.5, isEstimated: false });
  });

  it('is null for no rows, or when any row is not volume-sourced', () => {
    expect(volumeUsageTotal([])).toBeNull();
    expect(volumeUsageTotal(undefined)).toBeNull();
    expect(
      volumeUsageTotal([resinUsageRow(), makeFu({ amountMg: 1000 })])
    ).toBeNull();
  });
});

describe('formatVolumeTotal', () => {
  it('formats mL with one decimal and an estimate marker', () => {
    expect(formatVolumeTotal({ ml: 85, isEstimated: true })).toBe('85.0 mL*');
    expect(formatVolumeTotal({ ml: 42.5, isEstimated: false })).toBe('42.5 mL');
  });
});

// 3d-print-log-api#294: the server's mL totals beside its gram totals.
describe('formatMilliliters', () => {
  it('formats mL with one decimal and a thousands separator', () => {
    expect(formatMilliliters(20)).toBe('20.0 mL');
    expect(formatMilliliters(72.75)).toBe('72.8 mL');
    expect(formatMilliliters(1234.5)).toBe('1,234.5 mL');
  });
});

describe('withMilliliters', () => {
  it('keeps the gram text alone when there is no resin', () => {
    expect(withMilliliters('34.0 kg', 34000, 0)).toBe('34.0 kg');
    expect(withMilliliters('34.0 kg', 34000, null)).toBe('34.0 kg');
    expect(withMilliliters('34.0 kg', 34000, undefined)).toBe('34.0 kg');
  });

  it('shows both when grams and mL are both recorded', () => {
    expect(withMilliliters('34.0 kg', 34000, 20)).toBe('34.0 kg · 20.0 mL');
  });

  it('shows mL only when there are no grams', () => {
    expect(withMilliliters('0 g', 0, 72.75)).toBe('72.8 mL');
    expect(withMilliliters('—', null, 72.75)).toBe('72.8 mL');
  });

  it('shows mL only when the caller knows the grams are the resin itself', () => {
    expect(withMilliliters('80 g', 80, 72.75, true)).toBe('72.8 mL');
  });

  it('keeps grams for a resin-only figure with no mL recorded', () => {
    expect(withMilliliters('80 g', 80, 0, true)).toBe('80 g');
  });
});
