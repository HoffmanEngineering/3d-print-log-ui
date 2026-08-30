import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

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
  let search: jasmine.SpyObj<DocsSearchService>;
  let telemetry: jasmine.SpyObj<DocsTelemetryService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<DocsSearchDialogComponent>>;
  let router: jasmine.SpyObj<Router>;
  let closed: Subject<unknown>;

  async function setup(data: { query?: string } | null = null) {
    search = jasmine.createSpyObj<DocsSearchService>('DocsSearchService', [
      'search',
      'preload',
    ]);
    search.search.and.resolveTo([]);

    telemetry = jasmine.createSpyObj<DocsTelemetryService>(
      'DocsTelemetryService',
      ['trackSearch', 'trackSearchResultClick']
    );
    dialogRef = jasmine.createSpyObj<MatDialogRef<DocsSearchDialogComponent>>(
      'MatDialogRef',
      ['close', 'afterClosed']
    );
    // The component navigates only once the dialog has finished closing, so the
    // stub has to actually complete rather than just record the call.
    closed = new Subject<unknown>();
    dialogRef.afterClosed.and.returnValue(closed.asObservable() as never);
    dialogRef.close.and.callFake(() => {
      closed.next(undefined);
      closed.complete();
    });
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

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

  it('starts the import before the first keystroke', waitForAsync(async () => {
    await setup();

    // ~55 KB of engine and index; waiting for the first keystroke to start it
    // puts the whole download in front of the first result.
    expect(search.preload).toHaveBeenCalled();
  }));

  it('searches once typing settles', waitForAsync(async () => {
    await setup();
    search.search.and.resolveTo([result()]);

    await type('material');

    expect(search.search).toHaveBeenCalledWith('material');
    expect(component.results().length).toBe(1);
  }));

  it('reports the search with its result count', waitForAsync(async () => {
    await setup();
    search.search.and.resolveTo([result(), result({ id: 'b' })]);

    await type('material');

    expect(telemetry.trackSearch).toHaveBeenCalledWith('material', 2);
  }));

  it('reports a search that found nothing', waitForAsync(async () => {
    // zero-result-searches.kql is the most actionable query in the analytics
    // set and it is fed entirely by these.
    await setup();
    search.search.and.resolveTo([]);

    await type('kryptonite');

    expect(telemetry.trackSearch).toHaveBeenCalledWith('kryptonite', 0);
  }));

  it('does not search or report a query too short to mean anything', waitForAsync(async () => {
    await setup();

    await type('m');

    expect(search.search).not.toHaveBeenCalled();
    expect(telemetry.trackSearch).not.toHaveBeenCalled();
    expect(component.searched()).toBe(false);
  }));

  it('trims the query before searching and reporting', waitForAsync(async () => {
    await setup();

    await type('  material  ');

    expect(search.search).toHaveBeenCalledWith('material');
    expect(telemetry.trackSearch).toHaveBeenCalledWith('material', 0);
  }));

  it('reports a clicked result with its query, page and rank', waitForAsync(async () => {
    await setup();
    search.search.and.resolveTo([result(), result({ id: 'b' })]);
    await type('material');

    component.open(component.results()[1], 1);

    expect(telemetry.trackSearchResultClick).toHaveBeenCalledWith(
      'material',
      'docs/materials',
      1
    );
  }));

  it('closes and navigates to the section a result names', waitForAsync(async () => {
    await setup();
    search.search.and.resolveTo([result()]);
    await type('material');

    component.open(component.results()[0], 0);

    expect(dialogRef.close).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/docs/materials#adding');
  }));

  describe('keyboard', () => {
    const key = (k: string) =>
      new KeyboardEvent('keydown', { key: k, cancelable: true });

    beforeEach(waitForAsync(async () => {
      await setup();
      search.search.and.resolveTo([
        result({ id: 'a' }),
        result({ id: 'b' }),
        result({ id: 'c' }),
      ]);
      await type('material');
    }));

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

  it('does nothing on Enter with no results', waitForAsync(async () => {
    // Its own setup, not the keyboard block's: that one seeds three results.
    await setup();
    await type('kryptonite');

    component.onKeydown(
      new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    );

    expect(dialogRef.close).not.toHaveBeenCalled();
  }));

  it('carries a query typed elsewhere into the box', waitForAsync(async () => {
    await setup({ query: 'spool' });

    expect(component.query.value).toBe('spool');
  }));

  it('sends a reader who found nothing to feedback', waitForAsync(async () => {
    await setup();

    component.openFeedback();

    expect(dialogRef.close).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/feedback');
  }));

  it('ignores a slow response for a query that has since changed', waitForAsync(async () => {
    await setup();

    // The first search resolves after the second has already been typed.
    let releaseFirst: (value: DocSearchResult[]) => void = () => undefined;
    search.search.and.returnValues(
      new Promise<DocSearchResult[]>((resolve) => {
        releaseFirst = resolve;
      }),
      Promise.resolve([result({ id: 'second' })])
    );

    component.query.setValue('mat');
    await new Promise((resolve) => setTimeout(resolve, AFTER_DEBOUNCE_MS));
    await type('material');

    releaseFirst([result({ id: 'first' })]);
    await fixture.whenStable();

    expect(component.results().map((r) => r.id)).toEqual(['second']);
  }));
});
