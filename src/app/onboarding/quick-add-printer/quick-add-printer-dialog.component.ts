import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { PrinterDetail } from '../../core/services/printer.service';
import { QuickAddPrinterComponent } from './quick-add-printer.component';

export interface QuickAddPrinterDialogData {
  source: 'print-form' | 'checklist';
  showEmailNotice: boolean;
}

const PHONE_QUERY = '(max-width: 599.98px)';

@Component({
  selector: 'app-quick-add-printer-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule, QuickAddPrinterComponent],
  template: `
    <h2 mat-dialog-title>Add a printer</h2>
    <mat-dialog-content>
      <app-quick-add-printer
        [source]="data.source"
        [showEmailNotice]="data.showEmailNotice"
        (saved)="onSaved($event)"
      />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" mat-button mat-dialog-close>Cancel</button>
    </mat-dialog-actions>
  `,
})
export class QuickAddPrinterDialogComponent {
  private readonly dialogRef =
    inject<MatDialogRef<QuickAddPrinterDialogComponent, PrinterDetail>>(
      MatDialogRef
    );
  protected readonly data = inject<QuickAddPrinterDialogData>(MAT_DIALOG_DATA);

  onSaved(printer: PrinterDetail): void {
    this.dialogRef.close(printer);
  }
}

/** True on phone widths. Dialogs only open from user actions, so this runs in a browser. */
function isPhone(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(PHONE_QUERY).matches
  );
}

/** Opens the quick-add dialog, full screen on phones. Closes with the saved printer. */
export function openQuickAddPrinterDialog(
  dialog: MatDialog,
  data: QuickAddPrinterDialogData
): MatDialogRef<QuickAddPrinterDialogComponent, PrinterDetail | undefined> {
  const phone = isPhone();
  return dialog.open(QuickAddPrinterDialogComponent, {
    data,
    width: phone ? '100vw' : 'min(30rem, 100vw - 2rem)',
    height: phone ? '100svh' : undefined,
    maxWidth: '100vw',
    autoFocus: 'first-tabbable',
    panelClass: phone ? 'app-fullscreen-dialog' : undefined,
  });
}
