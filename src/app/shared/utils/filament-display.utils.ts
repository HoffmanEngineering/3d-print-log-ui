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
  return `${value.toFixed(1)}ml`;
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

  // Normalise to volume in cm³ (= ml)
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

/** Preferred-unit display for the actual (non-estimated) filament data only. */
export function getActualPreferredDisplay(
  fu: PrintFilamentSummaryDto,
  preferredUnit: PrintFilamentSourceMeasurement
): FilamentPreferredDisplayResult | null {
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
  preferredUnit: PrintFilamentSourceMeasurement
): FilamentPreferredDisplayResult | null {
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
