import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MediaMatcher } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { Event as RouterEvent, NavigationEnd, Router } from '@angular/router';

import { DocumentationComponent } from './documentation.component';
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
