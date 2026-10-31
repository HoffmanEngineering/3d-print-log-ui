import { MatDialog } from '@angular/material/dialog';
import type { MockedObject } from 'vitest';
import { SimpleDialogData } from '../simple-dialog.component';

/** The data handed to the most recent `MatDialog.open` call on a mock. */
export function lastSimpleDialogData(
  dialog: MockedObject<MatDialog>
): SimpleDialogData {
  return dialog.open.mock.lastCall?.[1]?.data as SimpleDialogData;
}
