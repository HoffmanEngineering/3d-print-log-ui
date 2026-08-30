import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DocRelatedComponent } from './doc-related.component';
import { DOC_PAGES } from '../generated/docs-manifest';

const routed = DOC_PAGES.filter((page) => !page.dormant);
const withRelated = routed.find((page) => page.related.length > 0)!;

describe('DocRelatedComponent', () => {
  let fixture: ComponentFixture<DocRelatedComponent>;

  const render = async (path: string) => {
    fixture.componentRef.setInput('path', path);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const cards = () =>
    Array.from(
      host().querySelectorAll<HTMLAnchorElement>('.doc-related__list a')
    );

  const host = (): HTMLElement => fixture.nativeElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocRelatedComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DocRelatedComponent);
  });

  it('links to every page named in the frontmatter', async () => {
    await render(withRelated.path);

    expect(cards().map((a) => a.getAttribute('href'))).toEqual(
      withRelated.related.map((slug) => `/docs/${slug}`)
    );
  });

  it('shows each page description, so the link says what it leads to', async () => {
    await render(withRelated.path);
    const target = routed.find((p) => p.slug === withRelated.related[0])!;

    expect(
      cards()[0].querySelector('.doc-related__description')?.textContent?.trim()
    ).toBe(target.description);
  });

  it('renders nothing for a page that declares no related pages', async () => {
    const alone = routed.find((page) => page.related.length === 0);
    if (!alone) {
      pending('every doc page declares a related page');
      return;
    }

    await render(alone.path);

    expect(host().querySelector('.doc-related')).toBeNull();
  });

  it('renders nothing for an unknown path', async () => {
    await render('docs/not-a-page');

    expect(host().querySelector('.doc-related')).toBeNull();
  });
});
