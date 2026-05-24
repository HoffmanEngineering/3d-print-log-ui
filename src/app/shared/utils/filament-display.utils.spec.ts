import {
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
} from 'src/app/core/services/print.service';
import {
  FilamentPreferredDisplayResult,
  getFilamentPreferredDisplay,
} from './filament-display.utils';

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

  describe('preferred unit unavailable — fallback to source', () => {
    it('falls back to actual source length when preferred=Weight and no weight data', () => {
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

    it('falls back to estimated source length when preferred=Weight and no actual data', () => {
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
});
