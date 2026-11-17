import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogConfig,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

export interface SimpleDialogData {
  /** Omitted or empty renders no heading. */
  title?: string;
  /** Trusted HTML; rendered with `[innerHtml]`. */
  body: string;
  /** Defaults to `Yes`. */
  yesText?: string;
  /** Defaults to `primary`. */
  yesColor?: string;
  /** Defaults to `No`; an empty string hides the dismiss button. */
  noText?: string;
  /** Defaults to `primary`. */
  noColor?: string;
}

/**
 * Imports its own directives on purpose. Root-provided services open this dialog directly (the
 * release note popup fires on login, before any lazy section has run), and Angular silently
 * drops a `mat-*` attribute directive no import supplies, so borrowing a section's scope would
 * render the dialog as bare HTML.
 */
@Component({
  selector: 'app-simple-dialog',
  templateUrl: './simple-dialog.component.html',
  styleUrls: ['./simple-dialog.component.scss'],
  imports: [MatButtonModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleDialogComponent {
  private readonly dialogRef =
    inject<MatDialogRef<SimpleDialogComponent>>(MatDialogRef);
  private readonly data = inject<SimpleDialogData>(MAT_DIALOG_DATA);

  protected readonly title = this.data.title;
  protected readonly body = this.data.body;
  protected readonly yesText = this.data.yesText ?? 'Yes';
  protected readonly yesColor = this.data.yesColor ?? 'primary';
  protected readonly noText = this.data.noText ?? 'No';
  protected readonly noColor = this.data.noColor ?? 'primary';

  onNoClick(): void {
    this.dialogRef.close();
  }
}

/**
 * Opens a {@link SimpleDialogComponent}. `afterClosed()` emits `true` when confirmed and
 * `undefined` when dismissed.
 */
export function openSimpleDialog(
  dialog: MatDialog,
  data: SimpleDialogData,
  config: Omit<MatDialogConfig<SimpleDialogData>, 'data'> = {}
): MatDialogRef<SimpleDialogComponent, boolean> {
  return dialog.open<SimpleDialogComponent, SimpleDialogData, boolean>(
    SimpleDialogComponent,
    { ...config, data }
  );
}
