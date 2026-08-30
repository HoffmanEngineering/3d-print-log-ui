import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PrintStatus } from 'src/app/core/services/print.service';
import {
  AnalyticsFilterValue,
  AnalyticsGranularity,
} from '../models/analytics.models';

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'last90'
  | 'last365'
  | 'ytd'
  | 'all'
  | 'custom';

const PRESETS: readonly DateRangePreset[] = [
  'today',
  'yesterday',
  'last7',
  'last30',
  'last90',
  'last365',
  'ytd',
  'all',
  'custom',
];

const startOfLocalDay = (d: Date): Date => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (d: Date, n: number): Date => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

/**
 * Ranges are HALF-OPEN: toDate is the exclusive end, i.e. the start of the day after the
 * last included day. This matches the API contract, so adjacent periods never double-count
 * a boundary instant. Never build a 23:59:59.999 end.
 */
export function resolvePresetRange(
  preset: DateRangePreset,
  now: Date,
  customFrom: Date | null,
  customTo: Date | null
): { fromDate: string | null; toDate: string | null } {
  const today = startOfLocalDay(now);
  const iso = (d: Date) => d.toISOString();

  switch (preset) {
    case 'all':
      return { fromDate: null, toDate: null };
    case 'today':
      return { fromDate: iso(today), toDate: iso(addDays(today, 1)) };
    case 'yesterday':
      return { fromDate: iso(addDays(today, -1)), toDate: iso(today) };
    case 'last7':
      return {
        fromDate: iso(addDays(today, -6)),
        toDate: iso(addDays(today, 1)),
      };
    case 'last30':
      return {
        fromDate: iso(addDays(today, -29)),
        toDate: iso(addDays(today, 1)),
      };
    case 'last90':
      return {
        fromDate: iso(addDays(today, -89)),
        toDate: iso(addDays(today, 1)),
      };
    case 'last365':
      return {
        fromDate: iso(addDays(today, -364)),
        toDate: iso(addDays(today, 1)),
      };
    case 'ytd':
      return {
        fromDate: iso(startOfLocalDay(new Date(now.getFullYear(), 0, 1))),
        toDate: iso(addDays(today, 1)),
      };
    case 'custom': {
      if (!customFrom || !customTo) return { fromDate: null, toDate: null };
      return {
        fromDate: iso(startOfLocalDay(customFrom)),
        toDate: iso(addDays(startOfLocalDay(customTo), 1)),
      };
    }
  }
}

/**
 * Single owner of analytics filter state. The URL is its serialization, so every view is
 * linkable, shareable, and survives a reload.
 *
 * Note it uses replaceUrl, so Back leaves the page rather than stepping through filter
 * changes. That is deliberate — a select emits on every change, and pushing each one would
 * make Back appear broken by walking a user through a dozen intermediate filter states.
 */
@Injectable()
export class AnalyticsFilterStore {
  private readonly router = inject(Router);

  readonly preset = signal<DateRangePreset>('last30');
  readonly customFrom = signal<Date | null>(null);
  readonly customTo = signal<Date | null>(null);
  readonly printerIds = signal<number[]>([]);
  readonly filamentIds = signal<string[]>([]);
  readonly projectIds = signal<string[]>([]);
  readonly statuses = signal<PrintStatus[]>([]);
  readonly comparePrevious = signal(false);
  readonly granularity = signal<AnalyticsGranularity>('Auto');

  /** The request object every tab derives from. */
  readonly filter = computed<AnalyticsFilterValue>(() => {
    const { fromDate, toDate } = resolvePresetRange(
      this.preset(),
      new Date(),
      this.customFrom(),
      this.customTo()
    );

    return {
      fromDate,
      toDate,
      // The API needs the zone, not an offset: a fixed offset is wrong across DST.
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      printerIds: this.printerIds(),
      filamentIds: this.filamentIds(),
      projectIds: this.projectIds(),
      statuses: this.statuses(),
      granularity: this.granularity(),
      comparePrevious: this.comparePrevious(),
    };
  });

