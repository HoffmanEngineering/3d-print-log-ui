import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DocPageNavComponent } from './doc-page-nav.component';
import { DOC_PAGES } from '../generated/docs-manifest';

const routed = DOC_PAGES.filter((page) => !page.dormant);

describe('DocPageNavComponent', () => {
  let fixture: ComponentFixture<DocPageNavComponent>;

  const render = async (path: string) => {
    fixture.componentRef.setInput('path', path);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const links = () =>
    Array.from(
      host().querySelectorAll<HTMLAnchorElement>('.doc-page-nav__link')
    );

  const host = (): HTMLElement => fixture.nativeElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocPageNavComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DocPageNavComponent);
  });

  it('links to the pages either side, with rel telling which is which', async () => {
    await render(routed[1].path);

    expect(
      links().map((a) => [a.getAttribute('rel'), a.getAttribute('href')])
    ).toEqual([
      ['prev', `/${routed[0].path}`],
      ['next', `/${routed[2].path}`],
    ]);
  });

  it('names each neighbor by its sidebar label', async () => {
    await render(routed[1].path);

    expect(
      links()[0].querySelector('.doc-page-nav__label')?.textContent?.trim()
    ).toBe(routed[0].navLabel);
  });

  it('offers only a next on the first page', async () => {
    await render(routed[0].path);

    expect(links().map((a) => a.getAttribute('rel'))).toEqual(['next']);
  });

  it('offers only a previous on the last page', async () => {
    await render(routed[routed.length - 1].path);

    expect(links().map((a) => a.getAttribute('rel'))).toEqual(['prev']);
  });

  it('renders nothing at all for a page outside the docs', async () => {
    await render('docs/not-a-page');

    expect(host().querySelector('.doc-page-nav')).toBeNull();
  });
});
