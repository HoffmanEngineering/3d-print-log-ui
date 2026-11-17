import type { MockedObject } from 'vitest';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { LoggingService } from 'src/app/core/services/logging.service';
import { DocsTelemetryService } from '../docs-telemetry.service';
import { DocsSearchDialogComponent } from './docs-search-dialog.component';
import { DocSearchResult, DocsSearchService } from './docs-search.service';

/** Longer than DEBOUNCE_MS, so a typed query has definitely settled. */
const AFTER_DEBOUNCE_MS = 300;

const result = (over: Partial<DocSearchResult> = {}): DocSearchResult => ({
  id: 'docs/materials::3',
  title: 'Adding a Material',
  page: 'Materials',
  url: '/docs/materials#adding',
  path: 'docs/materials',
  excerpt: 'Add a material from the list.',
  ...over,
});

describe('DocsSearchDialogComponent', () => {
  let fixture: ComponentFixture<DocsSearchDialogComponent>;
  let component: DocsSearchDialogComponent;
  let search: MockedObject<DocsSearchService>;
  let telemetry: MockedObject<DocsTelemetryService>;
  let dialogRef: MockedObject<MatDialogRef<DocsSearchDialogComponent>>;
  let router: MockedObject<Router>;
  let closed: Subject<unknown>;

  async function setup(
    data: {
      query?: string;
    } | null = null
  ) {
    search = {
      search: vi.fn().mockName('DocsSearchService.search'),
      preload: vi.fn().mockName('DocsSearchService.preload'),
    } as unknown as MockedObject<DocsSearchService>;
    search.search.mockResolvedValue([]);

    telemetry = {
      trackSearch: vi.fn().mockName('DocsTelemetryService.trackSearch'),
      trackSearchResultClick: vi
        .fn()
        .mockName('DocsTelemetryService.trackSearchResultClick'),
    } as unknown as MockedObject<DocsTelemetryService>;
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close'),
      afterClosed: vi.fn().mockName('MatDialogRef.afterClosed'),
    } as unknown as MockedObject<MatDialogRef<DocsSearchDialogComponent, any>>;
    // The component navigates only once the dialog has finished closing, so the
    // stub has to actually complete rather than just record the call.
    closed = new Subject<unknown>();
    dialogRef.afterClosed.mockReturnValue(closed.asObservable() as never);
    dialogRef.close.mockImplementation(() => {
      closed.next(undefined);
      closed.complete();
    });
    router = {
      navigateByUrl: vi.fn().mockName('Router.navigateByUrl'),
    } as unknown as MockedObject<Router>;

    await TestBed.configureTestingModule({
      imports: [DocsSearchDialogComponent],
      providers: [
        { provide: DocsSearchService, useValue: search },
        { provide: DocsTelemetryService, useValue: telemetry },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: Router, useValue: router },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(DocsSearchDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /** Types a query and lets the debounce and the search promise settle. */
  async function type(query: string) {
    component.query.setValue(query);
    await new Promise((resolve) => setTimeout(resolve, AFTER_DEBOUNCE_MS));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('starts the import before the first keystroke', async () => {
    await setup();

    // ~55 KB of engine and index; waiting for the first keystroke to start it
    // puts the whole download in front of the first result.
    expect(search.preload).toHaveBeenCalled();
  });

  it('searches once typing settles', async () => {
    await setup();
    search.search.mockResolvedValue([result()]);

    await type('material');

    expect(search.search).toHaveBeenCalledWith('material');
    expect(component.results().length).toBe(1);
  });

  it('reports the search with its result count', async () => {
    await setup();
    search.search.mockResolvedValue([result(), result({ id: 'b' })]);

    await type('material');

    expect(telemetry.trackSearch).toHaveBeenCalledWith('material', 2);
  });

  it('reports a search that found nothing', async () => {
    // zero-result-searches.kql is the most actionable query in the analytics
    // set and it is fed entirely by these.
    await setup();
    search.search.mockResolvedValue([]);

    await type('kryptonite');

    expect(telemetry.trackSearch).toHaveBeenCalledWith('kryptonite', 0);
  });

  it('does not search or report a query too short to mean anything', async () => {
    await setup();

    await type('m');

    expect(search.search).not.toHaveBeenCalled();
    expect(telemetry.trackSearch).not.toHaveBeenCalled();
    expect(component.searched()).toBe(false);
  });

  it('trims the query before searching and reporting', async () => {
    await setup();

    await type('  material  ');

    expect(search.search).toHaveBeenCalledWith('material');
    expect(telemetry.trackSearch).toHaveBeenCalledWith('material', 0);
  });

  it('reports a clicked result with its query, page and rank', async () => {
    await setup();
    search.search.mockResolvedValue([result(), result({ id: 'b' })]);
    await type('material');

    component.open(component.results()[1], 1);

    expect(telemetry.trackSearchResultClick).toHaveBeenCalledWith(
      'material',
      'docs/materials',
      1
    );
  });

  it('closes and navigates to the section a result names', async () => {
    await setup();
    search.search.mockResolvedValue([result()]);
    await type('material');

    component.open(component.results()[0], 0);

    expect(dialogRef.close).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/docs/materials#adding');
  });

  describe('keyboard', () => {
    const key = (k: string) =>
      new KeyboardEvent('keydown', { key: k, cancelable: true });

    beforeEach(async () => {
      await setup();
      search.search.mockResolvedValue([
        result({ id: 'a' }),
        result({ id: 'b' }),
        result({ id: 'c' }),
      ]);
      await type('material');
    });

    it('moves the highlight down and up', () => {
      component.onKeydown(key('ArrowDown'));
      expect(component.active()).toBe(1);

      component.onKeydown(key('ArrowUp'));
      expect(component.active()).toBe(0);
    });

    it('wraps from the first result to the last', () => {
      component.onKeydown(key('ArrowUp'));

      expect(component.active()).toBe(2);
    });

    it('opens the highlighted result on Enter', () => {
      component.onKeydown(key('ArrowDown'));
      component.onKeydown(key('Enter'));

      expect(telemetry.trackSearchResultClick).toHaveBeenCalledWith(
        'material',
        'docs/materials',
        1
      );
    });

    it('takes the arrow keys from the input, which would move the caret', () => {
      const event = key('ArrowDown');
      component.onKeydown(event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  it('does nothing on Enter with no results', async () => {
    // Its own setup, not the keyboard block's: that one seeds three results.
    await setup();
    await type('kryptonite');

    component.onKeydown(
      new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    );

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('carries a query typed elsewhere into the box', async () => {
    await setup({ query: 'spool' });

    expect(component.query.value).toBe('spool');
  });

  it('sends a reader who found nothing to feedback', async () => {
    await setup();

    component.openFeedback();

    expect(dialogRef.close).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/feedback');
  });

  it('says so when the search itself fails, rather than going quiet', async () => {
    // The engine and the index are fetched, so this is a network failure, not a
    // theoretical one. Reporting it as "0 results" would be a lie.
    await setup();
    search.search.mockResolvedValue([result()]);
    await type('material');

    search.search.mockImplementation(() =>
      Promise.reject(new Error('chunk load failed'))
    );
    await type('materials');

    expect(component.failed()).toBe(true);
    expect(component.results()).toEqual([]);
    expect(component.searched()).toBe(false);
    expect(telemetry.trackSearch).toHaveBeenCalledTimes(1);
  });

  it('logs a failed search', async () => {
    await setup();
    const logging = TestBed.inject(LoggingService);
    const logException = vi
      .spyOn(logging, 'logException')
      .mockReturnValue(undefined);
    search.search.mockImplementation(() =>
      Promise.reject(new Error('chunk load failed'))
    );

    await type('material');

    expect(logException).toHaveBeenCalled();
  });

  it('clears the failure once a later search succeeds', async () => {
    await setup();
    search.search.mockImplementation(() =>
      Promise.reject(new Error('chunk load failed'))
    );
    await type('material');

    search.search.mockResolvedValue([result()]);
    await type('materials');

    expect(component.failed()).toBe(false);
    expect(component.results().length).toBe(1);
  });

  it('ends the wait when the box is emptied mid-search', async () => {
    // Otherwise "Searching…" describes a query that is no longer there, and it
    // stays up until a search nobody is waiting for finally settles.
    await setup();
    let releaseFirst: (value: DocSearchResult[]) => void = () => undefined;
    search.search.mockReturnValue(
      new Promise<DocSearchResult[]>((resolve) => {
        releaseFirst = resolve;
      })
    );

    component.query.setValue('material');
    // The debounce, and then the placeholder's own 200ms reveal delay.
    await new Promise((resolve) =>
      setTimeout(resolve, AFTER_DEBOUNCE_MS + 300)
    );
    expect(component.loading()).toBe(true);

    await type('');
    // Past the placeholder's minimum dwell, which outlives the release itself.
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(component.loading()).toBe(false);

    releaseFirst([result()]);
    await fixture.whenStable();
    expect(component.results()).toEqual([]);
  });

  it('keeps the wait up for a newer search when an abandoned one settles', async () => {
    // A -> clear -> B -> A settles. A shared loader count would let A's late
    // settle hand back the placeholder B is still holding.
    await setup();
    const pending: Array<(value: DocSearchResult[]) => void> = [];
    search.search.mockImplementation(
      () => new Promise<DocSearchResult[]>((resolve) => pending.push(resolve))
    );

    await type('material');
    await type('');
    component.query.setValue('spool');
    await new Promise((resolve) =>
      setTimeout(resolve, AFTER_DEBOUNCE_MS + 300)
    );
    expect(component.loading()).toBe(true);

    // The abandoned first search finally answers.
    pending[0]([result({ id: 'stale' })]);
    await fixture.whenStable();

    expect(component.loading()).toBe(true);
    expect(component.results()).toEqual([]);
  });

  it('withholds an answer to a query the reader has already moved on from', async () => {
    // The generation alone cannot see this: while the reader types the next
    // query its run has not started, so nothing has advanced the generation and
    // the older answer would publish under the text now in the box.
    await setup();

    let releaseFirst: (value: DocSearchResult[]) => void = () => undefined;
    search.search
      .mockReturnValueOnce(
        new Promise<DocSearchResult[]>((resolve) => {
          releaseFirst = resolve;
        })
      )
      .mockReturnValueOnce(Promise.resolve([result({ id: 'second' })]));

    await type('mat');
    // Typed, but its debounce has not fired: no second run yet.
    component.query.setValue('material');

    releaseFirst([result({ id: 'first' })]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.results()).toEqual([]);
    expect(telemetry.trackSearch).not.toHaveBeenCalledWith('mat', 1);
  });

  it('reports one click when the reader activates a result twice', async () => {
    // search-quality.kql averages the rank of a click, so counting a held
    // Enter twice quietly skews it.
    await setup();
    search.search.mockResolvedValue([result()]);
    await type('material');

    component.open(component.results()[0], 0);
    component.open(component.results()[0], 0);

    expect(telemetry.trackSearchResultClick).toHaveBeenCalledTimes(1);
  });

  it('navigates once when the reader activates a result twice', async () => {
    // `close()` only starts the animation, so a held Enter gets a second pass in
    // before the first navigation runs.
    await setup();
    search.search.mockResolvedValue([result()]);
    await type('material');

    component.open(component.results()[0], 0);
    component.open(component.results()[0], 0);

    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
  });

  it('ignores a slow response for a query the box has since returned to', async () => {
    // mat -> material -> mat: the first response arrives when the box reads
    // "mat" again, so a text comparison would let it commit and re-report.
    await setup();

    let releaseFirst: (value: DocSearchResult[]) => void = () => undefined;
    search.search
      .mockReturnValueOnce(
        new Promise<DocSearchResult[]>((resolve) => {
          releaseFirst = resolve;
        })
      )
      .mockReturnValueOnce(Promise.resolve([result({ id: 'second' })]))
      .mockReturnValueOnce(Promise.resolve([result({ id: 'third' })]));

    component.query.setValue('mat');
    await new Promise((resolve) => setTimeout(resolve, AFTER_DEBOUNCE_MS));
    await type('material');
    await type('mat');

    releaseFirst([result({ id: 'first' })]);
    await fixture.whenStable();

    expect(component.results().map((r) => r.id)).toEqual(['third']);
    expect(telemetry.trackSearch).toHaveBeenCalledTimes(2);
  });

  it('ignores a slow response for a query that has since changed', async () => {
    await setup();

    // The first search resolves after the second has already been typed.
    let releaseFirst: (value: DocSearchResult[]) => void = () => undefined;
    search.search
      .mockReturnValueOnce(
        new Promise<DocSearchResult[]>((resolve) => {
          releaseFirst = resolve;
        })
      )
      .mockReturnValueOnce(Promise.resolve([result({ id: 'second' })]));

    component.query.setValue('mat');
    await new Promise((resolve) => setTimeout(resolve, AFTER_DEBOUNCE_MS));
    await type('material');

    releaseFirst([result({ id: 'first' })]);
    await fixture.whenStable();

    expect(component.results().map((r) => r.id)).toEqual(['second']);
  });
});
