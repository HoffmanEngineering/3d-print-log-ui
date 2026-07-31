import { Coverage } from 'src/app/analytics/models/analytics.models';

export function formatCoverageNote(
  coverage: Coverage | null | undefined
): string | null {
  if (!coverage || coverage.exclusions.length === 0) return null;

  const printCount = (count: number) =>
    `${count} print${count === 1 ? '' : 's'}`;
  const labels: Record<string, (count: number) => string> = {
    MaterialEstimated: (count) =>
      `${printCount(count)} use estimated material amounts`,
    DurationEstimated: (count) =>
      `${printCount(count)} use estimated print durations`,
    CurrencyMismatch: (count) =>
      `${count} spool${count === 1 ? '' : 's'} excluded — different currency`,
    PriceMissing: (count) => `${printCount(count)} have no material price set`,
    WattageMissing: () => 'Printer wattage is not set',
    RateMissing: () => 'Electricity rate is not set',
    RowCapExceeded: () => 'Too many prints to cost precisely in this range',
    OutlierExcluded: (count) =>
      `${count} outlier${count === 1 ? '' : 's'} excluded`,
    SampleTooSmall: () => 'Not enough data yet',
    Undated: (count) => `${printCount(count)} have no date`,
    DurationMissing: (count) =>
      `${printCount(count)} ${count === 1 ? 'has' : 'have'} no recorded duration`,
    WindowTruncated: () => 'Showing the most recent 53 weeks',
    UnattributedMaterial: (count) =>
      `${printCount(count)} used filament that is not linked to a spool, so it is not in these groups`,
  };

  return coverage.exclusions
    .map(
      (exclusion) =>
        labels[exclusion.reason]?.(exclusion.count) ??
        `${exclusion.reason}: ${exclusion.count}`
    )
    .join(' · ');
}
