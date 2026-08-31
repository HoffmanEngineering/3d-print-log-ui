import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MediaMatcher } from '@angular/cdk/layout';
import { CdkScrollable, ScrollDispatcher } from '@angular/cdk/scrolling';
import { Subject } from 'rxjs';
import { Event as RouterEvent, NavigationEnd, Router } from '@angular/router';

import { DocumentationComponent } from './documentation.component';
import { DocsSearchOpener } from './docs-search/docs-search.opener';
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

/** The shell injects the opener to run the Ctrl+K shortcut and toolbar button. */
const searchOpener = () =>
  jasmine.createSpyObj<DocsSearchOpener>('DocsSearchOpener', ['open']);

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
        { provide: DocsSearchOpener, useValue: searchOpener() },
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
  /**
   * A scroller the CDK dispatcher might report.
   *
   * A real element, not a geometry object: the component has to tell the
   * article's scroller from the navigation drawer's, and that distinction is a
   * question about where the element sits in the DOM. A bare stub cannot answer
   * it, so it would let the sidebar bug through unnoticed.
   */
  function scrollableAt(
    scrollTop: number,
    clientHeight: number,
    scrollHeight: number,
    host: 'content' | 'drawer' = 'content'
  ): CdkScrollable {
    const element = document.createElement('div');
    Object.defineProperties(element, {
      scrollTop: { value: scrollTop },
      clientHeight: { value: clientHeight },
      scrollHeight: { value: scrollHeight },
    });
    if (host === 'drawer') {
      document.createElement('mat-sidenav').appendChild(element);
    }
    return {
      getElementRef: () => ({ nativeElement: element }),
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
        { provide: DocsSearchOpener, useValue: searchOpener() },
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

  it('reports scroll depth from the scroller the dispatcher names', async () => {
    await setup('/docs/prints');

    scrolled.next(scrollableAt(1600, 800, 4000));

    expect(telemetry.trackScrollDepth).toHaveBeenCalledWith(50, 'prints');
  });

  it('does not report scrolling the navigation drawer as reading the article', async () => {
    // Material registers the drawer's inner container as a cdkScrollable, so
    // the dispatcher reports the sidebar exactly as it reports the article. On
    // a phone that list is longer than the screen; scrolling it to the end
    // would otherwise file a 100% "read the whole page" measurement.
    await setup('/docs/prints');
    telemetry.trackScrollDepth.calls.reset();

    // Geometry chosen to read as 50%: the fallback container in this test DOM
    // has no scroll range and so reports 100, and asserting against 100 would
    // pass whether the drawer was rejected or not.
    scrolled.next(scrollableAt(1200, 600, 3000, 'drawer'));

    expect(telemetry.trackScrollDepth).not.toHaveBeenCalledWith(50, 'prints');
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
