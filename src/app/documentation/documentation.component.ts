import { MediaMatcher } from '@angular/cdk/layout';
import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
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

let apiLoaded = false;

@Component({
  selector: 'app-documentation',
  templateUrl: './documentation.component.html',
  styleUrls: ['./documentation.component.scss'],
  standalone: false,
})
export class DocumentationComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  mobileQuery: MediaQueryList;
  private mobileQueryListener: () => void;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly metaTagService = inject(MetaTagService);
  private readonly structuredData = inject(StructuredDataService);
  private readonly destroyRef = inject(DestroyRef);

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
    // takeUntilDestroyed prevents the destroyed docs component from reacting to a
    // later NavigationEnd (e.g. navigating to '/' or a slicer page) and clearing
    // the structured data those pages just set.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => this.applySeoForUrl(e.urlAfterRedirects));

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

  handleSidebarClick() {
    if (this.mobileQuery.matches) {
      this.snav.toggle();
    }
  }
}
