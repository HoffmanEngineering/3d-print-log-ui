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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  ProjectDetailDto,
  ProjectEditFormValue,
  ProjectViewStatus,
} from 'src/app/core/services/project.service';
import { formatCivilDate, parseCivilDate } from 'src/app/core/utils/civil-date';
import { CivilDatePipe } from 'src/app/shared/pipes/civil-date.pipe';
import { CivilDateAdapter } from 'src/app/shared/date/civil-date-adapter';

@Component({
  selector: 'app-project-edit-form',
  templateUrl: './project-edit-form.component.html',
  styleUrls: ['./project-edit-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    CivilDatePipe,
  ],
  // Scoped to this form: the stock NativeDateAdapter parses a TYPED `2026-02-01` through
  // Date.parse, which reads it as UTC midnight and therefore as the previous local day west
  // of UTC — so the form would save a different date than the one entered.
  providers: [{ provide: DateAdapter, useClass: CivilDateAdapter }],
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
    startDateOverride: FormControl<Date | null>;
    finishDateOverride: FormControl<Date | null>;
  }>;

  ngOnInit(): void {
    const p = this.project();
    // fb.group rather than fb.nonNullable.group: a clearable date control must be able to
    // hold null, and nonNullable cannot express that.
    this.form = this.fb.group({
      name: this.fb.nonNullable.control(p.name, [
        Validators.required,
        Validators.maxLength(100),
      ]),
      reference: this.fb.nonNullable.control(
        p.reference ?? '',
        Validators.maxLength(100)
      ),
      description: this.fb.nonNullable.control(
        p.description ?? '',
        Validators.maxLength(5000)
      ),
      url: this.fb.nonNullable.control(p.url ?? '', Validators.maxLength(1000)),
      viewStatus: this.fb.nonNullable.control(p.viewStatus),
      // Bound to the RAW overrides, never the resolved dates: seeding the picker with a
      // derived date would turn "automatic" into a pin the moment the user saved anything.
      startDateOverride: this.fb.control(parseCivilDate(p.startDateOverride)),
      finishDateOverride: this.fb.control(parseCivilDate(p.finishDateOverride)),
    });
  }

  clearStartDate(): void {
    this.form.controls.startDateOverride.setValue(null);
    this.form.controls.startDateOverride.markAsDirty();
  }

  clearFinishDate(): void {
    this.form.controls.finishDateOverride.setValue(null);
    this.form.controls.finishDateOverride.markAsDirty();
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (!this.form.valid) return;
    const raw = this.form.getRawValue();
    this.saved.emit({
      ...raw,
      // formatCivilDate, never toISOString: the picker hands back a LOCAL midnight, and
      // east of UTC toISOString would move it back a day.
      startDateOverride: formatCivilDate(raw.startDateOverride),
      finishDateOverride: formatCivilDate(raw.finishDateOverride),
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
