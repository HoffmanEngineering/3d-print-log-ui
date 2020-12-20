import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  AddFeedback,
  FeedbackService,
  FeedbackType,
} from 'src/app/core/services/feedback.service';
import { DialogData } from 'src/app/print/print-share-dialog/print-share-dialog.component';

export interface ParserUnavailableDialogData {
  supportedSlicers: string;
}

@Component({
  selector: 'app-parser-unavailable-dialog',
  templateUrl: './parser-unavailable-dialog.component.html',
  styleUrls: ['./parser-unavailable-dialog.component.scss'],
})
export class ParserUnavailableDialogComponent {
  public slicerFeedback: string = '';

  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly dialogRef: MatDialogRef<ParserUnavailableDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ParserUnavailableDialogData,
    private readonly toastrService: ToastrService
  ) {}

  sendFeedback(): void {
    const newFeedback: AddFeedback = {
      email: '',
      note: 'Slicer Suggestion: ' + this.slicerFeedback,
      type: FeedbackType.Other,
    };
    this.feedbackService.addFeedback(newFeedback).subscribe((_) => {
      this.toastrService.success(
        'Thank you for sending Slicer Suggestion.',
        'Suggestion Sent'
      );
      this.dialogRef.close();
    });
  }
}
