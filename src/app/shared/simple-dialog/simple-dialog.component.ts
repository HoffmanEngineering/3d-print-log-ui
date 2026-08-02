import { Component, Inject, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { DialogData } from 'src/app/print/print-share-dialog/print-share-dialog.component';

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
})
export class SimpleDialogComponent {
  @Input() public title: string;
  @Input() public yesText = 'Yes';
  @Input() public yesColor = 'primary';
  @Input() public noText = 'No';
  @Input() public noColor = 'primary';
  @Input() public body: string;

  constructor(
    public dialogRef: MatDialogRef<SimpleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
