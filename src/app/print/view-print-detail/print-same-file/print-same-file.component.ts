import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrintService,
  SameFilePrint,
  SameFilePrints,
} from 'src/app/core/services/print.service';
import { PrintStatusBadgeComponent } from 'src/app/shared/print-status-badge/print-status-badge.component';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';

/**
 * "Printed N times" for the owner's print, with a menu of the other prints of the same file
 * (UI #10). Two prints are the same file when they share a file hash.
 *
 * Render it for the owner only: the endpoint is owner-only, and on this public route an
 * anonymous visitor must not trigger a request that can only fail. It still degrades to
 * nothing on any error.
 *
 * It shows no busy state. The counter is a secondary detail that appears once the answer is in,
 * in a row that reserves no space for it, so there is nothing a skeleton would explain.
 */
@Component({
  selector: 'app-print-same-file',
  templateUrl: './print-same-file.component.html',
  styleUrls: ['./print-same-file.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    LocaleDatePipe,
    PrintStatusBadgeComponent,
  ],
})
export class PrintSameFileComponent {
  private readonly printService = inject(PrintService);
  private readonly loggingService = inject(LoggingService);

  readonly printId = input.required<number>();

  /**
   * Re-fetched per id: the router reuses the detail page between prints. Null until the answer
   * arrives and on any failure, which renders nothing either way.
   */
  private readonly result = toSignal(
    toObservable(this.printId).pipe(
      switchMap((id) =>
        this.printService
          .getSameFilePrints(id)
          .pipe(catchError(() => of<SameFilePrints | null>(null)))
      )
    ),
    { initialValue: null }
  );

  /** Shown only when the file was printed more than once. */
  protected readonly sameFile = computed(() => {
    const result = this.result();
    if (!result || result.count < 2) {
      return null;
    }
    return {
      count: result.count,
      prints: result.prints,
      // The count includes this print; the list does not.
      more: Math.max(0, result.count - 1 - result.prints.length),
    };
  });

  protected onOpened(): void {
    this.loggingService.logEvent('PrintSameFile_Opened', {
      printId: this.printId(),
      count: this.sameFile()?.count ?? 0,
    });
  }

  protected onSelected(print: SameFilePrint): void {
    this.loggingService.logEvent('PrintSameFile_PrintSelected', {
      printId: this.printId(),
      selectedPrintId: print.id,
    });
  }
}
