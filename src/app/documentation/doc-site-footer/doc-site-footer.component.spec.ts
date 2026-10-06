import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DocSiteFooterComponent } from './doc-site-footer.component';
import { DOC_PAGES } from '../generated/docs-manifest';

describe('DocSiteFooterComponent', () => {
  let fixture: ComponentFixture<DocSiteFooterComponent>;

  const anchors = () =>
    Array.from(
      (
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLAnchorElement>('a')
    );
  const hrefs = () => anchors().map((a) => a.getAttribute('href'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocSiteFooterComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DocSiteFooterComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('links the About, Contact and Privacy pages', () => {
    expect(hrefs()).toEqual(
      jasmine.arrayContaining([
        '/docs/about',
        '/docs/contact',
        '/docs/privacy-policy',
      ])
    );
  });

  it('links only docs pages that exist', () => {
    const published = new Set(
      DOC_PAGES.filter((page) => !page.dormant).map((page) => `/${page.path}`)
    );
    const docLinks = hrefs().filter(
      (href): href is string => !!href && href.startsWith('/docs/')
    );
    expect(docLinks.length).toBeGreaterThan(0);
    for (const href of docLinks) {
      expect(published.has(href))
        .withContext(`${href} is not a published docs page`)
        .toBeTrue();
    }
  });

  it('shows the support email', () => {
    expect(hrefs()).toContain('mailto:hello@3dprintlog.com');
  });
});
