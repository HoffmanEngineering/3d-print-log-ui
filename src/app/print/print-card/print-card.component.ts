import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import {
  PrintSummary,
  PrintStatus,
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
} from 'src/app/core/services/print.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { ProjectChipComponent } from 'src/app/shared/project-chip/project-chip.component';
import { PrintStatusBadgeComponent } from 'src/app/shared/print-status-badge/print-status-badge.component';
import { PrintShareDialogComponent } from 'src/app/print/print-share-dialog/print-share-dialog.component';
import {
  FilamentPreferredDisplayResult,
  getFilamentPreferredDisplay,
} from 'src/app/shared/utils/filament-display.utils';

@Component({
  selector: 'app-print-card',
  templateUrl: './print-card.component.html',
  styleUrls: ['./print-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    SharedModule,
    ProjectChipComponent,
    PrintStatusBadgeComponent,
  ],
})
export class PrintCardComponent {
  private readonly dialog = inject(MatDialog);
  private readonly loggingService = inject(LoggingService);

  readonly print = input.required<PrintSummary>();
  readonly deleted = output<PrintSummary>();
  readonly statusChanged = output<{ id: number; status: PrintStatus }>();
  readonly printStatusTypes = PrintStatus;
  readonly preferredUnit = input<PrintFilamentSourceMeasurement>(
    PrintFilamentSourceMeasurement.Weight
  );

  getPreferredDisplay(
    fu: PrintFilamentSummaryDto
  ): FilamentPreferredDisplayResult | null {
    return getFilamentPreferredDisplay(fu, this.preferredUnit());
  }

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
      return new Date(new Date(print.startDate).getTime() + printTime * 1000);
    }
    return null;
  }
}
