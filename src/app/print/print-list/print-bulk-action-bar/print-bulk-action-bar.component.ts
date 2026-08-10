import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrintStatus } from 'src/app/core/services/print.service';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import {
  BulkActionResult,
  PrintBulkActionsService,
} from '../../services/print-bulk-actions.service';

interface StatusOption {
  status: PrintStatus;
  label: string;
  icon: string;
}

/**
 * Contextual controls shown in the print list toolbar while one or more prints are
 * selected. Offers a bulk status change and a bulk delete, both of which run as
 * sequential batches against the single-item API endpoints.
 *
 * The host keeps a constant height and the progress bar is overlaid rather than
 * stacked, so nothing here moves the table when a selection appears or clears.
 */
@Component({
  selector: 'app-print-bulk-action-bar',
  templateUrl: './print-bulk-action-bar.component.html',
  styleUrls: ['./print-bulk-action-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
})
export class PrintBulkActionBarComponent {
  public readonly bulkActions = inject(PrintBulkActionsService);
  private readonly dialog = inject(MatDialog);
  private readonly toastrService = inject(ToastrService);
  private readonly loggingService = inject(LoggingService);

  /** Emitted after a batch finishes so the list can reload its current page. */
  public readonly batchCompleted = output<BulkActionResult>();

  /** The result sentence, mirrored into the live region for screen readers. */
  public readonly resultMessage = signal('');

  public readonly statusOptions: StatusOption[] = [
    { status: PrintStatus.Pending, label: 'Pending', icon: 'pending_actions' },
    {
      status: PrintStatus.Printing,
      label: 'Printing',
      icon: 'play_circle_outline',
    },
    { status: PrintStatus.Success, label: 'Success', icon: 'done' },
    {
      status: PrintStatus.PartialSuccess,
      label: 'Partial Success',
      icon: 'rule',
    },
    { status: PrintStatus.Failed, label: 'Failed', icon: 'phonelink_off' },
    {
      status: PrintStatus.Cancelled,
      label: 'Cancelled',
      icon: 'remove_circle_outline',
    },
  ];

  public clearSelection(): void {
    this.loggingService.logEvent('PrintBulkActionBar_SelectionCleared', {
      count: this.bulkActions.selectedCount(),
    });
    this.resultMessage.set('');
    this.bulkActions.clearSelection();
  }

  public async setStatus(option: StatusOption): Promise<void> {
    const attempted = this.bulkActions.selectedCount();
    if (attempted === 0 || this.bulkActions.isRunning()) {
      return;
    }

    this.loggingService.logEvent('PrintBulkActionBar_SetStatusStarted', {
      count: attempted,
      status: option.label,
    });
    this.resultMessage.set('');

    const result = await this.bulkActions.setStatusForSelected(option.status);
    this.reportOutcome(result, `set to ${option.label}`, 'updated');
  }

  public async deleteSelected(): Promise<void> {
    const attempted = this.bulkActions.selectedCount();
    if (attempted === 0 || this.bulkActions.isRunning()) {
      return;
    }

    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '350px',
    });
    dialogRef.componentInstance.title = 'Delete?';
    dialogRef.componentInstance.body =
      `Are you sure you want to delete ${attempted} ` +
      `${attempted === 1 ? 'print' : 'prints'}? <br /> <br /> This action cannot be undone.`;
    dialogRef.componentInstance.yesText = 'Delete';
    dialogRef.componentInstance.yesColor = 'warn';
    dialogRef.componentInstance.noText = 'Cancel';

    const shouldDelete = await firstValueFrom(dialogRef.afterClosed());

    this.loggingService.logEvent('PrintBulkActionBar_DeleteConfirmed', {
      count: attempted,
      confirmed: !!shouldDelete,
    });

    if (!shouldDelete) {
      return;
    }

    this.resultMessage.set('');
    const result = await this.bulkActions.deleteSelected();
    this.reportOutcome(result, 'deleted', 'deleted');
  }

  /**
   * Surfaces the batch outcome as a toast and in the live region. A partial
   * failure is reported as "X updated, Y failed", and the retry hint is only
   * added when the service actually put the failures back into the selection.
   */
  private reportOutcome(
    result: BulkActionResult,
    pastTenseTitle: string,
    pastTenseVerb: string
  ): void {
    const succeeded = result.succeededIds.length;
    const failed = result.failedIds.length;

    if (succeeded === 0 && failed === 0) {
      return;
    }

    if (failed === 0) {
      const message = `${succeeded} ${succeeded === 1 ? 'print' : 'prints'} ${pastTenseVerb}.`;
      this.resultMessage.set(message);
      this.toastrService.success(message, 'Success');
    } else {
      const retryHint = result.failuresRetained
        ? ' The prints that failed are still selected.'
        : '';
      const message = `${succeeded} ${pastTenseVerb}, ${failed} failed.${retryHint}`;
      this.resultMessage.set(message);
      this.toastrService.error(
        message,
        `Some prints could not be ${pastTenseTitle}`
      );
    }

    this.batchCompleted.emit(result);
  }
}
