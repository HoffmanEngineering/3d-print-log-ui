import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  FormGroupDirective,
  Validators,
} from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { ComponentCanDeactivate } from 'src/app/core/guards/pending-changes.guard';
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
export class FeedbackComponent implements OnInit, ComponentCanDeactivate {
  @ViewChild(FormGroupDirective, { static: true })
  feedbackForm: FormGroupDirective;
  public form: UntypedFormGroup;

  public readonly feedbackTypes = FeedbackType;
  public saving = false;

  constructor(
    private router: Router,
    private formBuilder: UntypedFormBuilder,
    private feedbackService: FeedbackService,
    private toastr: ToastrService,
    private titleService: Title
  ) {}

  @HostListener('window:beforeunload')
  canDeactivate(): boolean | Observable<boolean> {
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
    this.saving = true;
    const newFeedback: AddFeedback = this.getFeedbackFromForm();

    this.feedbackService.addFeedback(newFeedback).subscribe(
      (_) => {
        this.saving = false;
        this.toastr.success('Thank you for your feedback.', 'Feedback sent!');

        this.feedbackForm.resetForm({ type: FeedbackType.Suggestion });
      },
      (error) => {
        this.saving = false;
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
