import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { MAX_TAG_UIDS, TagUidConflict, normalizeTagUid } from '../../tag-uid';

/**
 * Edits a spool's RFID/NFC tag UIDs as a form control whose value is the
 * normalized UID list. Normalizing on entry means what the user sees is what
 * the API stores, and a duplicate typed in another format merges silently,
 * as it does on the API.
 */
@Component({
  selector: 'app-filament-tag-uids',
  templateUrl: './filament-tag-uids.component.html',
  styleUrls: ['./filament-tag-uids.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    RouterLink,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilamentTagUidsComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => FilamentTagUidsComponent),
      multi: true,
    },
  ],
})
export class FilamentTagUidsComponent
  implements ControlValueAccessor, Validator
{
  /** The spool that already holds one of these tags, from a failed save. */
  readonly conflict = input<TagUidConflict | null>(null);

  protected readonly maxTags = MAX_TAG_UIDS;
  protected readonly tags = signal<string[]>([]);
  protected readonly draft = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly disabled = signal(false);
  protected readonly atCap = computed(() => this.tags().length >= MAX_TAG_UIDS);

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  writeValue(value: string[] | null): void {
    this.tags.set([...(value ?? [])]);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  /**
   * Invalid while a refused UID sits in the field. Without this the error
   * shows but the form still saves, and the UID the user typed is dropped.
   */
  validate(): ValidationErrors | null {
    const message = this.error();
    return message === null ? null : { tagUidDraft: message };
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  protected onInput(value: string): void {
    this.draft.set(value);
    this.setError(null);
  }

  /** Enter adds the tag. It must not also submit the material form. */
  protected onEnter(event: Event): void {
    event.preventDefault();
    this.add();
  }

  /**
   * A UID left in the field when the user clicks Submit is still added: blur
   * fires before the click, so the form value already includes it. An invalid
   * one marks the control invalid instead, which stops the save.
   */
  protected onBlur(): void {
    this.onTouched();
    if (this.draft().trim() !== '') {
      this.add();
    }
  }

  protected add(): void {
    if (this.atCap()) return;

    const result = normalizeTagUid(this.draft());
    if ('error' in result) {
      this.setError(result.error);
      return;
    }

    this.draft.set('');
    this.setError(null);
    if (this.tags().includes(result.uid)) return;

    this.update([...this.tags(), result.uid]);
  }

  protected remove(uid: string): void {
    this.update(this.tags().filter((t) => t !== uid));
  }

  private setError(message: string | null): void {
    if (this.error() === message) return;
    this.error.set(message);
    this.onValidatorChange();
  }

  private update(tags: string[]): void {
    this.tags.set(tags);
    this.onChange(tags);
    this.onTouched();
  }
}
