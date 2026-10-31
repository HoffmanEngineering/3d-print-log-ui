import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdsenseModule } from 'ng2-adsense';

import { HomeComponent } from './home.component';
import { AuthService } from '../core/services/auth.service';
import { MetaTagService } from '../core/services/meta-tag.service';
import { StructuredDataService } from '../core/services/structured-data.service';
import { LoggingService } from '../core/services/logging.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let auth: MockedObject<AuthService>;
  let meta: MockedObject<MetaTagService>;
  let structuredData: MockedObject<StructuredDataService>;
  let logging: MockedObject<LoggingService>;

  beforeEach(async () => {
    auth = {
      login: vi.fn().mockName('AuthService.login'),
    } as unknown as MockedObject<AuthService>;
    meta = {
      setSeoTags: vi.fn().mockName('MetaTagService.setSeoTags'),
    } as unknown as MockedObject<MetaTagService>;
    structuredData = {
      setJsonLd: vi.fn().mockName('StructuredDataService.setJsonLd'),
    } as unknown as MockedObject<StructuredDataService>;

    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;

    await TestBed.configureTestingModule({
      // AdsenseModule.forRoot supplies the AdsenseConfig token that
      // <app-ad> -> AdsenseComponent injects. Same stub the other specs
      // rendering an ad use (ad.component.spec.ts:22).
      imports: [
        HomeComponent,
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
      ],
      providers: [
        provideRouter([]),
        // <app-ad> -> SubscriptionService -> HttpClient. Nothing provides it by
        // default in a standalone TestBed.
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: MetaTagService, useValue: meta },
        { provide: StructuredDataService, useValue: structuredData },
        { provide: LoggingService, useValue: logging },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sets SEO tags on init', () => {
    expect(meta.setSeoTags).toHaveBeenCalled();
  });

  it('gives the JSON-LD apps the same description as the meta tag', () => {
    const description = vi.mocked(meta.setSeoTags).mock.lastCall[0].description;
    const nodes = vi.mocked(structuredData.setJsonLd).mock.lastCall[0];

    expect(nodes.map((n) => n['@type'])).toEqual([
      'WebApplication',
      'MobileApplication',
      'Organization',
    ]);
    expect(nodes[0]['description']).toBe(description);
    expect(nodes[1]['description']).toBe(description);
  });

  it('makes the hero headline an h1', () => {
    const hero = fixture.nativeElement.querySelector('.hero-title');

    expect(hero.tagName).toBe('H1');
    expect(hero.textContent).toContain('Every print');
  });

  it('opens the Auth0 signup screen from the hero CTA', () => {
    const cta: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '[data-cy="hero-signup"]'
    );
    cta.click();

    expect(auth.login).toHaveBeenCalledWith('/prints', {
      signup: true,
      source: 'home',
    });
    expect(logging.logEvent).toHaveBeenCalledWith('Home_SignupClicked', {
      placement: 'hero',
    });
  });

  it('has exactly one h1 on the page', () => {
    const headings = fixture.nativeElement.querySelectorAll('h1');

    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain('Every print');
  });

  it('links to every marketing route the prerender check requires', () => {
    const required = [
      '/cura',
      '/prusaslicer',
      '/bambu-studio',
      '/creality-print',
      '/orcaslicer',
      '/klipper',
    ];
    const hrefs = Array.from(
      fixture.nativeElement.querySelectorAll('a[href]')
    ).map((a) => (a as HTMLAnchorElement).getAttribute('href'));

    for (const route of required) {
      expect(hrefs).toContain(route);
    }
  });

  it('opens the Auth0 signup screen from the closing CTA', () => {
    const cta: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-cy="closing-signup"]'
    );
    cta.click();

    expect(auth.login).toHaveBeenCalledWith('/prints', {
      signup: true,
      source: 'home',
    });
    expect(logging.logEvent).toHaveBeenCalledWith('Home_SignupClicked', {
      placement: 'closing',
    });
  });

  // These are a cheap early-warning, NOT the contract. The real gate is
  // replaceImgRefExactlyOnce (process-captures.lib.mjs), which throws unless each
  // base matches exactly one <img> carrying ngSrc and exactly one numeric width
  // and height — and which runs during the capture step.
  //
  // This counts ELEMENTS, not innerHTML substrings: NgOptimizedImage leaves both
  // `ngsrc` and `src` on the rendered tag, so a substring count doubles.
  it('references each generated capture exactly once per variant', () => {
    const imgs: HTMLImageElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('img')
    );

    for (const base of [
      'Homepage_PrinterList',
      'Homepage_PrinterTable',
      'Homepage_Filament',
      'Homepage_Analytics',
    ]) {
      // `[A-Za-z0-9]+` spans one segment, so this matches the LIGHT variant
      // only: the dark filename is `<base>_dark_<hash>.webp`, which has two
      // segments after the base and therefore does not match.
      //
      // `\\.`, not `\.`: this is a template literal, so a single backslash is
      // eaten by the string and the RegExp would receive a bare `.` — a
      // wildcard that accepts `<base>_<hash>Xwebp`. The capture scripts that
      // build the same shape (process-captures.mjs) already double it.
      const light = new RegExp(`/assets/${base}_[A-Za-z0-9]+\\.webp$`);
      const dark = new RegExp(`/assets/${base}_dark_[A-Za-z0-9]+\\.webp$`);

      const lightHits = imgs.filter((i) =>
        light.test(i.getAttribute('src') ?? '')
      );
      const darkHits = imgs.filter((i) =>
        dark.test(i.getAttribute('src') ?? '')
      );

      expect(lightHits.length, `${base} light variant should appear once`).toBe(
        1
      );
      expect(darkHits.length, `${base} dark variant should appear once`).toBe(
        1
      );

      // Both must go through NgOptimizedImage, which is what the capture
      // pipeline's rewrite step looks for.
      for (const img of [...lightHits, ...darkHits]) {
        expect(
          img.hasAttribute('ngsrc'),
          `${base} should use ngSrc, not a plain src`
        ).toBe(true);
      }
    }
  });

  it('uses the hero screenshot as the social preview image', () => {
    const opts = vi.mocked(meta.setSeoTags).mock.lastCall[0];

    expect(opts.imageUrl).toContain('Homepage_PrinterList');
    expect(opts.imageUrl).toMatch(/^https:\/\/www\.3dprintlog\.com\//);
  });

  it('advertises the hand-written Markdown twin at /index.md', () => {
    const opts = vi.mocked(meta.setSeoTags).mock.lastCall[0];

    expect(opts.markdownUrl).toBe('https://www.3dprintlog.com/index.md');
  });
});
