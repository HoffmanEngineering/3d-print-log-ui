import { MediaMatcher } from '@angular/cdk/layout';
import { CdkScrollable, ScrollDispatcher } from '@angular/cdk/scrolling';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MetaTagService } from '../core/services/meta-tag.service';
import { StructuredDataService } from '../core/services/structured-data.service';
import {
  buildDocArticle,
  buildDocBreadcrumb,
} from '../core/structured-data/doc-schema';
import { getDocSeoTags } from './doc-seo.config';
import { resolveScrollContainer, scrolls } from './docs-scroll-container';
import { DocsSearchOpener } from './docs-search/docs-search.opener';
import {
  isApplePlatform,
  isSearchShortcut,
  shortcutLabel,
} from './docs-search/keyboard-shortcut';
import {
  DocsTelemetryService,
  scrollPercentOf,
  slugFromDocsUrl,
} from './docs-telemetry.service';

/** How often scroll position is sampled, in ms. */
const SCROLL_AUDIT_MS = 200;

let apiLoaded = false;

@Component({
  selector: 'app-documentation',
  templateUrl: './documentation.component.html',
  styleUrls: ['./documentation.component.scss'],
  standalone: false,
  host: {
    // Bound on the document, not the host element: the shortcut has to work
    // wherever focus happens to be inside the docs shell.
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class DocumentationComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  /** Slug of the docs page on screen; drives the feedback widget's per-page reset. */
  readonly currentSlug = signal('');

  /**
   * The same page as a docs path (`docs/printers`), which is the key the
   * generated outline and the manifest are both indexed by.
   */
  readonly currentPath = computed(() =>
    this.currentSlug() ? `docs/${this.currentSlug()}` : ''
  );

  mobileQuery: MediaQueryList;
  private mobileQueryListener: () => void;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly metaTagService = inject(MetaTagService);
  private readonly structuredData = inject(StructuredDataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly telemetry = inject(DocsTelemetryService);
  private readonly scrollDispatcher = inject(ScrollDispatcher);
  private readonly document = inject(DOCUMENT);
  private readonly searchOpener = inject(DocsSearchOpener);

  /**
   * Shown on the toolbar button. The modifier differs by platform, and the
   * check is guarded: this initializer also runs in Node during prerendering,
   * where there is no navigator to ask.
   */
  readonly searchTooltip = `Search documentation (${shortcutLabel(
    isPlatformBrowser(this.platformId) && isApplePlatform(navigator.platform)
  )})`;

  @ViewChild('snav', { static: true }) snav;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    media: MediaMatcher,
    private title: Title,
    private ngZone: NgZone
  ) {
    this.mobileQuery = media.matchMedia('(max-width: 600px)');

    this.mobileQueryListener = () => {
      this.ngZone.run(() => {
        if (!this.mobileQuery.matches) {
          this.snav.open();
        } else {
          this.snav.close();
        }
        this.changeDetectorRef.detectChanges();
      });
    };

    this.mobileQuery.addListener(this.mobileQueryListener);
  }

  ngAfterViewInit() {
    if (!this.mobileQuery.matches) {
      setTimeout(() => {
        this.snav.open();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this.mobileQueryListener);
  }

  ngOnInit() {
    this.applySeoForUrl(this.router.url);
    this.trackPageViewForUrl(this.router.url);
    // takeUntilDestroyed prevents the destroyed docs component from reacting to a
    // later NavigationEnd (e.g. navigating to '/' or a slicer page) and clearing
    // the structured data those pages just set.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        this.applySeoForUrl(e.urlAfterRedirects);
        this.trackPageViewForUrl(e.urlAfterRedirects);
      });

    this.trackScrollDepth();

    // document is unavailable during Node prerendering; only load the YouTube API
    // in the browser.
    if (isPlatformBrowser(this.platformId) && !apiLoaded) {
      // This code loads the IFrame Player API code asynchronously, according to the instructions at
      // https://developers.google.com/youtube/iframe_api_reference#Getting_Started
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      apiLoaded = true;
    }
  }

  /**
   * The shell outlives a navigation away from /docs, so a page view is only
   * reported while we are actually on a docs route — otherwise leaving the
   * section would be logged as a visit to the docs root.
   */
  private trackPageViewForUrl(url: string): void {
    if (/^\/?docs(\/|$|[?#])/.test(url)) {
      this.currentSlug.set(slugFromDocsUrl(url));
      this.telemetry.trackPageView(url);
      this.sampleScrollDepth();
    }
  }

  /**
   * Depth is sampled through the CDK dispatcher rather than a window listener
   * because which element scrolls depends on the layout, and the dispatcher
   * reports both. `resolveScrollContainer` settles which one to read.
   */
  private trackScrollDepth(): void {
    this.scrollDispatcher
      .scrolled(SCROLL_AUDIT_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((scrollable: CdkScrollable | void) =>
        this.sampleScrollDepth(scrollable || undefined)
      );
  }

  /**
   * Takes one depth reading. Also called on arrival: a page that fits on screen
   * can never fire a scroll event, and without this would be reported as 0%
   * read rather than fully read.
   *
   * The element the dispatcher hands us is only trusted when it has somewhere
   * to scroll. `scrollPercentOf` reads an element with no scroll range as 100%
   * — right for a short page, badly wrong for the wrong element — so reading a
   * container that merely exists reports every visit as fully read.
   */
  private sampleScrollDepth(scrollable?: CdkScrollable): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const reported = scrollable?.getElementRef().nativeElement;
    const element =
      reported && scrolls(reported)
        ? reported
        : resolveScrollContainer(this.document);
    if (element) {
      this.telemetry.trackScrollDepth(
        scrollPercentOf(element),
        this.currentSlug()
      );
    }
  }

  private applySeoForUrl(url: string): void {
    // '/docs/prints?x=1#y' -> 'docs/prints'
    const path = url.split(/[?#]/)[0].replace(/^\/+/, '');
    const tags = getDocSeoTags(path);
    if (tags) {
      this.metaTagService.setSeoTags(tags);
      this.structuredData.setJsonLd([
        buildDocArticle(tags),
        buildDocBreadcrumb(tags),
      ]);
    } else {
      this.title.setTitle('Documentation - 3D Print Log');
      this.structuredData.setJsonLd([]);
    }
  }

  openSearch(query?: string): void {
    this.searchOpener.open(query);
  }

  /** Ctrl+K / Cmd+K opens search, the shortcut every docs site uses. */
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!isSearchShortcut(event)) {
      return;
    }
    event.preventDefault();
    this.openSearch();
  }

  handleSidebarClick() {
    if (this.mobileQuery.matches) {
      this.snav.toggle();
    }
  }
}
