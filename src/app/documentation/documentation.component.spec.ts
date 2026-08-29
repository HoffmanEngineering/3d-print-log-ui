import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MediaMatcher } from '@angular/cdk/layout';
import { CdkScrollable, ScrollDispatcher } from '@angular/cdk/scrolling';
import { Subject } from 'rxjs';
import { Event as RouterEvent, NavigationEnd, Router } from '@angular/router';

import { DocumentationComponent } from './documentation.component';
import { DocsTelemetryService } from './docs-telemetry.service';
import { MetaTagService } from '../core/services/meta-tag.service';
import { StructuredDataService } from '../core/services/structured-data.service';

// Force the "mobile" branch so ngAfterViewInit skips the sidenav open() call that
// the empty test template can't satisfy.
const mobileMediaMatcher = {
  matchMedia: () => ({
    matches: true,
    addListener: () => {},
    removeListener: () => {},
  }),
};

xdescribe('DocumentationComponent', () => {
  let component: DocumentationComponent;
  let fixture: ComponentFixture<DocumentationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DocumentationComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DocumentationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('DocumentationComponent SEO lifecycle', () => {
  let events: Subject<RouterEvent>;
  let structuredData: jasmine.SpyObj<StructuredDataService>;
  let meta: jasmine.SpyObj<MetaTagService>;
  let fixture: ComponentFixture<DocumentationComponent>;

  beforeEach(async () => {
    events = new Subject<RouterEvent>();
    structuredData = jasmine.createSpyObj<StructuredDataService>(
      'StructuredDataService',
      ['setJsonLd']
    );
    meta = jasmine.createSpyObj<MetaTagService>('MetaTagService', [
      'setSeoTags',
      'setTitle',
    ]);

    await TestBed.configureTestingModule({
      declarations: [DocumentationComponent],
      providers: [
        { provide: Router, useValue: { url: '/docs/prints', events } },
        { provide: StructuredDataService, useValue: structuredData },
        { provide: MetaTagService, useValue: meta },
        { provide: MediaMatcher, useValue: mobileMediaMatcher },
        {
          provide: ScrollDispatcher,
          useValue: { scrolled: () => new Subject() },
        },
        {
          provide: DocsTelemetryService,
          useValue: jasmine.createSpyObj<DocsTelemetryService>(
            'DocsTelemetryService',
            ['trackPageView', 'trackScrollDepth']
          ),
        },
      ],
    })
      // Replace the sidenav-heavy template so we can exercise the component's
      // SEO/subscription logic without its child components.
      .overrideComponent(DocumentationComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(DocumentationComponent);
    fixture.detectChanges(); // runs ngOnInit
  });

  it('sets doc structured data for the initial doc url', () => {
    expect(structuredData.setJsonLd).toHaveBeenCalledTimes(1);
    const nodes = structuredData.setJsonLd.calls.mostRecent().args[0];
    expect(nodes.map((n) => n['@type'])).toEqual([
      'TechArticle',
      'BreadcrumbList',
    ]);
  });

  it('clears structured data when navigating to a non-doc url while alive', () => {
    structuredData.setJsonLd.calls.reset();
    events.next(new NavigationEnd(1, '/', '/'));
    expect(structuredData.setJsonLd).toHaveBeenCalledWith([]);
  });

  it('does NOT touch structured data after the component is destroyed', () => {
    structuredData.setJsonLd.calls.reset();
    fixture.destroy();
    events.next(new NavigationEnd(2, '/', '/'));
    expect(structuredData.setJsonLd).not.toHaveBeenCalled();
  });
});

describe('DocumentationComponent telemetry', () => {
  let events: Subject<RouterEvent>;
  let scrolled: Subject<CdkScrollable | void>;
  let telemetry: jasmine.SpyObj<DocsTelemetryService>;
  let fixture: ComponentFixture<DocumentationComponent>;

  /** A CdkScrollable stand-in whose element reports the given geometry. */
  function scrollableAt(
    scrollTop: number,
    clientHeight: number,
    scrollHeight: number
  ): CdkScrollable {
    return {
      getElementRef: () => ({
        nativeElement: { scrollTop, clientHeight, scrollHeight },
      }),
    } as unknown as CdkScrollable;
  }

  async function setup(initialUrl: string): Promise<void> {
    events = new Subject<RouterEvent>();
    scrolled = new Subject<CdkScrollable | void>();
    telemetry = jasmine.createSpyObj<DocsTelemetryService>(
      'DocsTelemetryService',
      ['trackPageView', 'trackScrollDepth']
    );

    await TestBed.configureTestingModule({
      declarations: [DocumentationComponent],
      providers: [
        { provide: Router, useValue: { url: initialUrl, events } },
        {
          provide: StructuredDataService,
          useValue: jasmine.createSpyObj<StructuredDataService>(
            'StructuredDataService',
            ['setJsonLd']
          ),
        },
        {
          provide: MetaTagService,
          useValue: jasmine.createSpyObj<MetaTagService>('MetaTagService', [
            'setSeoTags',
            'setTitle',
          ]),
        },
        { provide: MediaMatcher, useValue: mobileMediaMatcher },
        { provide: ScrollDispatcher, useValue: { scrolled: () => scrolled } },
        { provide: DocsTelemetryService, useValue: telemetry },
      ],
    })
      .overrideComponent(DocumentationComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(DocumentationComponent);
    fixture.detectChanges(); // runs ngOnInit
  }

  it('reports a page view for the docs url it starts on', async () => {
    await setup('/docs/prints');

    expect(telemetry.trackPageView).toHaveBeenCalledOnceWith('/docs/prints');
  });

  it('reports a page view for each docs navigation', async () => {
    await setup('/docs/prints');
    telemetry.trackPageView.calls.reset();

    events.next(new NavigationEnd(1, '/docs/materials', '/docs/materials'));

    expect(telemetry.trackPageView).toHaveBeenCalledOnceWith('/docs/materials');
  });

  it('does not report a page view when navigating out of the docs section', async () => {
    await setup('/docs/prints');
    telemetry.trackPageView.calls.reset();

    events.next(new NavigationEnd(1, '/prints', '/prints'));

    expect(telemetry.trackPageView).not.toHaveBeenCalled();
  });

  it('stops reporting page views once destroyed', async () => {
    await setup('/docs/prints');
    telemetry.trackPageView.calls.reset();

    fixture.destroy();
    events.next(new NavigationEnd(2, '/docs/materials', '/docs/materials'));

    expect(telemetry.trackPageView).not.toHaveBeenCalled();
  });

  it('exposes the current slug so the feedback widget resets per page', async () => {
    await setup('/docs/prints');
    const component = fixture.componentInstance;
    expect(component.currentSlug()).toBe('prints');

    events.next(new NavigationEnd(1, '/docs/materials', '/docs/materials'));

    expect(component.currentSlug()).toBe('materials');
  });

  it('reports scroll depth from the sidenav content, which scrolls on desktop', async () => {
    await setup('/docs/prints');

    scrolled.next(scrollableAt(1600, 800, 4000));

    expect(telemetry.trackScrollDepth).toHaveBeenCalledWith(50, 'prints');
  });

  it('samples depth on arrival, not only on scroll', async () => {
    // A page that fits on screen can never fire a scroll event. Without an
    // arrival sample it would be reported as unread rather than fully read.
    // The percentage itself is scrollPercentOf's contract, tested separately.
    await setup('/docs/prints');

    expect(telemetry.trackScrollDepth).toHaveBeenCalledOnceWith(
      jasmine.any(Number),
      'prints'
    );
  });

  it('stops reporting scroll depth once destroyed', async () => {
    await setup('/docs/prints');
    // Ignore the arrival sample; this is about scroll events after teardown.
    telemetry.trackScrollDepth.calls.reset();
    fixture.destroy();

    scrolled.next(scrollableAt(1600, 800, 4000));

    expect(telemetry.trackScrollDepth).not.toHaveBeenCalled();
  });
});
