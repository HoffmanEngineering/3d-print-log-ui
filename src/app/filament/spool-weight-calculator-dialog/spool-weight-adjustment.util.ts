export interface SpoolAdjustmentResult {
  /** Remaining filament weight implied by the measurement (mg). */
  measuredRemainingMg: number;
  /** The adjustment to add so tracked remaining matches the measurement (mg). */
  adjustmentMg: number;
  /** True when the measurement implies a negative remaining amount. */
  negativeRemaining: boolean;
}

/**
 * Resolve the empty spool weight in mg, preferring the stored value and
 * falling back to (initial total - initial nominal). Returns null when no
 * strictly-positive value can be resolved.
 */
export function resolveSpoolWeightMg(
  spoolWeightMg: number | null | undefined,
  initialTotalWeightMg: number | null | undefined,
  initialNominalWeightMg: number | null | undefined
): number | null {
  if (spoolWeightMg != null && spoolWeightMg > 0) {
    return spoolWeightMg;
  }

  if (initialTotalWeightMg != null && initialNominalWeightMg != null) {
    const derived = initialTotalWeightMg - initialNominalWeightMg;
    if (derived > 0) {
      return derived;
    }
  }

  return null;
}

/**
 * Compute the weight adjustment needed to reconcile the tracked remaining
 * with a measured total spool weight. All values in milligrams.
 */
export function calculateSpoolAdjustment(
  measuredTotalWeightMg: number,
  spoolWeightMg: number,
  filamentRemainingMg: number
): SpoolAdjustmentResult {
  const measuredRemainingMg = measuredTotalWeightMg - spoolWeightMg;
  const adjustmentMg = measuredRemainingMg - filamentRemainingMg;

  return {
    measuredRemainingMg,
    adjustmentMg,
    negativeRemaining: measuredRemainingMg < 0,
  };
}
