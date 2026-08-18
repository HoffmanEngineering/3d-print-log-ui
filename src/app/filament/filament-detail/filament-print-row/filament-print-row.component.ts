import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import {
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
  PrintSummary,
} from 'src/app/core/services/print.service';
import { PrintImageComponent } from 'src/app/shared/print-image/print-image.component';
import { getFilamentPreferredDisplay } from 'src/app/shared/utils/filament-display.utils';

/** One compact print row in the material detail rail. */
@Component({
  selector: 'app-filament-print-row',
  templateUrl: './filament-print-row.component.html',
  styleUrls: ['./filament-print-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatIconModule,
    MatTooltipModule,
    PrintImageComponent,
  ],
})
export class FilamentPrintRowComponent {
  readonly print = input.required<PrintSummary>();
  readonly filamentId = input.required<string>();
  readonly preferredUnit = input<PrintFilamentSourceMeasurement>(
    PrintFilamentSourceMeasurement.Weight
  );

  /**
   * Every usage row for this spool. A print may carry more than one — there is no
   * unique index on (PrintId, FilamentId) — so taking only the first would show
   * half the usage and contradict the totals in the card above.
   */
  private readonly usages = computed<PrintFilamentSummaryDto[]>(() =>
    (this.print().filamentUsage ?? []).filter(
      (u) => u.filament?.id === this.filamentId()
    )
  );

  protected readonly hasImage = computed(
    () => (this.print().defaultPrintImageId ?? 0) > 0
  );

  protected readonly isEstimated = computed(() =>
    this.usages().some(
      (u) =>
        getFilamentPreferredDisplay(u, this.preferredUnit())?.isEstimated ??
        false
    )
  );

  /**
   * Summed across usage rows, resolving actual-else-estimated PER ROW.
   *
   * Merging the rows into one synthetic row first and formatting that once would
   * be wrong: the helper prefers actual over estimated across the whole row, so a
   * print with one actual row (12 g) and one estimated row (30 g) would collapse
   * to the actual column alone and display 12 g — dropping 30 g and contradicting
   * `totalUsedMg` in the card above. The server's own rule is per row, and this
   * mirrors it.
   */
  protected readonly usageDisplay = computed(() => {
    const usages = this.usages();
    if (usages.length === 0) {
      return null;
    }
    if (usages.length === 1) {
      return getFilamentPreferredDisplay(usages[0], this.preferredUnit());
    }

    // Resolve each row on its own, then sum the resolved values into a synthetic
    // row whose actual columns already hold the totals. The estimated columns are
    // left empty so the helper cannot double count; `isEstimated` is reported
    // separately from the untouched rows.
    const totals = { mg: 0, m: 0, ml: 0 };
    for (const usage of usages) {
      totals.mg += usage.amountMg ?? usage.estimatedAmountMg ?? 0;
      totals.m += usage.lengthInM ?? usage.estimatedLengthInM ?? 0;
      totals.ml += usage.volumeMl ?? usage.estimatedVolumeMl ?? 0;
    }

    const merged: PrintFilamentSummaryDto = {
      ...usages[0],
      amountMg: totals.mg || undefined,
      lengthInM: totals.m || undefined,
      volumeMl: totals.ml || undefined,
      estimatedAmountMg: undefined,
      estimatedLengthInM: undefined,
      estimatedVolumeMl: undefined,
    };

    return getFilamentPreferredDisplay(merged, this.preferredUnit());
  });
}
