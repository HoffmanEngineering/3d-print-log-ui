import {
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
} from 'src/app/core/services/print.service';

export interface FilamentPreferredDisplayResult {
  displayString: string;
  isEstimated: boolean;
  isFallback: boolean;
  fallbackTooltip: string | null;
}

const UNIT_LABELS: Record<PrintFilamentSourceMeasurement, string> = {
  [PrintFilamentSourceMeasurement.AsRecorded]: 'source',
  [PrintFilamentSourceMeasurement.Weight]: 'weight',
  [PrintFilamentSourceMeasurement.Length]: 'length',
  [PrintFilamentSourceMeasurement.Volume]: 'volume',
};

function formatValue(
  value: number,
  unit: PrintFilamentSourceMeasurement
): string {
  if (unit === PrintFilamentSourceMeasurement.Weight)
    return `${(value / 1000).toFixed(1)}g`;
  if (unit === PrintFilamentSourceMeasurement.Length)
    return `${value.toFixed(1)}m`;
  return `${value.toFixed(1)}mL`;
}

/**
 * True when a usage row is measured in mL: a resin print (printlog-bridge#97), on either its
 * actual or its estimated side. Such a row always shows mL. Converting it to grams or meters
 * would go through the bottle's density or a filament diameter it does not have, and an
 * unlinked row has neither.
 */
export function isVolumeUsage(fu: PrintFilamentSummaryDto): boolean {
  return (
    fu.source === PrintFilamentSourceMeasurement.Volume ||
    fu.estimatedSource === PrintFilamentSourceMeasurement.Volume
  );
}

/** The unit a row is shown in: its own (as recorded) when it is measured in mL. */
function displayUnit(
  sourceIsVolume: boolean,
  preferredUnit: PrintFilamentSourceMeasurement
): PrintFilamentSourceMeasurement {
  return sourceIsVolume
    ? PrintFilamentSourceMeasurement.AsRecorded
    : preferredUnit;
}

export interface VolumeUsageTotal {
  ml: number;
  /** True when any row contributed its estimate, or an actual that is the slicer's figure. */
  isEstimated: boolean;
}

/**
 * The mL a print used, when every one of its rows is measured in mL; otherwise null, and the
 * caller shows its gram total. The server's gram total converts resin through the bottle's
 * density and counts an unlinked row as 0, so a resin print's total has to come from its rows.
 * Each row contributes its actual, else its estimate.
 */
export function volumeUsageTotal(
  rows: readonly PrintFilamentSummaryDto[] | null | undefined
): VolumeUsageTotal | null {
  if (!rows?.length || !rows.every(isVolumeUsage)) {
    return null;
  }
  let ml = 0;
  let isEstimated = false;
  for (const fu of rows) {
    const actual =
      fu.source === PrintFilamentSourceMeasurement.Volume
        ? (fu.volumeMl ?? 0)
        : 0;
    const estimate =
      fu.estimatedSource === PrintFilamentSourceMeasurement.Volume
        ? (fu.estimatedVolumeMl ?? 0)
        : 0;
    if (actual > 0) {
      ml += actual;
      isEstimated ||= fu.actualIsEstimate === true;
    } else if (estimate > 0) {
      ml += estimate;
      isEstimated = true;
    }
  }
  return { ml, isEstimated };
}

/** "85.0 mL", with a trailing `*` when estimated, as the list's total columns show it. */
export function formatVolumeTotal(total: VolumeUsageTotal): string {
  return `${total.ml.toFixed(1)} mL${total.isEstimated ? '*' : ''}`;
}

