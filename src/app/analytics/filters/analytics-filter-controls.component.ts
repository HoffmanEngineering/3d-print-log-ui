import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { catchError, map, of } from 'rxjs';
import { FilamentService } from 'src/app/core/services/filament.service';
import { PrintStatus } from 'src/app/core/services/print.service';
import { PrinterService } from 'src/app/core/services/printer.service';
import { AnalyticsFilterStore } from './analytics-filter.store';

export interface FilterOption {
  id: string | number;
  label: string;
}

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
  private readonly printerService = inject(PrinterService);
  private readonly filamentService = inject(FilamentService);

  /**
   * Option lists degrade to empty rather than breaking the page: the filter bar is not worth
   * failing analytics over, and the user can still change the date range.
   */
  readonly printers = toSignal(
    this.printerService.getCurrentUserPrinterSummaries(1, 200, '', true).pipe(
      map((page) =>
        (page?.items ?? []).map((p) => ({
          id: p.id,
          label: p.name?.trim() || `${p.make ?? ''} ${p.model ?? ''}`.trim(),
        }))
      ),
      catchError(() => of([] as FilterOption[]))
    ),
    { initialValue: [] as FilterOption[] }
  );

  readonly materials = toSignal(
    this.filamentService.getCurrentUserFilamentSummaries(1, 200).pipe(
      map((page) =>
        (page?.items ?? []).map((f) => ({
          id: f.id,
          label:
            f.displayName?.trim() ||
            `${f.brand ?? ''} ${f.materialType ?? ''}`.trim(),
        }))
      ),
      catchError(() => of([] as FilterOption[]))
    ),
    { initialValue: [] as FilterOption[] }
  );

  readonly statusOptions: readonly FilterOption[] = [
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
