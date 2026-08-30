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

import { LoggingService } from 'src/app/core/services/logging.service';
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
  /**
   * True when the last owned search threw. The engine and the index arrive over
   * the network, so a search CAN fail — and a palette that silently goes quiet
   * looks like a query that matched nothing.
   */
  readonly failed = signal(false);

  private readonly skeleton = new DeferredSkeletonController();
  readonly loading = this.skeleton.visible;

  @ViewChild('input', { static: true })
  private readonly input?: ElementRef<HTMLInputElement>;

  @ViewChild('list', { static: true })
  private readonly list?: ElementRef<HTMLElement>;

  private readonly search = inject(DocsSearchService);
  private readonly telemetry = inject(DocsTelemetryService);
  private readonly router = inject(Router);
  private readonly logging = inject(LoggingService);
  private readonly dialogRef = inject(MatDialogRef<DocsSearchDialogComponent>);
  private readonly data = inject<{ query?: string } | null>(MAT_DIALOG_DATA, {
    optional: true,
  });

  /** The query the current results answer; reported with a result click. */
  private lastQuery = '';

  /**
   * Which invocation of `run` owns the displayed state.
   *
   * Comparing the query text instead would let an older `foo` commit after the
   * box has gone `foo -> bar -> foo`, re-reporting the search and resetting the
   * highlight under the reader. Only the newest invocation may publish.
   */
  private generation = 0;

  /**
   * One release per loader start that has not been handed back yet.
   *
   * A shared count is NOT enough: after `A -> clear -> B`, a late `stop()` from
   * A would decrement the count B is holding and hide B's placeholder while B
   * is still running. Each invocation gets its own idempotent release instead,
   * so settling late is a no-op once that start has already been given back.
   */
  private readonly releases = new Set<() => void>();

  /** Set once the dialog is closing to navigate; a second Enter must not add another. */
  private navigating = false;

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
    // Only the activation that actually takes the dialog down is reported. A
    // held Enter reaches this twice, and search-quality.kql averages the rank
    // of a click — counting the same one twice quietly skews that average.
    if (this.closeThenNavigate(result.url)) {
      this.telemetry.trackSearchResultClick(this.lastQuery, result.path, rank);
    }
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
      // The list scrolls at 12 results; without this the highlight walks off
      // the bottom while focus — and so the viewport — stays on the input.
      this.scrollActiveIntoView();
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

  /** Keeps the aria-activedescendant option inside the scrolling result list. */
  private scrollActiveIntoView(): void {
    const option = this.list?.nativeElement.children[this.active()];
    option?.scrollIntoView?.({ block: 'nearest' });
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
  /** @returns whether this call is the one that owns the close */
  private closeThenNavigate(url: string): boolean {
    // `close()` only starts the animation, so a held Enter or a double click
    // gets here again while the first navigation is still waiting on it. Each
    // pass would subscribe again and every subscription would fire on the one
    // close, navigating two or three times.
    if (this.navigating) {
      return false;
    }
    this.navigating = true;

    this.dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe(() => void this.router.navigateByUrl(url));
    this.dialogRef.close();
    return true;
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

    const generation = ++this.generation;

    if (query.length < MIN_QUERY_LENGTH) {
      this.results.set([]);
      this.searched.set(false);
      this.failed.set(false);
      this.lastQuery = '';
      // Emptying the box ends the wait it described: leaving the placeholder up
      // until a superseded search settles reads as a query that is still running.
      this.releaseLoaders();
      return;
    }

    const release = this.startLoader();
    try {
      const results = await this.search.search(query);

      // BOTH guards are load-bearing. The generation stops an older invocation
      // committing once a newer one exists — `mat -> material -> mat` would
      // otherwise let the first `mat` re-report. The input comparison covers
      // the window the generation cannot see: while the reader types the next
      // query its run has not started yet, so nothing has advanced the
      // generation, and an answer to the query they have already left would
      // publish under the text now in the box.
      if (generation !== this.generation || this.query.value.trim() !== query) {
        return;
      }

      this.lastQuery = query;
      this.results.set(results);
      this.active.set(0);
      this.searched.set(true);
      this.failed.set(false);
      this.telemetry.trackSearch(query, results.length);
    } catch (error) {
      this.logging.logException(error);
      if (generation !== this.generation || this.query.value.trim() !== query) {
        return;
      }

      // The old results answered a query that is no longer in the box, so they
      // are cleared rather than left looking like an answer to this one.
      this.results.set([]);
      this.lastQuery = '';
      this.searched.set(false);
      this.failed.set(true);
    } finally {
      release();
    }
  }

  /** @returns the one release for this start; safe to call more than once */
  private startLoader(): () => void {
    this.skeleton.start();

    let released = false;
    const release = () => {
      if (released) {
        return;
      }
      released = true;
      this.releases.delete(release);
      this.skeleton.stop();
    };

    this.releases.add(release);
    return release;
  }

  private releaseLoaders(): void {
    for (const release of [...this.releases]) {
      release();
    }
  }
}
