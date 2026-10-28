import { DecimalPipe, formatNumber } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { PrinterRow } from '../../models/analytics.models';
import { PrinterAvatarComponent } from 'src/app/shared/printer-avatar/printer-avatar.component';
import { withMilliliters } from 'src/app/shared/utils/filament-display.utils';

export type PrinterSortColumn =
  | 'name'
  | 'printCount'
  | 'successRatePercent'
  | 'printTimeSeconds'
  | 'materialMg'
  | 'avgDurationSeconds'
  | 'cost'
  | 'maintenanceCost'
  | 'utilizationPercent';

/**
 * One component for both layouts. Sorting, formatting and click-through are identical between
 * the desktop table and the phone card list, and duplicating them into two components would
 * duplicate exactly the part that can be wrong.
 */
@Component({
  selector: 'app-printer-comparison',
  imports: [DecimalPipe, MatButtonModule, PrinterAvatarComponent],
  templateUrl: './printer-comparison.component.html',
  styleUrls: ['./printer-comparison.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrinterComparisonComponent {
  readonly rows = input<PrinterRow[]>([]);
  readonly currency = input<string | null>(null);
  readonly layout = input<'table' | 'cards'>('table');
  /**
   * Printers whose category takes resin (3d-print-log-api#294): their grams are the resin
   * weighed through the bottle's density, so their material shows in mL only.
   */
  readonly resinPrinterIds = input<ReadonlySet<number>>(new Set());

  private readonly locale = inject(LOCALE_ID);

  readonly printerSelect = output<{ printerId: number }>();

  readonly sortColumn = signal<PrinterSortColumn>('printCount');
  readonly sortAscending = signal(false);

  readonly columns: readonly { key: PrinterSortColumn; label: string }[] = [
    { key: 'name', label: 'Printer' },
    { key: 'printCount', label: 'Prints' },
    { key: 'successRatePercent', label: 'Success' },
    { key: 'printTimeSeconds', label: 'Print time' },
    { key: 'materialMg', label: 'Filament' },
    { key: 'avgDurationSeconds', label: 'Avg print' },
    { key: 'cost', label: 'Cost' },
    { key: 'maintenanceCost', label: 'Maintenance' },
    { key: 'utilizationPercent', label: 'Utilization' },
  ];

  /** "Material" once any printer used resin; a filament-only fleet keeps "Filament". */
  readonly materialLabel = computed(() =>
    this.rows().some((row) => (row.materialMl ?? 0) > 0)
      ? 'Material'
      : 'Filament'
  );

  readonly sorted = computed(() => {
    const column = this.sortColumn();
    const ascending = this.sortAscending();

    return [...this.rows()].sort((left, right) => {
      const a = left[column];
      const b = right[column];

      // Nulls last in BOTH directions. A printer with no success rate is not the worst
      // printer; treating null as 0 would assert something the data does not say.
      if (a === null || a === undefined)
        return b === null || b === undefined ? 0 : 1;
      if (b === null || b === undefined) return -1;

      const comparison =
        typeof a === 'string' || typeof b === 'string'
          ? String(a).localeCompare(String(b))
          : Number(a) - Number(b);

      return (
        (ascending ? comparison : -comparison) ||
        left.printerId - right.printerId
      );
    });
  });

  sortBy(column: PrinterSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortAscending.update((value) => !value);
      return;
    }
    this.sortColumn.set(column);
    // A newly chosen column starts descending except for the name, where A→Z is the
    // expectation every table in the app already sets.
    this.sortAscending.set(column === 'name');
  }

  onSelect(row: PrinterRow): void {
    this.printerSelect.emit({ printerId: row.printerId });
  }

  hours(seconds: number | null): number | null {
    return seconds === null ? null : seconds / 3600;
  }

  /** "1,234 g", "72.8 mL" or "34,000 g · 20.0 mL": see withMilliliters. */
  material(row: PrinterRow): string {
    const grams = row.materialMg / 1000;
    return withMilliliters(
      `${formatNumber(grams, this.locale, '1.0-0')} g`,
      grams,
      row.materialMl,
      this.resinPrinterIds().has(row.printerId)
    );
  }
}
