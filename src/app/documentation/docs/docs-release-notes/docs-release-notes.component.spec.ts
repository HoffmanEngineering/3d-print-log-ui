import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { DOC_RELEASES } from '../../generated/docs-manifest';
import { DocsReleaseNotesComponent } from './docs-release-notes.component';

/**
 * The archive is what makes this page different from every other generated doc:
 * ten releases render into the template and the rest arrive as a lazily imported
 * chunk. These tests cover the two ways a reader reaches an archived release —
 * pressing the button, and following a deep link to an anchor that is not on the
 * page yet.
 */
describe('DocsReleaseNotesComponent', () => {
  const RECENT = 10;

  /** The router's fragment stream, so a test can navigate in place. */
  let fragment$: BehaviorSubject<string | null>;

  async function setup(fragment: string | null) {
    fragment$ = new BehaviorSubject<string | null>(fragment);

    await TestBed.configureTestingModule({
      declarations: [DocsReleaseNotesComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { fragment: fragment$.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    return TestBed.createComponent(DocsReleaseNotesComponent);
  }

  /** One render pass, plus whatever microtasks it queued. */
  async function tick(fixture: ComponentFixture<DocsReleaseNotesComponent>) {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /**
   * Renders until `done()` holds. The archive travels through a render pass, a
   * dynamic import, and then another render before it is on screen, and how many
   * passes that takes is not something a test should be asserting by guessing a
   * number.
   */
  async function settleUntil(
    fixture: ComponentFixture<DocsReleaseNotesComponent>,
    done: () => boolean,
    tries = 20
  ) {
    for (let attempt = 0; attempt < tries && !done(); attempt++) {
      // A real macrotask yield, not just a microtask drain: the archive is a
      // lazy chunk, so Karma actually fetches a module here and no amount of
      // detectChanges will outwait that.
      await new Promise((resolve) => setTimeout(resolve, 10));
      await tick(fixture);
    }
    await tick(fixture);
  }

  /** For assertions that nothing happens: settle without waiting on a change. */
  const settle = (fixture: ComponentFixture<DocsReleaseNotesComponent>) =>
    settleUntil(fixture, () => false, 3);

  /** For assertions that the archive arrived. */
  const settleArchive = (
    fixture: ComponentFixture<DocsReleaseNotesComponent>
  ) => settleUntil(fixture, () => fixture.componentInstance.expanded());

  it('starts with the archive closed', waitForAsync(async () => {
    const fixture = await setup(null);
    await settle(fixture);

    expect(fixture.componentInstance.expanded()).toBe(false);
    expect(fixture.componentInstance.archive().length).toBe(0);
  }));

  it('loads every release the template does not carry', waitForAsync(async () => {
    const fixture = await setup(null);
    await settle(fixture);

    await fixture.componentInstance.loadArchive();
    await settleArchive(fixture);

    expect(fixture.componentInstance.expanded()).toBe(true);
    expect(fixture.componentInstance.archive().length).toBe(
      DOC_RELEASES.length - RECENT
    );
  }));

  it('clears the loading flag once the archive has arrived', waitForAsync(async () => {
    const fixture = await setup(null);
    await settle(fixture);

    await fixture.componentInstance.loadArchive();

    expect(fixture.componentInstance.loading()).toBe(false);
  }));

  it('expands the archive for a deep link to an anchor that is not on the page', waitForAsync(async () => {
    // /docs/release-notes#v1.1.0 is a bookmark someone may hold; the oldest
    // release is nowhere near the ten the template renders.
    const oldest = DOC_RELEASES[DOC_RELEASES.length - 1];
    const fixture = await setup(oldest.anchor);
    await settleArchive(fixture);

    expect(fixture.componentInstance.expanded()).toBe(true);
    expect(
      fixture.componentInstance
        .archive()
        .some((release) => release.anchor === oldest.anchor)
    ).toBe(true);
  }));

  it('leaves the archive closed for a deep link the template already answers', waitForAsync(async () => {
    // The newest release is in the template, so the browser has already
    // scrolled to it and there is no reason to pull in the chunk.
    const fixture = await setup(DOC_RELEASES[0].anchor);
    await settle(fixture);

    expect(fixture.componentInstance.expanded()).toBe(false);
  }));

  it('renders an archived release into the page once expanded', waitForAsync(async () => {
    const fixture = await setup(null);
    await settle(fixture);

    await fixture.componentInstance.loadArchive();
    await settleArchive(fixture);

    const oldest = DOC_RELEASES[DOC_RELEASES.length - 1];
    const heading: HTMLElement | null = fixture.nativeElement.querySelector(
      `#${CSS.escape(oldest.anchor)}`
    );

    expect(heading).withContext(`no element for ${oldest.anchor}`).toBeTruthy();
    expect(heading!.textContent).toContain(oldest.version);
  }));

  it('declares every manifest anchor across the template and the archive', waitForAsync(async () => {
    // The anchor contract, checked where it actually has to hold: in the DOM.
    const fixture = await setup(null);
    await settle(fixture);
    await fixture.componentInstance.loadArchive();
    await settleArchive(fixture);

    const missing = DOC_RELEASES.filter(
      (release) =>
        !fixture.nativeElement.querySelector(`#${CSS.escape(release.anchor)}`)
    ).map((release) => release.anchor);

    expect(missing).toEqual([]);
  }));

  it('expands the archive when the fragment changes on an open page', waitForAsync(async () => {
    // Angular reuses this component when only the hash changes, so this path
    // never re-runs ngOnInit. Reading a snapshot once would leave the anchor
    // unresolved.
    const fixture = await setup(null);
    await settle(fixture);
    expect(fixture.componentInstance.expanded()).toBe(false);

    const oldest = DOC_RELEASES[DOC_RELEASES.length - 1];
    fragment$.next(oldest.anchor);
    await settleArchive(fixture);

    expect(fixture.componentInstance.expanded()).toBe(true);
    expect(
      fixture.nativeElement.querySelector(`#${CSS.escape(oldest.anchor)}`)
    ).toBeTruthy();
  }));

  it('renders an archived heading as text, not as an HTML entity', waitForAsync(async () => {
    // The title is data: the archive prints it through {{ }}, so an `&amp;` in
    // the frontmatter would reach the reader as literal "&amp;".
    const fixture = await setup(null);
    await settle(fixture);
    await fixture.componentInstance.loadArchive();
    await settleArchive(fixture);

    const ampersand = DOC_RELEASES.find(
      (release) =>
        release.title.includes('&') &&
        fixture.nativeElement.querySelector(`#${CSS.escape(release.anchor)}`)
    );

    expect(ampersand).withContext('no release title with an &').toBeTruthy();
    const heading = fixture.nativeElement.querySelector(
      `#${CSS.escape(ampersand!.anchor)}`
    );
    expect(heading.textContent).toContain(
      `${ampersand!.version} - ${ampersand!.title}`
    );
    expect(heading.textContent).not.toContain('&amp;');
  }));
});
