import {
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
} from '../../print.service';
import { OTHER_FILAMENT } from './print-detail-defaults';

/**
 * Cura and Creality Print write ";Filament used: 1.2m, 0.5m" — meters, one
 * entry per extruder. Returns one row per non-zero slot.
 */
export function parseCuraStyleFilamentUsage(
  value: string
): PrintFilamentSummaryDto[] {
  if (!value) {
    return [];
  }
  const usage: PrintFilamentSummaryDto[] = [];
  value.split(',').forEach((entry, i) => {
    const meters = +entry.trim().replace(/m$/i, '');
    if (!(meters > 0)) {
      return;
    }
    usage.push({
      id: null,
      filament: OTHER_FILAMENT,
      source: PrintFilamentSourceMeasurement.Length,
      estimatedSource: PrintFilamentSourceMeasurement.Length,
      estimatedLengthInM: +meters.toFixed(3),
      notes: `Slot ${i + 1}`,
    });
  });
  return usage;
}
