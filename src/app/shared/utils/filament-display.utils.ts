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

export function getFilamentPreferredDisplay(
  fu: PrintFilamentSummaryDto,
  preferredUnit: PrintFilamentSourceMeasurement
): FilamentPreferredDisplayResult | null {
  const preferred = actualValue(fu, preferredUnit);
  if (preferred !== null) {
    return {
      displayString: formatValue(preferred, preferredUnit),
      isEstimated: false,
      isFallback: false,
      fallbackTooltip: null,
    };
  }

  const preferredEst = estimatedValue(fu, preferredUnit);
  if (preferredEst !== null) {
    return {
      displayString: formatValue(preferredEst, preferredUnit),
      isEstimated: true,
      isFallback: false,
      fallbackTooltip: null,
    };
  }

  const srcActual = actualValue(fu, fu.source);
  if (srcActual !== null) {
    const preferredLabel = UNIT_LABELS[preferredUnit];
    const sourceLabel = UNIT_LABELS[fu.source];
    return {
      displayString: formatValue(srcActual, fu.source),
      isEstimated: false,
      isFallback: true,
      fallbackTooltip: `${preferredLabel.charAt(0).toUpperCase()}${preferredLabel.slice(1)} unavailable — showing source unit (${sourceLabel})`,
    };
  }

  const srcEst = estimatedValue(fu, fu.estimatedSource);
  if (srcEst !== null) {
    const preferredLabel = UNIT_LABELS[preferredUnit];
    const sourceLabel = UNIT_LABELS[fu.estimatedSource];
    return {
      displayString: formatValue(srcEst, fu.estimatedSource),
      isEstimated: true,
      isFallback: true,
      fallbackTooltip: `${preferredLabel.charAt(0).toUpperCase()}${preferredLabel.slice(1)} unavailable — showing source unit (${sourceLabel})`,
    };
  }

  return null;
}
