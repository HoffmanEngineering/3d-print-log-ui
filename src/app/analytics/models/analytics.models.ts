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

export interface SwatchDto {
  colors: string[];
  colorPattern: number;
  finishType: number;
  effects: number[];
}

export interface MaterialGroup {
  key: string;
  label: string;
  printCount: number;
  /** Print consumption only. A group only ever weighed in has 0 here and 0 prints. */
  materialMg: number;
  swatch: SwatchDto;
  /**
   * Net filament adjustments (inventory corrections such as weigh-ins) for this group, in CONSUMPTION
   * terms: positive means filament was removed, negative means it was added back, so it can be
   * below zero. Note this is the opposite sign of the spool weight calculator's adjustment.
   * Optional: an API older than #231 does not send it, and the UI may deploy first. Read it
   * through `adjustmentMgOf`, which treats a missing value as 0.
   */
  adjustmentMg?: number;
}

export interface MaterialSeriesBucket {
  index: number;
  localStart: string;
  /** Print consumption only; adjustments are the separate {@link adjustmentMg}. */
  materialMgByType: Record<string, number>;
  /**
   * Net filament adjustments (inventory corrections such as weigh-ins) logged in this period, in CONSUMPTION
   * terms: positive means filament was removed, negative means it was added back, so it can be
   * below zero. Note this is the opposite sign of the spool weight calculator's adjustment.
   * Optional: an API older than #231 does not send it, and the UI may deploy first. Read it
   * through `adjustmentMgOf`, which treats a missing value as 0.
   */
  adjustmentMg?: number;
}

export interface SpoolRow {
  filamentId: string;
  label: string;
  swatch: SwatchDto;
  /** Print consumption only. percentConsumed and costConsumed describe max(0, used + adjusted). */
  usedMg: number;
  /**
   * Net filament adjustments (inventory corrections such as weigh-ins) on this spool in the window, in CONSUMPTION
   * terms: positive means filament was removed, negative means it was added back, so it can be
   * below zero. Note this is the opposite sign of the spool weight calculator's adjustment.
   * Optional: an API older than #231 does not send it, and the UI may deploy first. Read it
   * through `adjustmentMgOf`, which treats a missing value as 0.
   */
  adjustmentMg?: number;
  /** May be NEGATIVE — usage logged beyond the spool's initial weight. Show it, don't clamp it. */
  remainingMg: number | null;
  initialMg: number | null;
  percentConsumed: number | null;
  costConsumed: number | null;
}

export interface RunwayRow {
  filamentId: string;
  label: string;
  swatch: SwatchDto;
  remainingGrams: number;
  burnRateGramsPerDay: number;
  runwayDays: number | null;
}

export interface MaterialsResponse {
  from: string | null;
  to: string | null;
  timeZone: string;
  granularity: Exclude<AnalyticsGranularity, 'Auto'>;
  currency: string | null;
  byType: MaterialGroup[];
  byBrand: MaterialGroup[];
  byColor: MaterialGroup[];
  consumptionOverTime: MaterialSeriesBucket[];
  topSpools: SpoolRow[];
  runway: RunwayRow[];
  wasteGrams: Metric;
  wasteCost: MoneyMetric;
  /** Counts prints only; adjustments are counted by {@link adjustmentCount}. */
  coverage: Coverage;
  /**
   * Adjustment rows the figures include (#231). Optional: an older API does not send it.
   */
  adjustmentCount?: number;
  /**
   * True whenever the server emptied the tab because usage plus adjustment rows passed its row
   * cap. Coverage cannot say so when the window holds no prints. Optional: an older API does not
   * send it, and then the RowCapExceeded coverage exclusion is the only signal.
   */
  rowCapExceeded?: boolean;
}

export interface CostSeriesBucket {
  index: number;
  localStart: string;
  filament: number | null;
  electricity: number | null;
  maintenance: number | null;
}

export interface CostGroup {
  key: string;
  label: string;
  amount: number;
  printCount: number;
}

export interface PrintCostRef {
  printId: number;
  title: string | null;
  date: string | null;
  amount: number;
}

export interface CostsResponse {
  from: string | null;
  to: string | null;
  timeZone: string;
  granularity: Exclude<AnalyticsGranularity, 'Auto'>;
  currency: string | null;
  totalSpend: MoneyMetric;
  filamentSpend: MoneyMetric;
  electricitySpend: MoneyMetric;
  maintenanceSpend: MoneyMetric;
  spendOverTime: CostSeriesBucket[];
  costPerPrint: HistogramBucket[];
  byMaterialType: CostGroup[];
  byBrand: CostGroup[];
  costOfFailure: MoneyMetric;
  /** Null when total spend is 0 — a share of nothing is undefined, not 0%. */
  costOfFailureSharePercent: number | null;
  mostExpensive: PrintCostRef[];
  leastExpensive: PrintCostRef[];
  coverage: Coverage;
}

export interface ScatterBin {
  estimated: number;
  actual: number;
  count: number;
}

export interface AccuracyGroup {
  scope: string;
  key: string;
  label: string;
  medianRatio: number | null;
  sampleSize: number;
  suppressedForSmallSample: boolean;
}

export interface AccuracyTrendBucket {
  index: number;
  localStart: string;
  medianRatio: number | null;
  sampleSize: number;
}

export interface AccuracyCallout {
  scope: string;
  key: string;
  label: string;
  dimension: string;
  medianRatio: number;
  sampleSize: number;
}

export interface AccuracyResponse {
  from: string | null;
  to: string | null;
  timeZone: string;
  granularity: Exclude<AnalyticsGranularity, 'Auto'>;
  timeAccuracyMedian: Metric;
  materialAccuracyMedian: Metric;
  timeScatter: ScatterBin[];
  byPrinter: AccuracyGroup[];
  byMaterial: AccuracyGroup[];
  biasTrend: AccuracyTrendBucket[];
  callouts: AccuracyCallout[];
  coverage: Coverage;
}

/** A row's adjustment, or 0 from an API that predates the field (#231). */
export function adjustmentMgOf(row: { adjustmentMg?: number | null }): number {
  return row.adjustmentMg ?? 0;
}
