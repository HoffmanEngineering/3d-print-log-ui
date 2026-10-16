import { CurrencyPipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, catchError, filter, of, startWith, switchMap } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  MAX_TAG_NAME_LENGTH,
  PrintTagService,
  PrintTagStats,
  PrintTagStatsResponse,
  printTagErrorMessage,
} from 'src/app/core/services/print-tag.service';
import { DurationPipe } from 'src/app/shared/pipes/duration.pipe';
import { PrintTagChipComponent } from 'src/app/shared/print-tag-chip/print-tag-chip.component';
import { openSimpleDialog } from 'src/app/shared/simple-dialog/simple-dialog.component';

/** `idle` until the first answer, so nothing flashes; `error` offers a retry. */
type Phase = 'idle' | 'ready' | 'error';

/** What the colour picker shows for a tag with no colour of its own. */
const PICKER_DEFAULT = '#9e9e9e';

type TagForm = FormGroup<{
  name: FormControl<string>;
  /** Null for no colour: a native colour input cannot hold "none" itself. */
  color: FormControl<string | null>;
}>;

function tagForm(name = '', color: string | null = null): TagForm {
  return new FormGroup({
    name: new FormControl(name, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(MAX_TAG_NAME_LENGTH),
      ],
    }),
    color: new FormControl<string | null>(color),
  });
}

/**
 * The user's print tags (#7) with what each adds up to, and the one place to create, rename,
 * recolour and delete them. Tagging a print happens on the print itself.
 */
@Component({
  selector: 'app-print-tags-settings',
  templateUrl: './print-tags-settings.component.html',
  styleUrl: './print-tags-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    CurrencyPipe,
    DecimalPipe,
    NgTemplateOutlet,
    DurationPipe,
    PrintTagChipComponent,
  ],
})
export class PrintTagsSettingsComponent {
  private readonly tagService = inject(PrintTagService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly logging = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly phase = signal<Phase>('idle');
  protected readonly stats = signal<PrintTagStatsResponse | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly pickerDefault = PICKER_DEFAULT;
  protected readonly maxNameLength = MAX_TAG_NAME_LENGTH;
  protected readonly newTag = tagForm();
  protected editForm = tagForm();

  private readonly reload$ = new Subject<void>();

  constructor() {
    this.reload$
      .pipe(
        startWith(undefined),
        switchMap(() =>
          this.tagService.stats().pipe(
            catchError((error) => {
              this.logging.logException(error);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe((stats) => {
        if (stats === null) {
          this.phase.set('error');
          return;
        }
        this.stats.set(stats);
        this.phase.set('ready');
      });
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected setColor(form: TagForm, input: HTMLInputElement): void {
    form.controls.color.setValue(input.value);
  }

  protected clearColor(form: TagForm): void {
    form.controls.color.setValue(null);
  }

  protected create(): void {
    if (this.newTag.invalid || this.busy()) {
      this.newTag.markAllAsTouched();
      return;
    }
    const { name, color } = this.newTag.getRawValue();
    this.busy.set(true);
    this.tagService
      .create({ name: name.trim(), color })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.newTag.reset();
          this.logging.logEvent('PrintTagsSettings_Created', {
            hasColor: color !== null,
          });
          this.reload();
        },
        error: (error) => this.fail(error),
      });
  }

  protected startEdit(tag: PrintTagStats): void {
    this.editForm = tagForm(tag.name, tag.color);
    this.editingId.set(tag.id);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected save(tag: PrintTagStats): void {
    if (this.editForm.invalid || this.busy()) {
      this.editForm.markAllAsTouched();
      return;
    }
    const { name, color } = this.editForm.getRawValue();
    this.busy.set(true);
    this.tagService
      .update(tag.id, { name: name.trim(), color })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.editingId.set(null);
          this.logging.logEvent('PrintTagsSettings_Updated', {
            renamed: name.trim() !== tag.name,
            recoloured: color !== tag.color,
          });
          this.reload();
        },
        error: (error) => this.fail(error),
      });
  }

  protected confirmDelete(tag: PrintTagStats): void {
    const dialogRef = openSimpleDialog(
      this.dialog,
      {
        title: 'Delete this tag?',
        // No tag name in the body: the body is rendered as HTML.
        body:
          '<p>It is removed from every print that has it. The prints themselves are kept.</p>' +
          '<p>This can’t be undone.</p>',
        yesText: 'Delete',
        yesColor: 'warn',
        noText: 'Cancel',
      },
      { maxWidth: '400px' }
    );

    dialogRef
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.tagService.remove(tag.id)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.toastr.success('Tag deleted.');
          this.logging.logEvent('PrintTagsSettings_Deleted', {
            printCount: tag.printCount,
          });
          this.reload();
        },
        error: (error) => {
          this.toastr.error('Could not delete the tag. Please try again.');
          this.logging.logException(error);
        },
      });
  }

  private fail(error: Error): void {
    this.busy.set(false);
    this.toastr.error(printTagErrorMessage(error));
    this.logging.logException(error);
  }
}
