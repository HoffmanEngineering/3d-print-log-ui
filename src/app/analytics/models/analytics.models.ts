import { PrintStatus } from 'src/app/core/services/print.service';

export type AnalyticsGranularity = 'Auto' | 'Day' | 'Week' | 'Month';

/** Mirrors the API's AnalyticsFilter. Dates are ISO strings on the wire. */
export interface AnalyticsFilterValue {
  fromDate: string | null;
  toDate: string | null;
  timeZone: string;
  printerIds: number[];
  filamentIds: string[];
  projectIds: string[];
  statuses: PrintStatus[];
  granularity: AnalyticsGranularity;
  comparePrevious: boolean;
}

export const ExclusionReason = {
  Undated: 'Undated',
  DurationEstimated: 'DurationEstimated',
  MaterialEstimated: 'MaterialEstimated',
  PriceMissing: 'PriceMissing',
  CurrencyMismatch: 'CurrencyMismatch',
  WattageMissing: 'WattageMissing',
  RateMissing: 'RateMissing',
  OutlierExcluded: 'OutlierExcluded',
  SampleTooSmall: 'SampleTooSmall',
  RowCapExceeded: 'RowCapExceeded',
  DurationMissing: 'DurationMissing',
  WindowTruncated: 'WindowTruncated',
  UnattributedMaterial: 'UnattributedMaterial',
} as const;

export interface CoverageExclusion {
  reason: string;
  count: number;
}

export interface Coverage {
  population: string;
  counted: number;
  total: number;
  undatedCount: number;
  exclusions: CoverageExclusion[];
}

export interface Metric {
  value: number | null;
  previous: number | null;
  coverage: Coverage;
}

export interface MoneyMetric {
  value: number | null;
  previous: number | null;
  currency: string | null;
  coverage: Coverage;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface SeriesBucket {
  index: number;
  localStart: string;
  countsByStatus: Record<string, number>;
}

export interface HighlightRef {
  id: string | null;
  label: string | null;
  value: number | null;
  unit: string | null;
}

export interface OverviewTiles {
  printCount: Metric;
  successRatePercent: Metric;
  filamentGrams: Metric;
  printTimeSeconds: Metric;
  totalCost: MoneyMetric;
  avgPrintTimeSeconds: Metric;
}

export interface OverviewResponse {
  from: string | null;
  to: string | null;
  timeZone: string;
  granularity: Exclude<AnalyticsGranularity, 'Auto'>;
  tiles: OverviewTiles;
  statusBreakdown: StatusCount[];
  series: SeriesBucket[];
  highlights: {
    mostUsedPrinter: HighlightRef | null;
    mostUsedMaterial: HighlightRef | null;
    longestPrint: HighlightRef | null;
    priciestPrint: HighlightRef | null;
  };
}