  /** Non-date filters only — the date range has its own always-visible control. */
  readonly activeChipCount = computed(
    () =>
      this.printerIds().length +
      this.filamentIds().length +
      this.projectIds().length +
      this.statuses().length
  );

  setPreset(preset: DateRangePreset): void {
    this.preset.set(preset);
    this.syncUrl();
  }

  setCustomRange(from: Date | null, to: Date | null): void {
    this.customFrom.set(from);
    this.customTo.set(to);
    this.preset.set('custom');
    this.syncUrl();
  }

  setPrinterIds(ids: number[]): void {
    this.printerIds.set(this.dedupeNumbers(ids));
    this.syncUrl();
  }

  setFilamentIds(ids: string[]): void {
    this.filamentIds.set([...new Set(ids)].sort());
    this.syncUrl();
  }

  setProjectIds(ids: string[]): void {
    this.projectIds.set([...new Set(ids)].sort());
    this.syncUrl();
  }

  setStatuses(statuses: PrintStatus[]): void {
    this.statuses.set(this.dedupeNumbers(statuses) as PrintStatus[]);
    this.syncUrl();
  }

  toggleComparePrevious(): void {
    this.comparePrevious.update((v) => !v);
    this.syncUrl();
  }

  clearAll(): void {
    this.printerIds.set([]);
    this.filamentIds.set([]);
    this.projectIds.set([]);
    this.statuses.set([]);
    this.comparePrevious.set(false);
    this.syncUrl();
  }

  /** Restores state from query params. Malformed values fall back to defaults, never throw. */
  initFromUrl(params: Record<string, unknown>): void {
    const preset = String(params['preset'] ?? '');
    if ((PRESETS as readonly string[]).includes(preset)) {
      this.preset.set(preset as DateRangePreset);
    }

    const from = this.parseDate(params['from']);
    const to = this.parseDate(params['to']);
    if (from && to) {
      this.customFrom.set(from);
      this.customTo.set(to);
    }

    this.printerIds.set(this.parseNumberList(params['printerIds']));
    this.statuses.set(
      this.parseNumberList(params['statuses']) as PrintStatus[]
    );
    this.filamentIds.set(this.parseStringList(params['filamentIds']));
    this.projectIds.set(this.parseStringList(params['projectIds']));
    this.comparePrevious.set(
      String(params['comparePrevious'] ?? '') === 'true'
    );
  }

  private syncUrl(): void {
    const list = (v: readonly (string | number)[]) =>
      v.length ? v.join(',') : null;

    void this.router.navigate([], {
      queryParams: {
        preset: this.preset(),
        from:
          this.preset() === 'custom'
            ? (this.customFrom()?.toISOString() ?? null)
            : null,
        to:
          this.preset() === 'custom'
            ? (this.customTo()?.toISOString() ?? null)
            : null,
        printerIds: list(this.printerIds()),
        filamentIds: list(this.filamentIds()),
        projectIds: list(this.projectIds()),
        statuses: list(this.statuses()),
        comparePrevious: this.comparePrevious() ? 'true' : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private dedupeNumbers(values: number[]): number[] {
    return [...new Set(values)].sort((a, b) => a - b);
  }

  private parseNumberList(raw: unknown): number[] {
    if (typeof raw !== 'string' || raw === '') return [];
    const parsed = raw
      .split(',')
      .map((s) => s.trim())
      // Blank segments must be dropped BEFORE Number(): Number('') is 0, not NaN, so
      // "abc,,7" would otherwise smuggle in a printer id of 0.
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    return this.dedupeNumbers(parsed);
  }

  private parseStringList(raw: unknown): string[] {
    if (typeof raw !== 'string' || raw === '') return [];
    return [
      ...new Set(
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ].sort();
  }

  private parseDate(raw: unknown): Date | null {
    if (typeof raw !== 'string' || raw === '') return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
}
