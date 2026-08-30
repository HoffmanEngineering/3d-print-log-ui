import { PrintFilamentSourceMeasurement } from 'src/app/core/services/print.service';
import { convertFilamentValue } from 'src/app/shared/utils/filament-display.utils';

/** The conversion inputs a filament contributes: density and diameter. */
export type ProjectionFilament = {
  materialDensityGramPerCubicCm?: number;
  diameterMm?: number;
} | null;

/**
 * One adjustment row, in whichever unit the user entered it. Weight is in
 * MILLIGRAMS here — the caller converts the form's grams before passing it in.
 */
export interface AdjustmentRow {
  source: PrintFilamentSourceMeasurement;
  amountMg?: number | null;
  lengthInM?: number | null;
  volumeMl?: number | null;
}

/**
 * Everything the projection needs, in each unit's native representation:
 * milligrams for weight, meters for length, milliliters for volume.
 *
 * The caller converts the form's grams to milligrams; this module never sees grams.
 */
export interface ProjectionInput {
  /** The server's own remaining figure. Null means the spool is untracked. */
  serverRemainingMg: number | null;
  serverNominalMg: number | null;
  formNominalMg: number | null;

  /**
   * Adjustment rows as saved and as they currently stand in the form. Compared
   * as summed milligrams, so an added, edited or removed row all fall out of the
   * same subtraction.
   */
  serverAdjustments: AdjustmentRow[];
  formAdjustments: AdjustmentRow[];

  /** Native-unit values, required only when `source` is Length or Volume. */
  serverNominalM?: number | null;
  formNominalM?: number | null;
  serverNominalMl?: number | null;
  formNominalMl?: number | null;

  source: PrintFilamentSourceMeasurement;

  /**
   * Conversion inputs as currently entered. `serverFilament` is what those
   * values were when the figures were last derived: when they differ, every
   * historical derived value would be recomputed on save, which the client does
   * not attempt to mirror.
   */
  filament: ProjectionFilament;
  serverFilament: ProjectionFilament;
}

export interface ProjectionResult {
  /** The server's value, passed through for display. */
  remainingMg: number | null;
  /** What remaining will be once the form is saved. Equals `remainingMg` when clean. */
  projectedMg: number | null;
  /** True when the edit cannot be converted, so the caller must not show an arrow. */
  isSuppressed: boolean;
}

/**
 * Projects the remaining weight as a DELTA against the server's own number.
 *
 * Recomputing the value from scratch would make the client a second source of
 * truth for a figure the server already sent, and the two formulas disagree in
 * at least two real cases: a stored nominal weight of 0 (which the form nulls
 * but the server treats as tracked) and the server's own rounding when it
 * derives milligrams for length- and volume-sourced spools. Starting from the
 * server's value and adding only the user's edits makes "clean equals server"
 * true by construction.
 */
export function projectRemainingMg(input: ProjectionInput): ProjectionResult {
  const remainingMg = input.serverRemainingMg ?? null;

  if (remainingMg === null) {
    return { remainingMg: null, projectedMg: null, isSuppressed: false };
  }

  // Editing density or diameter re-derives every stored milligram figure on
  // save, including historical adjustments. Mirroring that client-side would be
  // a second implementation of the server's conversion pipeline, so the
  // projection stands down instead.
  if (derivationInputsChanged(input)) {
    return { remainingMg, projectedMg: remainingMg, isSuppressed: true };
  }

  const nominalDelta = nominalDeltaMg(input);
  if (nominalDelta === null) {
    return { remainingMg, projectedMg: remainingMg, isSuppressed: true };
  }

  const formAdjustmentsMg = sumAdjustmentsMg(
    input.formAdjustments,
    input.filament
  );
  const serverAdjustmentsMg = sumAdjustmentsMg(
    input.serverAdjustments,
    input.filament
  );

  if (formAdjustmentsMg === null || serverAdjustmentsMg === null) {
    return { remainingMg, projectedMg: remainingMg, isSuppressed: true };
  }

  return {
    remainingMg,
    projectedMg:
      remainingMg + nominalDelta + (formAdjustmentsMg - serverAdjustmentsMg),
    isSuppressed: false,
  };
}

/**
 * True when the values the server derives milligrams from have been edited.
 * Only meaningful for length/volume adjustments and spools; a pure-weight spool
 * with no converted rows is unaffected by a density change.
 */
function derivationInputsChanged(input: ProjectionInput): boolean {
  const usesConversion =
    input.source !== PrintFilamentSourceMeasurement.Weight ||
    input.formAdjustments.some(
      (a) => a.source !== PrintFilamentSourceMeasurement.Weight
    ) ||
    input.serverAdjustments.some(
      (a) => a.source !== PrintFilamentSourceMeasurement.Weight
    );

  if (!usesConversion) {
    return false;
  }

  return (
    input.filament?.materialDensityGramPerCubicCm !==
      input.serverFilament?.materialDensityGramPerCubicCm ||
    input.filament?.diameterMm !== input.serverFilament?.diameterMm
  );
}

/**
 * Sums adjustment rows in milligrams, converting each row from ITS OWN source
 * unit. A length- or volume-sourced row's milligram field is the previous save's
 * server-derived value and is stale the moment the user edits the row, so it is
 * never read for those rows.
 *
 * Returns null when any row needs a conversion the filament cannot support.
 */
function sumAdjustmentsMg(
  rows: AdjustmentRow[],
  filament: ProjectionFilament
): number | null {
  let total = 0;

  for (const row of rows) {
    if (row.source === PrintFilamentSourceMeasurement.Length) {
      const mg = convertFilamentValue(
        row.lengthInM ?? 0,
        PrintFilamentSourceMeasurement.Length,
        PrintFilamentSourceMeasurement.Weight,
        filament
      );
      if (mg === null) return null;
      total += mg;
    } else if (row.source === PrintFilamentSourceMeasurement.Volume) {
      const mg = convertFilamentValue(
        row.volumeMl ?? 0,
        PrintFilamentSourceMeasurement.Volume,
        PrintFilamentSourceMeasurement.Weight,
        filament
      );
      if (mg === null) return null;
      total += mg;
    } else {
      total += row.amountMg ?? 0;
    }
  }

  return total;
}

/** Returns null when the spool's source unit cannot be converted to milligrams. */
function nominalDeltaMg(input: ProjectionInput): number | null {
  if (input.source === PrintFilamentSourceMeasurement.Length) {
    return nativeDeltaMg(
      input.serverNominalM,
      input.formNominalM,
      PrintFilamentSourceMeasurement.Length,
      input.filament
    );
  }

  if (input.source === PrintFilamentSourceMeasurement.Volume) {
    return nativeDeltaMg(
      input.serverNominalMl,
      input.formNominalMl,
      PrintFilamentSourceMeasurement.Volume,
      input.filament
    );
  }

  return (input.formNominalMg ?? 0) - (input.serverNominalMg ?? 0);
}

function nativeDeltaMg(
  serverValue: number | null | undefined,
  formValue: number | null | undefined,
  unit: PrintFilamentSourceMeasurement,
  filament: ProjectionFilament
): number | null {
  const delta = (formValue ?? 0) - (serverValue ?? 0);
  if (delta === 0) {
    return 0;
  }

  return convertFilamentValue(
    delta,
    unit,
    PrintFilamentSourceMeasurement.Weight,
    filament
  );
}
