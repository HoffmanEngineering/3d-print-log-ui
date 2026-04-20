import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import moment from 'moment';
import { PrintSummary, PrintStatus } from 'src/app/core/services/print.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { ProjectChipComponent } from 'src/app/shared/project-chip/project-chip.component';
import { PrintShareDialogComponent } from 'src/app/print/print-share-dialog/print-share-dialog.component';

@Component({
  selector: 'app-print-card',
  templateUrl: './print-card.component.html',
  styleUrls: ['./print-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SharedModule, ProjectChipComponent],
})
export class PrintCardComponent {
  private readonly dialog = inject(MatDialog);
  private readonly loggingService = inject(LoggingService);

  readonly print = input.required<PrintSummary>();
  readonly deleted = output<PrintSummary>();
  readonly statusChanged = output<{ id: number; status: PrintStatus }>();
  readonly printStatusTypes = PrintStatus;

  onDeleteClicked(): void {
    this.deleted.emit(this.print());
  }

  onStatusChange(status: PrintStatus): void {
    this.statusChanged.emit({ id: this.print().id, status });
  }

  onShareClicked(): void {
    this.loggingService.logEvent('PrintCard_ShareClicked', {
      printId: this.print().id,
    });
    this.dialog.open(PrintShareDialogComponent, {
      width: '300px',
      minWidth: '300px',
      data: { printId: this.print().id },
    });
  }

  protected getPrinterLabel(printer: PrinterSummary): string {
    if (printer.name && printer.name !== '') {
      return `${printer.name} - (${(printer.make + ' ' + printer.model).trim()})`;
    }
    return `${(printer.make + ' ' + printer.model).trim()}`;
  }

  protected getStatus(print: PrintSummary): string {
    if (print.status === PrintStatus.Cancelled) return 'Cancelled';
    if (print.status === PrintStatus.Failed) return 'Failed';
    if (print.status === PrintStatus.Pending) return 'Pending';
    if (print.status === PrintStatus.Printing) return 'Printing';
    if (print.status === PrintStatus.Success) return 'Success';
    if (print.status === PrintStatus.PartialSuccess) return 'Partial Success';
    return 'Unknown';
  }

  protected getStatusIcon(print: PrintSummary): string {
    if (print.status === PrintStatus.Cancelled) return 'remove_circle_outline';
    if (print.status === PrintStatus.Failed) return 'error_outline';
    if (print.status === PrintStatus.Pending) return 'pending_actions';
    if (print.status === PrintStatus.Printing) return 'play_circle_outline';
    if (print.status === PrintStatus.Success) return 'check_circle_outline';
    if (print.status === PrintStatus.PartialSuccess) return 'rule';
    return 'help_outline';
  }

  protected getPrintEndDate(print: PrintSummary): Date | null {
    if (
      print.startDate &&
      ((print.estimatedPrintTimeInSeconds ?? 0) > 0 ||
        (print.printTimeInSeconds ?? 0) > 0)
    ) {
      const printTime =
        (print.printTimeInSeconds ?? 0) > 0
          ? print.printTimeInSeconds!
          : (print.estimatedPrintTimeInSeconds ?? 0) > 0
            ? print.estimatedPrintTimeInSeconds!
            : 0;
      return moment(print.startDate).add(printTime, 'seconds').toDate();
    }
    return null;
  }
}
