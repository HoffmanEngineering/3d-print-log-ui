import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

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

  async function setup(fragment: string | null) {
    await TestBed.configureTestingModule({
      declarations: [DocsReleaseNotesComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    return TestBed.createComponent(DocsReleaseNotesComponent);
  }

  /** Lets the dynamic import settle before assertions run. */
  async function settle(fixture: ComponentFixture<DocsReleaseNotesComponent>) {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

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
    await settle(fixture);

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
    await settle(fixture);

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
    await settle(fixture);

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
    await settle(fixture);

    const missing = DOC_RELEASES.filter(
      (release) =>
        !fixture.nativeElement.querySelector(`#${CSS.escape(release.anchor)}`)
    ).map((release) => release.anchor);

    expect(missing).toEqual([]);
  }));
});
