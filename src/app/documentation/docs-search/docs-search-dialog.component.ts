import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, take } from 'rxjs/operators';

import { DeferredSkeletonController } from 'src/app/shared/skeleton/deferred-skeleton';
import { DocsTelemetryService } from '../docs-telemetry.service';
import { DocSearchResult, DocsSearchService } from './docs-search.service';

/** How long typing settles before a search runs, and a Docs_Search is logged. */
const DEBOUNCE_MS = 250;

/** Below this a query matches most of the corpus and means nothing. */
const MIN_QUERY_LENGTH = 2;

@Component({
  selector: 'app-docs-search-dialog',
  templateUrl: './docs-search-dialog.component.html',
  styleUrls: ['./docs-search-dialog.component.scss'],
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsSearchDialogComponent {
  readonly query = new FormControl('', { nonNullable: true });

  readonly results = signal<readonly DocSearchResult[]>([]);
  /** Index of the keyboard-highlighted result. */
  readonly active = signal(0);
  /** True once a search has run, so "no results" is not shown at rest. */
  readonly searched = signal(false);

  private readonly skeleton = new DeferredSkeletonController();
  readonly loading = this.skeleton.visible;

  @ViewChild('input', { static: true })
  private readonly input?: ElementRef<HTMLInputElement>;

  private readonly search = inject(DocsSearchService);
  private readonly telemetry = inject(DocsTelemetryService);
  private readonly router = inject(Router);
  private readonly dialogRef = inject(MatDialogRef<DocsSearchDialogComponent>);
  private readonly data = inject<{ query?: string } | null>(MAT_DIALOG_DATA, {
    optional: true,
  });

  /** The query the current results answer; reported with a result click. */
  private lastQuery = '';

  constructor() {
    // The engine and index are ~55 KB and the reader is about to type into this
    // box, so the import starts now rather than on the first keystroke.
    this.search.preload();

    this.query.valueChanges
      .pipe(
        debounceTime(DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe((value) => void this.run(value));

    inject(DestroyRef).onDestroy(() => this.skeleton.destroy());

    // Opened from the sidebar box, which may already have something typed in it.
    if (this.data?.query) {
      this.query.setValue(this.data.query);
    }
  }

  open(result: DocSearchResult, rank: number): void {
    this.telemetry.trackSearchResultClick(this.lastQuery, result.path, rank);
    this.closeThenNavigate(result.url);
  }

  /** Arrow keys move the highlight, Enter opens it. Escape is MatDialog's. */
  onKeydown(event: KeyboardEvent): void {
    const results = this.results();

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length === 0) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      // Wraps, so Up from the first result reaches the last one.
      this.active.set(
        (this.active() + delta + results.length) % results.length
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const result = results[this.active()];
      if (result) this.open(result, this.active());
    }
  }

  focusInput(): void {
    this.input?.nativeElement.focus();
  }

  /**
   * The zero-result path. A search that found nothing is the moment the reader
   * knows exactly what they wanted and we do not have it, so it is the best
   * place in the whole product to ask for that in their own words.
   */
  openFeedback(): void {
    this.closeThenNavigate('/feedback');
  }

  /**
   * Navigates only once the dialog has finished closing.
   *
   * MatDialog blocks scrolling while it is open by pinning `html` in place, and
   * releasing that block RESTORES the scroll position the reader was at. A
   * navigation to `#anchor` issued before then is scrolled correctly and then
   * silently undone — the reader lands at the top of the page they searched
   * for, which is the one thing section-level results exist to avoid.
   */
  private closeThenNavigate(url: string): void {
    this.dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe(() => void this.router.navigateByUrl(url));
    this.dialogRef.close();
  }

  /**
   * Runs a search and reports it.
   *
   * `Docs_Search` is emitted for every settled query INCLUDING the ones that
   * found nothing — a zero-result search is the most actionable row in the whole
   * analytics set, since each one is something a real person expected to exist.
   */
  private async run(raw: string): Promise<void> {
    const query = raw.trim();

    if (query.length < MIN_QUERY_LENGTH) {
      this.results.set([]);
      this.searched.set(false);
      this.lastQuery = '';
      return;
    }

    this.skeleton.start();
    try {
      const results = await this.search.search(query);

      // A slower earlier search must not overwrite a newer one's results.
      if (this.query.value.trim() !== query) {
        return;
      }

      this.lastQuery = query;
      this.results.set(results);
      this.active.set(0);
      this.searched.set(true);
      this.telemetry.trackSearch(query, results.length);
    } finally {
      this.skeleton.stop();
    }
  }
}
