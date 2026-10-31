import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  viewChild,
  inject,
  signal,
} from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { ComponentCanDeactivate } from 'src/app/core/guards/pending-changes.guard';
import {
  AddFeedback,
  FeedbackService,
  FeedbackType,
} from 'src/app/core/services/feedback.service';

@Component({
  selector: 'app-feedback',
  host: { '(window:beforeunload)': 'canDeactivate()' },
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss'],
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedbackComponent implements OnInit, ComponentCanDeactivate {
  private router = inject(Router);
  private formBuilder = inject(UntypedFormBuilder);
  private feedbackService = inject(FeedbackService);
  private toastr = inject(ToastrService);
  private titleService = inject(Title);

  readonly feedbackForm = viewChild(FormGroupDirective);
  public form: UntypedFormGroup;

  public readonly feedbackTypes = FeedbackType;
  readonly saving = signal(false);

  canDeactivate(): boolean {
    return !this.form.dirty;
  }

  ngOnInit() {
    this.titleService.setTitle('Send Feedback - 3D Print Log');

    this.form = this.formBuilder.group({
      type: [FeedbackType.Suggestion, Validators.required],
      email: ['', Validators.email],
      note: ['', Validators.required],
    });
  }

  onSubmit() {
    this.saving.set(true);
    const newFeedback: AddFeedback = this.getFeedbackFromForm();

    this.feedbackService.addFeedback(newFeedback).subscribe(
      (_) => {
        this.saving.set(false);
        this.toastr.success('Thank you for your feedback.', 'Feedback sent!');

        this.feedbackForm().resetForm({ type: FeedbackType.Suggestion });
      },
      (error) => {
        this.saving.set(false);
        this.toastr.error(
          'Please try again in a few seconds.',
          'An error occurred.'
        );
      }
    );
  }

  handleClose() {
    this.router.navigate(['/printers']);
  }

  private getFeedbackFromForm(): AddFeedback {
    const newFeedback: AddFeedback = {
      email: this.form.get('email').value,
      note: this.form.get('note').value,
      type: this.form.get('type').value,
    };

    return newFeedback;
  }
}
