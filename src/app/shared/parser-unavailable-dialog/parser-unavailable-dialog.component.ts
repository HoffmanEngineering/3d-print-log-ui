import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  AddFeedback,
  FeedbackService,
  FeedbackType,
} from 'src/app/core/services/feedback.service';

export interface ParserUnavailableDialogData {
  supportedSlicers: string;
}

@Component({
  selector: 'app-parser-unavailable-dialog',
  templateUrl: './parser-unavailable-dialog.component.html',
  styleUrls: ['./parser-unavailable-dialog.component.scss'],
  standalone: false,
})
export class ParserUnavailableDialogComponent {
  private readonly feedbackService = inject(FeedbackService);
  private readonly dialogRef =
    inject<MatDialogRef<ParserUnavailableDialogComponent>>(MatDialogRef);
  data = inject<ParserUnavailableDialogData>(MAT_DIALOG_DATA);
  private readonly toastrService = inject(ToastrService);

  public slicerFeedback = '';

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
