import { Component, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormGroupDirective,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  AddFeedback,
  FeedbackService,
  FeedbackType,
} from 'src/app/core/services/feedback.service';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss'],
})
export class FeedbackComponent implements OnInit {
  @ViewChild(FormGroupDirective, { static: true })
  feedbackForm: FormGroupDirective;
  public form: FormGroup;

  public readonly feedbackTypes = FeedbackType;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private feedbackService: FeedbackService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.form = this.formBuilder.group({
      type: [FeedbackType.Suggestion, Validators.required],
      email: ['', Validators.email],
      note: ['', Validators.required],
    });
  }

  onSubmit() {
    console.log(this.form.getRawValue());

    const newFeedback: AddFeedback = this.getFeedbackFromForm();

    this.feedbackService.addFeedback(newFeedback).subscribe(
      _ => {
        this.toastr.success('Thank you for your feedback.', 'Feedback sent!');

        this.feedbackForm.resetForm({ type: FeedbackType.Suggestion });
      },
      error => {
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
