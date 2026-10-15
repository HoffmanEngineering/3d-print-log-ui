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
 * Standalone on purpose. Root-provided services open this dialog directly (the release note
 * popup fires on login, before any lazy feature module has run), so it cannot depend on
 * SharedModule for its directive scope: an NgModule that has never been evaluated registers no
 * scope, Angular silently drops the unmatched `mat-*` attribute directives, and the dialog
 * renders as bare HTML.
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
