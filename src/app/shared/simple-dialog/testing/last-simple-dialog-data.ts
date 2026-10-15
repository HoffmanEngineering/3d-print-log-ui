import { MatDialog } from '@angular/material/dialog';
import { SimpleDialogData } from '../simple-dialog.component';

/** The data handed to the most recent `MatDialog.open` call on a spy. */
export function lastSimpleDialogData(
  dialog: jasmine.SpyObj<MatDialog>
): SimpleDialogData {
  return dialog.open.calls.mostRecent().args[1]?.data as SimpleDialogData;
}
