import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  MAX_TAGS_PER_PRINT,
  MAX_TAG_NAME_LENGTH,
  PrintTag,
  PrintTagService,
  printTagErrorMessage,
} from 'src/app/core/services/print-tag.service';

/** The autocomplete value of the "Create tag" option. */
const CREATE_OPTION = { create: true } as const;

/** How many existing tags the autocomplete lists at once. */
const MAX_SUGGESTIONS = 10;

/**
 * Chips for a print's tags with an autocomplete over the user's tags, which can also create a
 * new one (#7).
 *
 * With a `printId` every change is saved at once through `PUT /api/Prints/{id}/tags`, and the
 * saved set is emitted. Without one (a print that does not exist yet) changes are only
 * emitted, and the parent saves them once the print has an id.
 */
@Component({
  selector: 'app-print-tag-editor',
  templateUrl: './print-tag-editor.component.html',
  styleUrl: './print-tag-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
  ],
})
export class PrintTagEditorComponent {
  private readonly tagService = inject(PrintTagService);
  private readonly toastr = inject(ToastrService);
  private readonly logging = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);

  /** The saved print to write to, or null to only report the selection. */
  readonly printId = input<number | null>(null);
  readonly tags = input<PrintTag[] | null | undefined>([]);

  /** The print's tags after each change: as saved when there is a `printId`. */
  readonly tagsChange = output<PrintTag[]>();

  /** Follows the input, and is changed optimistically while a save is in flight. */
  readonly selected = linkedSignal<PrintTag[]>(() => this.tags() ?? []);

  /** The set the API last confirmed, which a failed save goes back to. */
  private readonly confirmed = linkedSignal<PrintTag[]>(
    () => this.tags() ?? []
  );
  private inFlight = false;
  /** The newest set chosen while a save was in flight, sent when it answers. */
  private queued: PrintTag[] | null = null;

  /** The user's tags, or null until they have loaded. */
  readonly allTags = signal<PrintTag[] | null>(null);
  readonly query = signal('');
  readonly saving = signal(false);
  private creating = false;

  readonly maxNameLength = MAX_TAG_NAME_LENGTH;
  readonly maxTags = MAX_TAGS_PER_PRINT;
  readonly createOption = CREATE_OPTION;

  readonly atLimit = computed(
    () => this.selected().length >= MAX_TAGS_PER_PRINT
  );

  private readonly trimmedQuery = computed(() => this.query().trim());

  readonly suggestions = computed(() => {
    const chosen = new Set(this.selected().map((t) => t.id));
    const q = this.trimmedQuery().toLocaleLowerCase();
    return (this.allTags() ?? [])
      .filter((t) => !chosen.has(t.id))
      .filter((t) => q === '' || t.name.toLocaleLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
  });

  /** A name was typed that none of the user's tags has, ignoring case. */
  readonly canCreate = computed(() => {
    const q = this.trimmedQuery();
    return (
      q !== '' && this.allTags() !== null && this.findByName(q) === undefined
    );
  });

  readonly createLabel = computed(() => this.trimmedQuery());

  constructor() {
    this.tagService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tags) => this.allTags.set(tags),
        error: (error) => {
          // The chips still show and can be removed; only the suggestions are missing.
          this.logging.logException(error);
          this.allTags.set([]);
        },
      });
  }

  add(tag: PrintTag): void {
    if (this.atLimit() || this.selected().some((t) => t.id === tag.id)) {
      return;
    }
    this.apply([...this.selected(), tag]);
  }

  remove(tag: PrintTag): void {
    this.apply(this.selected().filter((t) => t.id !== tag.id));
  }

  createAndAdd(rawName: string): void {
    const name = rawName.trim();
    if (name === '' || this.creating || this.atLimit()) {
      return;
    }
    const existing = this.findByName(name);
    if (existing) {
      this.add(existing);
      return;
    }

    this.creating = true;
    this.tagService
      .create({ name, color: null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tag) => {
          this.creating = false;
          this.allTags.update((all) => [...(all ?? []), tag]);
          this.logging.logEvent('PrintTagEditor_TagCreated', {
            printId: this.printId(),
          });
          this.add(tag);
        },
        error: (error) => {
          this.creating = false;
          this.toastr.error(printTagErrorMessage(error));
          this.logging.logException(error);
        },
      });
  }

  onOptionSelected(
    event: MatAutocompleteSelectedEvent,
    field: HTMLInputElement
  ): void {
    const value = event.option.value as PrintTag | typeof CREATE_OPTION;
    if (value === CREATE_OPTION) {
      this.createAndAdd(this.query());
    } else {
      this.add(value as PrintTag);
    }
    this.clearInput(field);
  }

  /** Enter in the input: an exact name picks that tag, anything else creates one. */
  onTokenEnd(event: MatChipInputEvent): void {
    const name = event.value.trim();
    if (name !== '') {
      this.createAndAdd(name);
    }
    this.clearInput(event.chipInput.inputElement);
  }

  private clearInput(field: HTMLInputElement): void {
    field.value = '';
    this.query.set('');
  }

  private findByName(name: string): PrintTag | undefined {
    const wanted = name.trim().toLocaleLowerCase();
    return (this.allTags() ?? []).find(
      (t) => t.name.trim().toLocaleLowerCase() === wanted
    );
  }

  private apply(next: PrintTag[]): void {
    const printId = this.printId();
    if (printId === null) {
      this.selected.set(next);
      this.tagsChange.emit(next);
      return;
    }

    this.selected.set(next);
    // One PUT at a time. Each one replaces the whole set, so two in flight could land in either
    // order and leave the print with the older set. Changes made meanwhile are coalesced: only
    // the latest set is sent once the current request answers.
    if (this.inFlight) {
      this.queued = next;
      return;
    }
    this.send(printId, next);
  }

  private send(printId: number, next: PrintTag[]): void {
    this.inFlight = true;
    this.saving.set(true);
    this.tagService
      .setPrintTags(
        printId,
        next.map((t) => t.id)
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.confirmed.set(saved);
          const queued = this.queued;
          if (queued !== null) {
            // This answer is already stale: the selection on screen is newer. Send that.
            this.queued = null;
            this.send(printId, queued);
            return;
          }
          this.inFlight = false;
          this.saving.set(false);
          this.selected.set(saved);
          this.tagsChange.emit(saved);
          this.logging.logEvent('PrintTagEditor_TagsSaved', {
            printId,
            count: saved.length,
          });
        },
        error: (error) => {
          this.inFlight = false;
          this.queued = null;
          this.saving.set(false);
          this.selected.set(this.confirmed());
          this.toastr.error(
            'Could not save the print’s tags. Please try again.'
          );
          this.logging.logException(error);
        },
      });
  }
}
