import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  ProjectDetailDto,
  ProjectEditFormValue,
  ProjectViewStatus,
} from 'src/app/core/services/project.service';

@Component({
  selector: 'app-project-edit-form',
  templateUrl: './project-edit-form.component.html',
  styleUrls: ['./project-edit-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
})
export class ProjectEditFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  project = input.required<ProjectDetailDto>();
  isSaving = input(false);

  saved = output<ProjectEditFormValue>();
  cancelled = output<void>();

  readonly ProjectViewStatus = ProjectViewStatus;

  form!: FormGroup<{
    name: FormControl<string>;
    reference: FormControl<string>;
    description: FormControl<string>;
    url: FormControl<string>;
    viewStatus: FormControl<ProjectViewStatus>;
  }>;

  ngOnInit(): void {
    const p = this.project();
    this.form = this.fb.nonNullable.group({
      name: [p.name, Validators.required],
      reference: [p.reference ?? ''],
      description: [p.description ?? ''],
      url: [p.url ?? ''],
      viewStatus: [p.viewStatus],
    });
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (!this.form.valid) return;
    this.saved.emit(this.form.getRawValue());
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
