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
});
