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

export interface ActivitySeriesBucket {
  index: number;
  localStart: string;
  count: number;
  durationSeconds: number;
  materialMg: number;
  /** Null for the whole series when the server's cost row cap was exceeded. */
  cost: number | null;
}

export interface CalendarDay {
  date: string;
  count: number;
}

export interface StreakSummary {
  currentDays: number;
  longestDays: number;
  longestStart: string | null;
  longestEnd: string | null;
  busiestDate: string | null;
  busiestDateCount: number;
  /** 0-6, Sunday = 0. */
  busiestWeekday: number | null;
  busiestWeekdayCount: number;
}

export interface HistogramBucket {
  label: string;
  lowerSeconds: number;
  upperSeconds: number | null;
  count: number;
}

export interface MatrixCell {
  weekday: number;
  hour: number;
  count: number;
}

export interface ActivityResponse {
  from: string | null;
  to: string | null;
  timeZone: string;
  granularity: Exclude<AnalyticsGranularity, 'Auto'>;
  currency: string | null;
  series: ActivitySeriesBucket[];
  calendar: CalendarDay[];
  calendarFrom: string | null;
  calendarTo: string | null;
  streaks: StreakSummary;
  durationHistogram: HistogramBucket[];
  startTimeMatrix: MatrixCell[];
  coverage: Coverage;
}

export interface PrinterRow {
  printerId: number;
  name: string | null;
  isIdle: boolean;
  printCount: number;
  successRatePercent: number | null;
  printTimeSeconds: number;
  materialMg: number;
  avgDurationSeconds: number | null;
  cost: number | null;
  maintenanceCost: number | null;
  utilizationPercent: number | null;
  costPerPrintHour: number | null;
}

export interface PrinterSeriesBucket {
  index: number;
  localStart: string;
  /** Keyed by printer id as a string. */
  printSecondsByPrinterId: Record<string, number>;
}

export interface MaintenanceEvent {
  id: string;
  printerId: number;
  date: string;
  category: string | null;
  description: string | null;
  cost: number | null;
}

export interface PrintersResponse {
  from: string | null;
  to: string | null;
  timeZone: string;
  granularity: Exclude<AnalyticsGranularity, 'Auto'>;
  currency: string | null;
  printers: PrinterRow[];
  timeSeries: PrinterSeriesBucket[];
  fleetUtilizationPercent: Metric;
  maintenance: MaintenanceEvent[];
  coverage: Coverage;
}
