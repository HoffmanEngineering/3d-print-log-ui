import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
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
import {
  PrintStatus,
  PrintViewStatus,
} from 'src/app/core/services/print.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import {
  BulkActionResult,
  PrintBulkActionsService,
} from '../../services/print-bulk-actions.service';
import {
  PrintBulkProjectDialogComponent,
  PrintBulkProjectDialogResult,
} from '../print-bulk-project-dialog/print-bulk-project-dialog.component';

interface StatusOption {
  status: PrintStatus;
  label: string;
  icon: string;
}

interface VisibilityOption {
  viewStatus: PrintViewStatus;
  label: string;
  icon: string;
}

/**
 * Contextual controls shown in the print list toolbar while one or more prints are
 * selected. Offers a bulk status change, an add-to-project, a delete, and an overflow
 * menu for visibility, printer and permissions - all of which run as chunked requests
 * against the bulk API endpoints.
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

  /** The user's printers, passed down from the list's resolver data - no extra request. */
  public readonly printers = input<PrinterSummary[]>([]);

  /** Emitted after a batch finishes so the list can reload its current page. */
  public readonly batchCompleted = output<BulkActionResult>();

  public readonly visibilityOptions: VisibilityOption[] = [
    { viewStatus: PrintViewStatus.Public, label: 'Public', icon: 'public' },
    { viewStatus: PrintViewStatus.Unlisted, label: 'Unlisted', icon: 'link' },
    { viewStatus: PrintViewStatus.Private, label: 'Private', icon: 'lock' },
  ];

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

  /**
   * Opens the project picker and files the selection under whatever it returns. The dialog
   * resolves a typed-in name to a created project before it closes, so this only ever
   * deals in ids - a chunked batch cannot create one project per chunk.
   */
  public async addToProject(): Promise<void> {
    const attempted = this.bulkActions.selectedCount();
    if (attempted === 0 || this.bulkActions.isRunning()) {
      return;
    }

    this.loggingService.logEvent('PrintBulkActionBar_SetProjectStarted', {
      count: attempted,
    });

    const dialogRef = this.dialog.open(PrintBulkProjectDialogComponent, {
      width: '420px',
      data: { count: attempted },
    });

    const choice: PrintBulkProjectDialogResult | undefined =
      await firstValueFrom(dialogRef.afterClosed());

    if (!choice) {
      return;
    }

    this.resultMessage.set('');

    if ('remove' in choice) {
      this.loggingService.logEvent('PrintBulkActionBar_RemoveProjectStarted', {
        count: attempted,
      });
      const removed = await this.bulkActions.removeProjectFromSelected();
      this.reportOutcome(removed, 'removed from their project', 'updated');
      return;
    }

    const result = await this.bulkActions.setProjectForSelected(
      choice.projectId
    );

    // A project created for this batch outlives a failed assignment on purpose - deleting
    // it would be destructive on a guess, since part of the batch may already be filed.
    // Naming it is what stops the retry from creating a second one under the same name.
    if (choice.created && result.succeededIds.length === 0) {
      this.resultMessage.set(
        `The project "${choice.projectName}" was created, but no prints could be added to it. ` +
          'Pick it from the list to try again.'
      );
      this.toastrService.error(
        this.resultMessage(),
        'Could not add to the project'
      );
      this.batchCompleted.emit(result);
      return;
    }

    this.reportOutcome(result, 'added to the project', 'updated');
  }

  /** Sets who can see every selected print. */
  public async setVisibility(option: VisibilityOption): Promise<void> {
    const attempted = this.bulkActions.selectedCount();
    if (attempted === 0 || this.bulkActions.isRunning()) {
      return;
    }
    this.loggingService.logEvent('PrintBulkActionBar_SetVisibilityStarted', {
      count: attempted,
      visibility: option.label,
    });
    this.resultMessage.set('');
    const result = await this.bulkActions.setViewStatusForSelected(
      option.viewStatus
    );
    this.reportOutcome(result, `set to ${option.label}`, 'updated');
  }

  /** Moves every selected print onto another of the user's printers. */
  public async setPrinter(printer: PrinterSummary): Promise<void> {
    const attempted = this.bulkActions.selectedCount();
    if (attempted === 0 || this.bulkActions.isRunning()) {
      return;
    }
    this.loggingService.logEvent('PrintBulkActionBar_SetPrinterStarted', {
      count: attempted,
    });
    this.resultMessage.set('');
    const result = await this.bulkActions.setPrinterForSelected(printer.id);
    this.reportOutcome(result, `moved to ${printer.name}`, 'updated');
  }

  /** Sets only the permissions named in `patch`; the others are left alone. */
  public async setPermission(patch: {
    allowComments?: boolean;
    allowFileDownloads?: boolean;
  }): Promise<void> {
    const attempted = this.bulkActions.selectedCount();
    if (attempted === 0 || this.bulkActions.isRunning()) {
      return;
    }
    this.loggingService.logEvent('PrintBulkActionBar_SetPermissionsStarted', {
      count: attempted,
      fields: Object.keys(patch).join(','),
    });
    this.resultMessage.set('');
    const result = await this.bulkActions.setPermissionsForSelected(patch);
    this.reportOutcome(result, 'updated', 'updated');
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
      // A 400 means the API refused the request itself and said why - its reason is
      // more useful than a count of prints that never got sent.
      const message = result.errorMessage
        ? `${result.errorMessage}${retryHint}`
        : `${succeeded} ${pastTenseVerb}, ${failed} failed.${retryHint}`;
      this.resultMessage.set(message);
      this.toastrService.error(
        message,
        `Some prints could not be ${pastTenseTitle}`
      );
    }

    this.batchCompleted.emit(result);
  }
}