const ML_FORMAT = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** "20.0 mL", "1,234.5 mL": a server mL total (3d-print-log-api#294). */
export function formatMilliliters(ml: number): string {
  return `${ML_FORMAT.format(ml)} mL`;
}

/**
 * A server material total with its resin (3d-print-log-api#294). The server sums grams and
 * mL separately and never folds one into the other, and a resin row with a bottle linked
 * counts in both (its grams through the bottle's density). So:
 *
 * - no mL: the gram text, unchanged, so a filament-only user never sees "0 mL";
 * - mL and no grams, or grams the caller knows are the resin itself (`gramsAreResin`): mL only;
 * - otherwise both, "34.0 kg · 20.0 mL".
 *
 * `gramsText` is the caller's own formatting of `grams`, so each view keeps its gram style.
 */
export function withMilliliters(
  gramsText: string,
  grams: number | null | undefined,
  ml: number | null | undefined,
  gramsAreResin = false
): string {
  if (!ml || ml <= 0) {
    return gramsText;
  }
  if (gramsAreResin || !grams || grams <= 0) {
    return formatMilliliters(ml);
  }
  return `${gramsText} · ${formatMilliliters(ml)}`;
}

/** {@link volumeUsageTotal} formatted, or null for a print the caller totals in grams. */
export function volumeTotalLabel(
  rows: readonly PrintFilamentSummaryDto[] | null | undefined
): string | null {
  const total = volumeUsageTotal(rows);
  return total ? formatVolumeTotal(total) : null;
}

/**
 * The compact usage of a row measured in mL ("42.5mL", with `*` when estimated), for views
 * that otherwise show grams only. Null for any other row.
 */
export function volumeUsageLabel(fu: PrintFilamentSummaryDto): string | null {
  if (!isVolumeUsage(fu)) {
    return null;
  }
  const display = getFilamentPreferredDisplay(
    fu,
    PrintFilamentSourceMeasurement.AsRecorded
  );
  return display
    ? display.displayString + (display.isEstimated ? '*' : '')
    : null;
}

function actualValue(
  fu: PrintFilamentSummaryDto,
  unit: PrintFilamentSourceMeasurement
): number | null {
  if (unit === PrintFilamentSourceMeasurement.Weight)
    return (fu.amountMg ?? 0) > 0 ? fu.amountMg : null;
  if (unit === PrintFilamentSourceMeasurement.Length)
    return (fu.lengthInM ?? 0) > 0 ? fu.lengthInM : null;
  return (fu.volumeMl ?? 0) > 0 ? fu.volumeMl : null;
}

function estimatedValue(
  fu: PrintFilamentSummaryDto,
  unit: PrintFilamentSourceMeasurement
): number | null {
  if (unit === PrintFilamentSourceMeasurement.Weight)
    return (fu.estimatedAmountMg ?? 0) > 0 ? fu.estimatedAmountMg : null;
  if (unit === PrintFilamentSourceMeasurement.Length)
    return (fu.estimatedLengthInM ?? 0) > 0 ? fu.estimatedLengthInM : null;
  return (fu.estimatedVolumeMl ?? 0) > 0 ? fu.estimatedVolumeMl : null;
}

/**
 * Converts a filament quantity from one unit to another.
 * Input/output values use each unit's native representation:
 *   Weight → milligrams, Length → meters, Volume → millilitres.
 *
 * Density is required whenever Weight is involved.
 * Diameter is required whenever Length is involved.
 * Returns null when the required properties are missing on the filament.
 */
export function convertFilamentValue(
  value: number,
  fromUnit: PrintFilamentSourceMeasurement,
  toUnit: PrintFilamentSourceMeasurement,
  filament:
    | { materialDensityGramPerCubicCm?: number; diameterMm?: number }
    | null
    | undefined
): number | null {
  if (fromUnit === toUnit) return value;

  const density = filament?.materialDensityGramPerCubicCm;
  const diameterMm = filament?.diameterMm;

  const involvesLength =
    fromUnit === PrintFilamentSourceMeasurement.Length ||
    toUnit === PrintFilamentSourceMeasurement.Length;
  const involvesWeight =
    fromUnit === PrintFilamentSourceMeasurement.Weight ||
    toUnit === PrintFilamentSourceMeasurement.Weight;

  if (involvesWeight && !density) return null;
  if (involvesLength && !diameterMm) return null;

  const radiusCm = diameterMm ? diameterMm / 2 / 10 : 0;
  const crossSectionCm2 = diameterMm ? Math.PI * radiusCm * radiusCm : 0;

  // Normalize to volume in cm³ (= ml)
  let volumeCm3: number;
  if (fromUnit === PrintFilamentSourceMeasurement.Weight) {
    volumeCm3 = value / 1000 / density!; // mg → g → cm³
  } else if (fromUnit === PrintFilamentSourceMeasurement.Length) {
    volumeCm3 = crossSectionCm2 * (value * 100); // m → cm, cm × cm² = cm³
  } else {
    volumeCm3 = value; // ml = cm³
  }

  if (toUnit === PrintFilamentSourceMeasurement.Weight) {
    return volumeCm3 * density! * 1000; // cm³ → g → mg
  } else if (toUnit === PrintFilamentSourceMeasurement.Length) {
    return volumeCm3 / crossSectionCm2 / 100; // cm³ → cm → m
  } else {
    return volumeCm3; // ml
  }
}

/** Generates the fallback tooltip explaining why the preferred unit cannot be shown. */
export function buildConversionFallbackTooltip(
  preferredUnit: PrintFilamentSourceMeasurement,
  sourceUnit: PrintFilamentSourceMeasurement,
  filament:
    | { materialDensityGramPerCubicCm?: number; diameterMm?: number }
    | null
    | undefined
): string {
  const preferredLabel = UNIT_LABELS[preferredUnit];
  const sourceLabel = UNIT_LABELS[sourceUnit];

  if (preferredUnit === sourceUnit) {
    const cap =
      preferredLabel.charAt(0).toUpperCase() + preferredLabel.slice(1);
    return `${cap} data unavailable`;
  }

  if (filament) {
    const needsDensity =
      preferredUnit === PrintFilamentSourceMeasurement.Weight ||
      sourceUnit === PrintFilamentSourceMeasurement.Weight;
    const needsDiameter =
      preferredUnit === PrintFilamentSourceMeasurement.Length ||
      sourceUnit === PrintFilamentSourceMeasurement.Length;

    const missingDensity =
      needsDensity && !filament.materialDensityGramPerCubicCm;
    const missingDiameter = needsDiameter && !filament.diameterMm;

    if (missingDensity && missingDiameter) {
      return `Cannot convert to ${preferredLabel} — set filament density and diameter`;
    }
    if (missingDensity) {
      return `Cannot convert to ${preferredLabel} — set filament density`;
    }
    if (missingDiameter) {
      return `Cannot convert to ${preferredLabel} — set filament diameter`;
    }
  }

  const cap = preferredLabel.charAt(0).toUpperCase() + preferredLabel.slice(1);
  return `${cap} unavailable — showing source unit (${sourceLabel})`;
}

/**
 * Preferred-unit display for the actual filament data only. Marked estimated when the actual
 * figure itself is the slicer's estimate (`actualIsEstimate`, api#282).
 */
export function getActualPreferredDisplay(
  fu: PrintFilamentSummaryDto,
  preferredUnit: PrintFilamentSourceMeasurement
): FilamentPreferredDisplayResult | null {
  return markEstimatedActual(
    fu,
    actualPreferredDisplay(
      fu,
      displayUnit(
        fu.source === PrintFilamentSourceMeasurement.Volume,
        preferredUnit
      )
    )
  );
}

function actualPreferredDisplay(
  fu: PrintFilamentSummaryDto,
  preferredUnit: PrintFilamentSourceMeasurement
): FilamentPreferredDisplayResult | null {
  if (preferredUnit === PrintFilamentSourceMeasurement.AsRecorded) {
    const srcActual = actualValue(fu, fu.source);
    if (srcActual === null) return null;
    return {
      displayString: formatValue(srcActual, fu.source),
      isEstimated: false,
      isFallback: false,
      fallbackTooltip: null,
    };
  }

  const direct = actualValue(fu, preferredUnit);
  if (direct !== null) {
    return {
      displayString: formatValue(direct, preferredUnit),
      isEstimated: false,
      isFallback: false,
      fallbackTooltip: null,
    };
  }

  const srcActual = actualValue(fu, fu.source);
  if (srcActual !== null) {
    const converted = convertFilamentValue(
      srcActual,
      fu.source,
      preferredUnit,
      fu.filament
    );
    if (converted !== null) {
      return {
        displayString: formatValue(converted, preferredUnit),
        isEstimated: false,
        isFallback: false,
        fallbackTooltip: null,
      };
    }
    return {
      displayString: formatValue(srcActual, fu.source),
      isEstimated: false,
      isFallback: true,
      fallbackTooltip: buildConversionFallbackTooltip(
        preferredUnit,
        fu.source,
        fu.filament
      ),
    };
  }

  return null;
}

/** Preferred-unit display for the estimated filament data only. */
export function getEstimatedPreferredDisplay(
  fu: PrintFilamentSummaryDto,
  requestedUnit: PrintFilamentSourceMeasurement
): FilamentPreferredDisplayResult | null {
  const preferredUnit = displayUnit(
    fu.estimatedSource === PrintFilamentSourceMeasurement.Volume,
    requestedUnit
  );
  if (preferredUnit === PrintFilamentSourceMeasurement.AsRecorded) {
    const srcEst = estimatedValue(fu, fu.estimatedSource);
    if (srcEst === null) return null;
    return {
      displayString: formatValue(srcEst, fu.estimatedSource),
      isEstimated: true,
      isFallback: false,
      fallbackTooltip: null,
    };
  }

  const direct = estimatedValue(fu, preferredUnit);
  if (direct !== null) {
    return {
      displayString: formatValue(direct, preferredUnit),
      isEstimated: true,
      isFallback: false,
      fallbackTooltip: null,
    };
  }

  const srcEst = estimatedValue(fu, fu.estimatedSource);
  if (srcEst !== null) {
    const converted = convertFilamentValue(
      srcEst,
      fu.estimatedSource,
      preferredUnit,
      fu.filament
    );
    if (converted !== null) {
      return {
        displayString: formatValue(converted, preferredUnit),
        isEstimated: true,
        isFallback: false,
        fallbackTooltip: null,
      };
    }
    return {
      displayString: formatValue(srcEst, fu.estimatedSource),
      isEstimated: true,
      isFallback: true,
      fallbackTooltip: buildConversionFallbackTooltip(
        preferredUnit,
        fu.estimatedSource,
        fu.filament
      ),
    };
  }

  return null;
}

export function getFilamentPreferredDisplay(
  fu: PrintFilamentSummaryDto,
  preferredUnit: PrintFilamentSourceMeasurement
): FilamentPreferredDisplayResult | null {
  return markEstimatedActual(
    fu,
    preferredDisplay(fu, displayUnit(isVolumeUsage(fu), preferredUnit))
  );
}

/**
 * Every result built from the actual figure is `isEstimated: false`, and every one built from
 * the estimate is `true`, so an actual figure a connector reported as an estimate only needs the
 * flag turned on.
 */
function markEstimatedActual(
  fu: PrintFilamentSummaryDto,
  result: FilamentPreferredDisplayResult | null
): FilamentPreferredDisplayResult | null {
  return result && !result.isEstimated && fu.actualIsEstimate === true
    ? { ...result, isEstimated: true }
    : result;
}

function preferredDisplay(
  fu: PrintFilamentSummaryDto,
  preferredUnit: PrintFilamentSourceMeasurement
): FilamentPreferredDisplayResult | null {
  if (preferredUnit === PrintFilamentSourceMeasurement.AsRecorded) {
    const srcActual = actualValue(fu, fu.source);
    if (srcActual !== null) {
      return {
        displayString: formatValue(srcActual, fu.source),
        isEstimated: false,
        isFallback: false,
        fallbackTooltip: null,
      };
    }
    const srcEst = estimatedValue(fu, fu.estimatedSource);
    if (srcEst !== null) {
      return {
        displayString: formatValue(srcEst, fu.estimatedSource),
        isEstimated: true,
        isFallback: false,
        fallbackTooltip: null,
      };
    }
    return null;
  }

  // Direct match in actual data
  const preferred = actualValue(fu, preferredUnit);
  if (preferred !== null) {
    return {
      displayString: formatValue(preferred, preferredUnit),
      isEstimated: false,
      isFallback: false,
      fallbackTooltip: null,
    };
  }

  // Direct match in estimated data
  const preferredEst = estimatedValue(fu, preferredUnit);
  if (preferredEst !== null) {
    return {
      displayString: formatValue(preferredEst, preferredUnit),
      isEstimated: true,
      isFallback: false,
      fallbackTooltip: null,
    };
  }

  // Pre-compute source values for conversion attempts and fallback
  const srcActual = actualValue(fu, fu.source);
  const srcEst = estimatedValue(fu, fu.estimatedSource);

  // Try converting actual source value to preferred unit
  if (srcActual !== null) {
    const converted = convertFilamentValue(
      srcActual,
      fu.source,
      preferredUnit,
      fu.filament
    );
    if (converted !== null) {
      return {
        displayString: formatValue(converted, preferredUnit),
        isEstimated: false,
        isFallback: false,
        fallbackTooltip: null,
      };
    }
  }

  // Try converting estimated source value to preferred unit
  if (srcEst !== null) {
    const converted = convertFilamentValue(
      srcEst,
      fu.estimatedSource,
      preferredUnit,
      fu.filament
    );
    if (converted !== null) {
      return {
        displayString: formatValue(converted, preferredUnit),
        isEstimated: true,
        isFallback: false,
        fallbackTooltip: null,
      };
    }
  }

  // Fallback: show source unit as-is with an informative tooltip
  if (srcActual !== null) {
    return {
      displayString: formatValue(srcActual, fu.source),
      isEstimated: false,
      isFallback: true,
      fallbackTooltip: buildConversionFallbackTooltip(
        preferredUnit,
        fu.source,
        fu.filament
      ),
    };
  }

  if (srcEst !== null) {
    return {
      displayString: formatValue(srcEst, fu.estimatedSource),
      isEstimated: true,
      isFallback: true,
      fallbackTooltip: buildConversionFallbackTooltip(
        preferredUnit,
        fu.estimatedSource,
        fu.filament
      ),
    };
  }

  return null;
}
