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
  getFilamentPreferredDisplay,
} from './filament-display.utils';

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
      expect(result.isEstimated).toBeFalse();
      expect(result.isFallback).toBeFalse();
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
      expect(result.isEstimated).toBeFalse();
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
      expect(result.displayString).toBe('12.1ml');
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
      expect(result.isEstimated).toBeTrue();
      expect(result.isFallback).toBeFalse();
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
      expect(result.isFallback).toBeFalse();
      expect(result.isEstimated).toBeFalse();
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
      expect(result.isFallback).toBeFalse();
      expect(result.isEstimated).toBeTrue();
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
      expect(result.isFallback).toBeTrue();
      expect(result.isEstimated).toBeFalse();
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
      expect(result.isFallback).toBeTrue();
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
      expect(result.isFallback).toBeTrue();
      expect(result.isEstimated).toBeTrue();
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
      expect(result.isFallback).toBeFalse();
      expect(result.isEstimated).toBeFalse();
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
      expect(result.isFallback).toBeFalse();
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
      expect(result.isFallback).toBeTrue();
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
      expect(result.isEstimated).toBeTrue();
      expect(result.isFallback).toBeFalse();
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
      expect(result.isEstimated).toBeTrue();
      expect(result.isFallback).toBeFalse();
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
