import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PrintSummary } from 'src/app/core/services/print.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { PrintImageComponent } from 'src/app/shared/print-image/print-image.component';
import { PrintStatusBadgeComponent } from 'src/app/shared/print-status-badge/print-status-badge.component';

/**
 * The print list's thumbnail grid: the same page of rows the table and the
 * phone cards render, laid out for browsing by picture.
 *
 * Presentational only. The list owns the rows, the paging, the busy states and
 * the bulk selection; this component draws tiles and reports checkbox clicks,
 * the same way `PrintCardComponent` reports a long press.
 */
@Component({
  selector: 'app-print-gallery',
  templateUrl: './print-gallery.component.html',
  styleUrl: './print-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatCheckbox,
    MatIcon,
    LocaleDatePipe,
    PrintImageComponent,
    PrintStatusBadgeComponent,
  ],
})
export class PrintGalleryComponent {
  readonly prints = input.required<readonly PrintSummary[]>();

  /** Ids of the prints currently in the bulk selection. */
  readonly selectedIds = input<ReadonlySet<number>>(new Set());

  /** True while a batch is running, when the selection must not change. */
  readonly selectionDisabled = input(false);

  /**
   * Asks the list to add or remove a print from the selection. The tile holds no
   * selection state of its own.
   */
  readonly selectionToggled = output<PrintSummary>();

  /**
   * A tile is narrow, so the printer's own name wins over the "Name - (Make
   * Model)" label the table uses; make and model stand in when it has none.
   */
  protected printerLabel(printer: PrinterSummary | null | undefined): string {
    if (!printer) {
      return '';
    }
    return printer.name?.trim()
      ? printer.name
      : `${printer.make ?? ''} ${printer.model ?? ''}`.trim();
  }
}
