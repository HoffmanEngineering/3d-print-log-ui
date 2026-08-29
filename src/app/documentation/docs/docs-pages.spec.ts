import { NO_ERRORS_SCHEMA, Type } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/core/services/auth.service';
import { DOC_PAGES } from '../generated/docs-manifest';
import { DOCS_PAGE_COMPONENTS } from '../generated/docs-declarations';
import { DocsGettingStartedComponent } from './docs-getting-started/docs-getting-started.component';

/**
 * One spec over every /docs page, driven by the generated manifest.
 *
 * This replaces the sixteen near-identical `docs-*.component.spec.ts` files that
 * had to be created by hand for each new page — and which `docs-projects` never
 * got. A page added to src/content/docs is covered here the moment it exists,
 * so the coverage gap cannot reopen.
 */
describe('/docs pages', () => {
  const pages = DOC_PAGES.filter((page) => !page.dormant);

  /** Every routed page's component class, generated or hand-written. */
  const componentsByName = new Map<string, Type<unknown>>([
    ...DOCS_PAGE_COMPONENTS.map(
      (component) => [component.name, component] as [string, Type<unknown>]
    ),
    ['DocsGettingStartedComponent', DocsGettingStartedComponent],
  ]);

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [...componentsByName.values()],
      providers: [
        // docs-getting-started is auth-aware on a public route; the rest of the
        // pages inject nothing at all.
        { provide: AuthService, useValue: { login: () => undefined } },
        { provide: Router, useValue: { url: '/docs/getting-started' } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  it('covers every routed page in the manifest', () => {
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) {
      expect(componentsByName.has(page.className))
        .withContext(`no component for ${page.path}`)
        .toBe(true);
    }
  });

  for (const page of DOC_PAGES.filter((p) => !p.dormant)) {
    it(`renders ${page.path}`, () => {
      const component = componentsByName.get(page.className);
      const fixture = TestBed.createComponent(component!);
      fixture.detectChanges();

      expect(fixture.componentInstance).toBeTruthy();
      expect(fixture.nativeElement.textContent.trim().length).toBeGreaterThan(
        0
      );
    });
  }
});
