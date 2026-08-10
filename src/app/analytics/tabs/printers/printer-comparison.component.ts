import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { PrinterRow } from '../../models/analytics.models';

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
  imports: [DecimalPipe, MatButtonModule],
  templateUrl: './printer-comparison.component.html',
  styleUrls: ['./printer-comparison.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrinterComparisonComponent {
  readonly rows = input<PrinterRow[]>([]);
  readonly currency = input<string | null>(null);
  readonly layout = input<'table' | 'cards'>('table');

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

  grams(mg: number): number {
    return mg / 1000;
  }
}
