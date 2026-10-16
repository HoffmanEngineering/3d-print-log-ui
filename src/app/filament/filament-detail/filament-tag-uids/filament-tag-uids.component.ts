import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  forwardRef,
  inject,
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
import { Subscription, take } from 'rxjs';
import { FilamentService } from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { FilamentTagDetail, TagReading } from 'src/app/core/types/tag-reading';
import { TagReaderService } from 'src/app/core/services/tag-reader.service';
import { formatLabel } from '../../tag-format-label';
import {
  MAX_TAG_UIDS,
  TagUidConflict,
  normalizeTagUid,
  tagUidKey,
} from '../../tag-uid';

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
    DatePipe,
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

  /** This spool's id, so a scanned tag it already holds is not reported as a conflict. */
  readonly filamentId = input<string | null>(null);

  /** What each tag says, from the API. Matched to the rows by normalized UID. */
  readonly tagDetails = input<FilamentTagDetail[]>([]);

  /** Set when the material came from the SpoolmanDB catalog. */
  readonly catalogEntryId = input<string | null>(null);

  private readonly tagReader = inject(TagReaderService);
  private readonly filamentService = inject(FilamentService);
  private readonly loggingService = inject(LoggingService);

  /** Shown only in an app shell that can read tags. */
  protected readonly canScan = this.tagReader.available;
  protected readonly scanning = signal(false);
  protected readonly hint = signal<string | null>(null);

  /**
   * Another spool holding a tag just scanned. Found at scan time, so the user hears about it
   * before Submit; the save-time 409 (`conflict`) stays the authority.
   */
  protected readonly scanConflict = signal<TagUidConflict | null>(null);
  protected readonly shownConflict = computed(
    () => this.conflict() ?? this.scanConflict()
  );

  private scanSubscription: Subscription | null = null;

  protected readonly maxTags = MAX_TAG_UIDS;
  protected readonly tags = signal<string[]>([]);
  protected readonly draft = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly disabled = signal(false);
  protected readonly atCap = computed(() => this.tags().length >= MAX_TAG_UIDS);

  /** One entry per listed UID whose tag has a decoded reading. Others show only the chip. */
  protected readonly readings = computed(() => {
    const byUid = new Map(this.tagDetails().map((d) => [tagUidKey(d.uid), d]));
    return this.tags().flatMap((uid) => {
      const detail = byUid.get(tagUidKey(uid));
      return detail?.reading
        ? [
            {
              uid,
              format: formatLabel(detail.format ?? detail.reading.format),
              ...describeReading(detail.reading),
            },
          ]
        : [];
    });
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopScanning());
  }

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  writeValue(value: string[] | null): void {
    this.tags.set([...(value ?? [])]);
    this.scanConflict.set(null);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.stopScanning();
    }
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
    this.hint.set(null);
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
    this.addUid(result.uid);
  }

  /** Adds a normalized UID. A duplicate typed in another format merges silently. */
  protected addUid(uid: string): 'added' | 'duplicate' | 'cap' {
    if (this.tags().includes(uid)) return 'duplicate';
    if (this.atCap()) return 'cap';

    this.update([...this.tags(), uid]);
    return 'added';
  }

  /** Reads one tag, or cancels the read in progress. */
  protected toggleScan(): void {
    if (this.scanning()) {
      this.stopScanning();
      return;
    }

    this.hint.set(null);
    this.scanning.set(true);
    this.scanSubscription = this.tagReader
      .listen()
      .pipe(take(1))
      .subscribe((read) => {
        this.stopScanning();
        this.loggingService.logEvent('FilamentTagUids_Scanned');
        if (this.addUid(read.uid) === 'duplicate') {
          this.hint.set('That tag is already on this spool');
          return;
        }
        this.checkHolder(read.uid);
      });
  }

  private stopScanning(): void {
    this.scanSubscription?.unsubscribe();
    this.scanSubscription = null;
    this.scanning.set(false);
  }

  private checkHolder(uid: string): void {
    this.filamentService.getFilamentByTag(uid).subscribe({
      next: (holder) => {
        this.loggingService.logEvent('TagReader_Lookup', {
          known: holder !== null,
        });
        // The chip may have been removed while the lookup was out.
        if (
          holder &&
          holder.id !== this.filamentId() &&
          this.tags().includes(uid)
        ) {
          this.scanConflict.set({
            tagUid: uid,
            filamentId: holder.id,
            filamentDisplayName: holder.displayName || 'another material',
          });
        }
      },
      error: (err: { status?: number }) => {
        // The tag is added anyway; Submit's 409 still catches a conflict.
        this.loggingService.logEvent('TagReader_LookupFailed', {
          status: err?.status ?? 0,
        });
        this.tagReader.forget(uid);
      },
    });
  }

  protected remove(uid: string): void {
    if (this.scanConflict()?.tagUid === uid) {
      this.scanConflict.set(null);
    }
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

function range(min?: number, max?: number, single?: number): string | null {
  const lo = min ?? max ?? single;
  const hi = max ?? min ?? single;
  if (lo == null || hi == null) return null;
  return lo === hi ? `${lo} °C` : `${lo}–${hi} °C`;
}

/** An ISO date-only string as a local date, so the date pipe cannot shift it a day. */
function localDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const date = new Date(y, mo - 1, d);
  // Date rolls overflow forward (Feb 30 becomes Mar 2), so require a round trip.
  return date.getFullYear() === y &&
    date.getMonth() === mo - 1 &&
    date.getDate() === d
    ? date
    : null;
}

function describeReading(r: TagReading) {
  const hotend = range(r.hotendMinC, r.hotendMaxC, r.hotendC);
  const bed = range(r.bedMinC, r.bedMaxC);
  return {
    sku: r.sku || null,
    made: r.manufacturedOn ? localDate(r.manufacturedOn) : null,
    drying:
      r.dryTempC != null
        ? `Dry at ${r.dryTempC} °C${r.dryHours != null ? ` for ${r.dryHours} h` : ''}`
        : null,
    temps:
      hotend || bed
        ? `Tag says ${[hotend, bed ? `bed ${bed}` : null].filter(Boolean).join(', ')}`
        : null,
  };
}
