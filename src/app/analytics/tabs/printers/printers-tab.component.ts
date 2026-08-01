import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  BarChartComponent,
  BarDatum,
  BarSeries,
} from 'src/app/shared/charts/bar-chart.component';
import {
  formatTickDate,
  parseLocalDate,
} from 'src/app/shared/charts/chart-axis';
import { CsvExport } from 'src/app/shared/charts/chart-export';
import { ChartFrameComponent } from 'src/app/shared/charts/chart-frame.component';
import { StatTileComponent } from 'src/app/shared/charts/stat-tile.component';
import { AnalyticsFilterStore } from '../../filters/analytics-filter.store';
import { PrintersResponse } from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { createTabData } from '../tab-data';
import { PrinterComparisonComponent } from './printer-comparison.component';

/** Below this the comparison table becomes a card list rather than a horizontal scroll. */
const CARD_LAYOUT_BELOW = 700;

@Component({
  selector: 'app-printers-tab',
  imports: [
    BarChartComponent,
    ChartFrameComponent,
    PrinterComparisonComponent,
    StatTileComponent,
  ],
  templateUrl: './printers-tab.component.html',
  styleUrls: ['./printers-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintersTabComponent implements OnDestroy {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(AnalyticsFilterStore);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  private readonly tab = createTabData<PrintersResponse>(
    this.store.filter,
    (filter) => this.analytics.getPrinters(filter),
    (response) => response.printers.every((printer) => printer.isIdle)
  );

  readonly data = this.tab.data;
  readonly state = this.tab.state;

  /**
   * Measured from the host, not the window: the side nav collapsing changes the available
   * width without a viewport change, exactly as chart-frame documents.
   */
  readonly comparisonLayout = signal<'table' | 'cards'>('table');

  private observer?: ResizeObserver;

  constructor() {
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width;
        if (width === undefined) return;
        this.comparisonLayout.set(
          width < CARD_LAYOUT_BELOW ? 'cards' : 'table'
        );
      });
      this.observer.observe(this.host.nativeElement);
    }
  }

  /**
   * One series per printer, colours cycling through the six theme tokens. The key is the
   * printer id as a string, matching PrinterSeriesBucket.printSecondsByPrinterId, so the
   * stacked chart and the table are looking at the same identity.
   */
  readonly printerSeries = computed<BarSeries[]>(() =>
    (this.data()?.printers ?? []).map((printer, index) => ({
      key: String(printer.printerId),
      label: printer.name ?? `Printer ${printer.printerId}`,
      seriesIndex: (index % 6) + 1,
    }))
  );

  readonly timeSeriesData = computed<BarDatum[]>(() => {
    const response = this.data();
    if (!response) return [];

    return [...response.timeSeries]
      .sort(
        (left, right) =>
          left.localStart.localeCompare(right.localStart) ||
          left.index - right.index
      )
      .map((bucket) => {
        const date = parseLocalDate(bucket.localStart);
        const values: Record<string, number> = {};
        for (const [printerId, seconds] of Object.entries(
          bucket.printSecondsByPrinterId
        )) {
          values[printerId] = seconds / 3600;
        }
        return {
          label: formatTickDate(date, response.granularity, true),
          fullLabel: formatTickDate(date, response.granularity, false),
          values,
        };
      });
  });

  readonly successRateData = computed<BarDatum[]>(() =>
    (this.data()?.printers ?? [])
      .filter((printer) => printer.successRatePercent !== null)
      .map((printer) => ({
        label: printer.name ?? `Printer ${printer.printerId}`,
        fullLabel: printer.name ?? `Printer ${printer.printerId}`,
        values: { value: printer.successRatePercent as number },
      }))
  );

  readonly singleSeries: readonly BarSeries[] = [
    { key: 'value', label: 'Success rate', seriesIndex: 3 },
  ];

  /**
   * Summed from the PER-PRINTER totals, not from `maintenance`.
   *
   * `maintenance` is the display list, capped at 500 newest events; the API deliberately
   * computes each printer's maintenanceCost from its own uncapped read for exactly this
   * reason. Summing the capped list would quietly stop the headline total at 500 events
   * while the per-printer column beside it kept counting — two numbers on one screen that
   * disagree, with nothing on screen to explain why.
   */
  readonly comparisonCsv = computed<CsvExport>(() => ({
    filename: 'analytics-printers-comparison.csv',
    columns: [
      'Printer',
      'Prints',
      'Success rate (%)',
      'Print time (s)',
      'Filament (g)',
      'Avg duration (s)',
      'Cost',
      'Maintenance cost',
      'Utilization (%)',
      'Cost per print hour',
    ],
    rows: (this.data()?.printers ?? []).map((row) => [
      row.name,
      row.printCount,
      row.successRatePercent,
      row.printTimeSeconds,
      row.materialMg / 1000,
      row.avgDurationSeconds,
      row.cost,
      row.maintenanceCost,
      row.utilizationPercent,
      row.costPerPrintHour,
    ]),
  }));

  readonly successCsv = computed<CsvExport>(() => ({
    filename: 'analytics-printers-success-rate.csv',
    columns: ['Printer', 'Success rate (%)'],
    rows: (this.data()?.printers ?? []).map((row) => [
      row.name,
      row.successRatePercent,
    ]),
  }));

  readonly timeSeriesCsv = computed<CsvExport>(() => ({
    filename: 'analytics-printers-print-time.csv',
    columns: ['Period', 'Printer id', 'Print time (s)'],
    rows: [...(this.data()?.timeSeries ?? [])]
      .sort((left, right) => left.localStart.localeCompare(right.localStart))
      .flatMap((bucket) =>
        Object.entries(bucket.printSecondsByPrinterId).map(
          ([printerId, seconds]) => [bucket.localStart, printerId, seconds]
        )
      ),
  }));

  readonly maintenanceCsv = computed<CsvExport>(() => ({
    filename: 'analytics-printers-maintenance.csv',
    columns: ['Date', 'Printer id', 'Category', 'Description', 'Cost'],
    rows: (this.data()?.maintenance ?? []).map((event) => [
      event.date,
      event.printerId,
      event.category,
      event.description,
      event.cost,
    ]),
  }));

  readonly maintenanceTotal = computed(() => {
    const priced = (this.data()?.printers ?? []).filter(
      (printer) => printer.maintenanceCost !== null
    );
    return priced.length === 0
      ? null
      : priced.reduce((sum, p) => sum + (p.maintenanceCost ?? 0), 0);
  });

  onRetry(): void {
    this.tab.retry();
  }

  /** Never sends userId — that would narrow the list to the user's PUBLIC prints. */
  onPrinterSelect(event: { printerId: number }): void {
    void this.router.navigate(['/prints'], {
      queryParams: { filterByPrinterId: event.printerId },
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
