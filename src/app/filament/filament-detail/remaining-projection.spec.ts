import { PrintFilamentSourceMeasurement } from 'src/app/core/services/print.service';
import {
  AdjustmentRow,
  ProjectionInput,
  projectRemainingMg,
} from './remaining-projection';

const PLA = { materialDensityGramPerCubicCm: 1.24, diameterMm: 1.75 };

/** Milligrams in ten meters of 1.75mm PLA, via the same geometry the helper uses. */
const TEN_METERS_MG = 10 * Math.PI * (1.75 / 2 / 10) ** 2 * 100 * 1.24 * 1000;

function baseInput(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  return {
    serverRemainingMg: 412_000,
    serverNominalMg: 1_000_000,
    formNominalMg: 1_000_000,
    serverAdjustments: [],
    formAdjustments: [],
    source: PrintFilamentSourceMeasurement.Weight,
    filament: PLA,
    serverFilament: PLA,
    ...overrides,
  };
}

function weightAdjustment(amountMg: number): AdjustmentRow {
  return { source: PrintFilamentSourceMeasurement.Weight, amountMg };
}

describe('projectRemainingMg', () => {
  it('returns the server value unchanged when nothing was edited', () => {
    const result = projectRemainingMg(baseInput());
    expect(result.projectedMg).toBe(412_000);
    expect(result.isSuppressed).toBeFalse();
  });

  it('returns the server value when the stored nominal weight is zero', () => {
    // The form nulls a nominal weight that is not > 0, but the server still
    // reports a tracked remaining. An absolute recomputation would yield null here.
    const result = projectRemainingMg(
      baseInput({
        serverNominalMg: 0,
        formNominalMg: null,
        serverRemainingMg: -50_000,
      })
    );
    expect(result.projectedMg).toBe(-50_000);
  });

  it('adds an unsaved adjustment', () => {
    const result = projectRemainingMg(
      baseInput({ formAdjustments: [weightAdjustment(-32_000)] })
    );
    expect(result.projectedMg).toBe(380_000);
  });

  it('ignores an adjustment that was already saved', () => {
    const saved = weightAdjustment(-32_000);
    const result = projectRemainingMg(
      baseInput({ serverAdjustments: [saved], formAdjustments: [saved] })
    );
    expect(result.projectedMg).toBe(412_000);
  });

  it('subtracts a removed adjustment', () => {
    const result = projectRemainingMg(
      baseInput({
        serverAdjustments: [weightAdjustment(-32_000)],
        formAdjustments: [],
      })
    );
    expect(result.projectedMg).toBe(444_000);
  });

  it('converts a length-sourced adjustment row rather than reading its stale milligrams', () => {
    const result = projectRemainingMg(
      baseInput({
        formAdjustments: [
          {
            source: PrintFilamentSourceMeasurement.Length,
            lengthInM: 10,
            // Stale: what the server derived for a DIFFERENT length last save.
            amountMg: 999_999,
          },
        ],
      })
    );
    expect(result.projectedMg).toBeCloseTo(412_000 + TEN_METERS_MG, 0);
    expect(result.projectedMg).not.toBeCloseTo(412_000 + 999_999, 0);
  });

  it('suppresses the projection when density or diameter were edited', () => {
    const result = projectRemainingMg(
      baseInput({
        source: PrintFilamentSourceMeasurement.Length,
        serverNominalM: 330,
        formNominalM: 330,
        filament: { materialDensityGramPerCubicCm: 1.3, diameterMm: 1.75 },
        serverFilament: PLA,
      })
    );
    expect(result.isSuppressed).toBeTrue();
    expect(result.projectedMg).toBe(412_000);
  });

  it('does not suppress on a density edit when nothing needs converting', () => {
    const result = projectRemainingMg(
      baseInput({
        filament: { materialDensityGramPerCubicCm: 1.3, diameterMm: 1.75 },
        serverFilament: PLA,
        formAdjustments: [weightAdjustment(-32_000)],
      })
    );
    expect(result.isSuppressed).toBeFalse();
    expect(result.projectedMg).toBe(380_000);
  });

  it('tracks an edited nominal weight', () => {
    const result = projectRemainingMg(baseInput({ formNominalMg: 1_200_000 }));
    expect(result.projectedMg).toBe(612_000);
  });

  it('is null when the server reports an untracked spool', () => {
    const result = projectRemainingMg(
      baseInput({
        serverRemainingMg: null,
        serverNominalMg: null,
        formNominalMg: null,
      })
    );
    expect(result.projectedMg).toBeNull();
    expect(result.remainingMg).toBeNull();
  });

  it('converts a length-sourced spool edit to milligrams', () => {
    const result = projectRemainingMg(
      baseInput({
        source: PrintFilamentSourceMeasurement.Length,
        serverNominalM: 330,
        formNominalM: 340,
      })
    );
    expect(result.projectedMg).toBeCloseTo(412_000 + TEN_METERS_MG, 0);
  });

  it('suppresses the projection when an edit needs a conversion density cannot support', () => {
    const noDensity = { diameterMm: 1.75 };
    const result = projectRemainingMg(
      baseInput({
        source: PrintFilamentSourceMeasurement.Length,
        filament: noDensity,
        serverFilament: noDensity,
        serverNominalM: 330,
        formNominalM: 340,
      })
    );
    expect(result.isSuppressed).toBeTrue();
    expect(result.projectedMg).toBe(412_000);
  });

  it('does not suppress an untouched spool whose density is missing', () => {
    // Nothing was edited, so no conversion is attempted and there is nothing to
    // warn about. Showing "updates after saving" on a pristine form would be noise.
    const noDensity = { diameterMm: 1.75 };
    const result = projectRemainingMg(
      baseInput({
        source: PrintFilamentSourceMeasurement.Length,
        filament: noDensity,
        serverFilament: noDensity,
        serverNominalM: 330,
        formNominalM: 330,
      })
    );
    expect(result.isSuppressed).toBeFalse();
    expect(result.projectedMg).toBe(412_000);
  });

  it('suppresses when a volume-sourced adjustment cannot be converted', () => {
    const noDensity = { diameterMm: 1.75 };
    const result = projectRemainingMg(
      baseInput({
        filament: noDensity,
        serverFilament: noDensity,
        formAdjustments: [
          { source: PrintFilamentSourceMeasurement.Volume, volumeMl: 25 },
        ],
      })
    );
    expect(result.isSuppressed).toBeTrue();
    expect(result.projectedMg).toBe(412_000);
  });

  it('treats an AsRecorded adjustment as a weight row rather than coercing it away', () => {
    const result = projectRemainingMg(
      baseInput({
        formAdjustments: [
          {
            source: PrintFilamentSourceMeasurement.AsRecorded,
            amountMg: -32_000,
          },
        ],
      })
    );
    expect(result.isSuppressed).toBeFalse();
    expect(result.projectedMg).toBe(380_000);
  });
});
