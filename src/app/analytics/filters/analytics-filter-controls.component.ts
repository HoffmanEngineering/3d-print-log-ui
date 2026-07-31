import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { PrintStatus } from 'src/app/core/services/print.service';
import { AnalyticsFilterOptionsService } from './analytics-filter-options.service';
import { AnalyticsFilterStore } from './analytics-filter.store';

/**
 * The printer/material/status selects, shared verbatim by the inline desktop bar and the
 * mobile bottom sheet. Both resolve the SAME AnalyticsFilterStore instance (provided by the
 * shell), so a change made in the sheet is already applied when it closes.
 */
@Component({
  selector: 'app-analytics-filter-controls',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './analytics-filter-controls.component.html',
  styleUrls: ['./analytics-filter-controls.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsFilterControlsComponent {
  readonly store = inject(AnalyticsFilterStore);
  private readonly options = inject(AnalyticsFilterOptionsService);

  /**
   * Option lists degrade to empty rather than breaking the page: the filter bar is not worth
   * failing analytics over, and the user can still change the date range.
   */
  readonly printers = this.options.printers;
  readonly materials = this.options.materials;

  readonly statusOptions = [
    { id: PrintStatus.Success, label: 'Success' },
    { id: PrintStatus.PartialSuccess, label: 'Partial success' },
    { id: PrintStatus.Failed, label: 'Failed' },
    { id: PrintStatus.Cancelled, label: 'Cancelled' },
    { id: PrintStatus.Printing, label: 'Printing' },
    { id: PrintStatus.Pending, label: 'Pending' },
  ];

  onPrinters(ids: number[]): void {
    this.store.setPrinterIds(ids);
  }

  onMaterials(ids: string[]): void {
    this.store.setFilamentIds(ids);
  }

  onStatuses(ids: PrintStatus[]): void {
    this.store.setStatuses(ids);
  }
}
