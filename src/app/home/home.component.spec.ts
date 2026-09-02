import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
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
  let auth: jasmine.SpyObj<AuthService>;
  let meta: jasmine.SpyObj<MetaTagService>;
  let structuredData: jasmine.SpyObj<StructuredDataService>;
  let logging: jasmine.SpyObj<LoggingService>;

  beforeEach(waitForAsync(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    meta = jasmine.createSpyObj<MetaTagService>('MetaTagService', [
      'setSeoTags',
    ]);
    structuredData = jasmine.createSpyObj<StructuredDataService>(
      'StructuredDataService',
      ['setJsonLd']
    );

    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);

    TestBed.configureTestingModule({
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
  }));

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

    expect(auth.login).toHaveBeenCalledWith('/prints', { signup: true });
    expect(logging.logEvent).toHaveBeenCalledWith('Home_SignupClicked', {
      placement: 'hero',
    });
  });

  it('has exactly one h1 on the page', () => {
    const headings = fixture.nativeElement.querySelectorAll('h1');

    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain('Every print');
  });

  it('links to every slicer route the prerender check requires', () => {
    const required = [
      '/cura',
      '/prusaslicer',
      '/bambu-studio',
      '/creality-print',
      '/orcaslicer',
    ];
    const hrefs = Array.from(
      fixture.nativeElement.querySelectorAll('a[href]')
    ).map((a) => (a as HTMLAnchorElement).getAttribute('href'));

    for (const route of required) {
      expect(hrefs).toContain(route);
    }
  });

  it('opens the Auth0 signup screen from the closing CTA', () => {
    const cta: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '[data-cy="closing-signup"]'
    );
    cta.click();

    expect(auth.login).toHaveBeenCalledWith('/prints', { signup: true });
    expect(logging.logEvent).toHaveBeenCalledWith('Home_SignupClicked', {
      placement: 'closing',
    });
  });

  // These are a cheap early-warning, NOT the contract. The real gate is
  // replaceImgRefExactlyOnce (process-captures.lib.mjs), which throws unless each
  // base matches exactly one <img> carrying ngSrc and exactly one numeric width
  // and height — and which runs during the capture step.
  // A cheap early-warning, NOT the contract. The real gate is
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
      const light = new RegExp(`/assets/${base}_[A-Za-z0-9]+\.webp$`);
      const dark = new RegExp(`/assets/${base}_dark_[A-Za-z0-9]+\.webp$`);

      const lightHits = imgs.filter((i) =>
        light.test(i.getAttribute('src') ?? '')
      );
      const darkHits = imgs.filter((i) =>
        dark.test(i.getAttribute('src') ?? '')
      );

      expect(lightHits.length).toBe(
        1,
        `${base} light variant should appear once`
      );
      expect(darkHits.length).toBe(
        1,
        `${base} dark variant should appear once`
      );

      // Both must go through NgOptimizedImage, which is what the capture
      // pipeline's rewrite step looks for.
      for (const img of [...lightHits, ...darkHits]) {
        expect(img.hasAttribute('ngsrc')).toBe(
          true,
          `${base} should use ngSrc, not a plain src`
        );
      }
    }
  });
});
