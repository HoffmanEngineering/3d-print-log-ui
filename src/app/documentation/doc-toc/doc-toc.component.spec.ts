import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DocTocComponent } from './doc-toc.component';
import { DOC_OUTLINE } from '../generated/docs-outline';

describe('DocTocComponent', () => {
  let fixture: ComponentFixture<DocTocComponent>;

  const render = async (path: string) => {
    fixture.componentRef.setInput('path', path);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const items = () =>
    Array.from(host().querySelectorAll<HTMLAnchorElement>('.doc-toc__item a'));

  const host = (): HTMLElement => fixture.nativeElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocTocComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DocTocComponent);
  });

  it('lists the generated outline for the page, in document order', async () => {
    await render('docs/materials');

    expect(items().map((a) => a.textContent?.trim())).toEqual(
      DOC_OUTLINE['docs/materials'].map((h) => h.text)
    );
  });

  it('deep-links each entry to its heading anchor', async () => {
    await render('docs/materials');
    const first = DOC_OUTLINE['docs/materials'][0];

    expect(items()[0].getAttribute('href')).toBe(`/docs/materials#${first.id}`);
  });

  it('indents a heading nested under the one above it', async () => {
    await render('docs/materials');
    const nestedAt = DOC_OUTLINE['docs/materials'].findIndex(
      (h) => h.depth > 1
    );

    const rows = host().querySelectorAll('.doc-toc__item');
    expect(rows[nestedAt].classList).toContain('doc-toc__item--nested');
    expect(rows[0].classList).not.toContain('doc-toc__item--nested');
  });

  it('renders nothing for a page with too few headings to be worth a rail', async () => {
    // A one- or two-entry table of contents takes more room than the jump it
    // saves. `docs/about` is a single section.
    await render('docs/about');

    expect(host().querySelector('.doc-toc')).toBeNull();
  });

  it('renders nothing for an unknown path', async () => {
    await render('docs/not-a-page');

    expect(host().querySelector('.doc-toc')).toBeNull();
  });

  it('swaps its entries when the reader navigates to another page', async () => {
    // The TOC lives in the docs shell, which survives navigation.
    await render('docs/materials');
    await render('docs/printers');

    expect(items().map((a) => a.textContent?.trim())).toEqual(
      DOC_OUTLINE['docs/printers'].map((h) => h.text)
    );
  });

  it('marks the section being read, for the eye and for a screen reader', async () => {
    await render('docs/materials');
    const second = DOC_OUTLINE['docs/materials'][1];

    fixture.componentInstance.activeId.set(second.id);
    fixture.detectChanges();

    const rows = host().querySelectorAll('.doc-toc__item');
    expect(rows[1].classList).toContain('doc-toc__item--active');
    expect(rows[0].classList).not.toContain('doc-toc__item--active');
    expect(items()[1].getAttribute('aria-current')).toBe('true');
    expect(items()[0].getAttribute('aria-current')).toBeNull();
  });

  it('marks nothing before the reader reaches the first heading', async () => {
    await render('docs/materials');

    expect(host().querySelector('.doc-toc__item--active')).toBeNull();
    expect(host().querySelector('[aria-current]')).toBeNull();
  });

  it('drops the mark when the reader navigates to another page', async () => {
    // The component survives navigation, so a stale id from the previous page
    // would leave an unrelated entry highlighted until the first scroll.
    await render('docs/materials');
    fixture.componentInstance.activeId.set(DOC_OUTLINE['docs/materials'][1].id);
    fixture.detectChanges();

    await render('docs/printers');

    expect(fixture.componentInstance.activeId()).toBeNull();
    expect(host().querySelector('.doc-toc__item--active')).toBeNull();
  });

  it('names the navigation landmark so it is not just "navigation"', async () => {
    await render('docs/materials');

    const nav = host().querySelector('nav');
    const label = host().querySelector(
      `#${nav.getAttribute('aria-labelledby')}`
    );
    expect(label.textContent.trim()).toBe('On this page');
  });
});
