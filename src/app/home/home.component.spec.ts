import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdsenseModule } from 'ng2-adsense';

import { HomeComponent } from './home.component';
import { AuthService } from '../core/services/auth.service';
import { MetaTagService } from '../core/services/meta-tag.service';
import { StructuredDataService } from '../core/services/structured-data.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let meta: jasmine.SpyObj<MetaTagService>;
  let structuredData: jasmine.SpyObj<StructuredDataService>;

  beforeEach(waitForAsync(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    meta = jasmine.createSpyObj<MetaTagService>('MetaTagService', [
      'setSeoTags',
    ]);
    structuredData = jasmine.createSpyObj<StructuredDataService>(
      'StructuredDataService',
      ['setJsonLd']
    );

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
});
