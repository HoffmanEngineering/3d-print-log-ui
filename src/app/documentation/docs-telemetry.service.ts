import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { LoggingService } from 'src/app/core/services/logging.service';

/** How the reader arrived at a docs page. */
export type ReferrerKind = 'direct' | 'internal' | 'search' | 'external';

/** Hostnames (or suffixes) that count as our own site. */
const INTERNAL_HOSTS = ['3dprintlog.com', 'localhost'];

/**
 * Search engines worth distinguishing from generic external traffic.
 *
 * Matched on label boundaries, not as substrings: `notbing.com` contains
 * "bing.com" but is not Bing. Trailing-dot entries cover the country variants
 * (google.co.uk, yandex.ru) without enumerating every TLD.
 */
const SEARCH_HOST_PATTERNS = [
  /(^|\.)google\./,
  /(^|\.)bing\.com$/,
  /(^|\.)duckduckgo\.com$/,
  /(^|\.)search\.yahoo\./,
  /(^|\.)ecosia\.org$/,
  /(^|\.)brave\.com$/,
  /(^|\.)startpage\.com$/,
  /(^|\.)baidu\.com$/,
  /(^|\.)yandex\./,
];

/** The slug reported for `/docs`, which redirects to getting-started. */
const ROOT_SLUG = 'getting-started';

/** `/docs/materials?tab=1#anchor` -> `materials`; `/docs` -> `getting-started`. */
export function slugFromDocsUrl(url: string): string {
  const path = url.split(/[?#]/)[0];
  const segments = path.split('/').filter(Boolean);
  const docsIndex = segments.indexOf('docs');
  return segments[docsIndex + 1] ?? ROOT_SLUG;
}

/** Scroll-depth milestones, ascending. */
const DEPTH_BUCKETS = [25, 50, 75, 100] as const;

/**
 * Cap on free-text feedback. Long enough for a real complaint, short enough
 * that an accidental paste cannot bloat a telemetry payload.
 */
const MAX_COMMENT_LENGTH = 1000;

/**
 * Emits the Phase 0 documentation telemetry events.
 *
 * Everything goes through `LoggingService`, which already no-ops without a
 * browser or an instrumentation key — so prerendering and logged-out visits
 * degrade cleanly rather than throwing.
 */
@Injectable()
export class DocsTelemetryService {
  private readonly logging = inject(LoggingService);
  private readonly document = inject(DOCUMENT);

  /** Slug of the page currently being read; null before the first page view. */
  private currentSlug: string | null = null;

  /** Depth buckets already reported for `currentSlug`. */
  private reportedBuckets = new Set<number>();

  /** False until the first page view; `document.referrer` only describes that one. */
  private hasReportedFirstView = false;

  trackPageView(url: string): void {
    this.currentSlug = slugFromDocsUrl(url);
    this.reportedBuckets.clear();

    // document.referrer is frozen at the landing page for the life of the SPA,
    // so reusing it would label every later in-app navigation with however the
    // reader originally arrived.
    const referrerKind: ReferrerKind = this.hasReportedFirstView
      ? 'internal'
      : this.referrerKind();
    this.hasReportedFirstView = true;

    this.logging.logEvent('Docs_PageView', {
      slug: this.currentSlug,
      referrerKind,
    });
  }

  /**
   * Reports how far down the page the reader has reached. Each bucket fires at
   * most once per page view; a single large jump reports every bucket it passed
   * so a fast scroll is not indistinguishable from a short page.
   *
   * `slug` is the page the sample was taken on. Scroll sampling is audited, so
   * a sample can be delivered after the reader has already navigated; one that
   * belongs to a page we have left is dropped rather than misattributed.
   */
  trackScrollDepth(percent: number, slug: string): void {
    if (this.currentSlug === null || slug !== this.currentSlug) {
      return;
    }

    for (const bucket of DEPTH_BUCKETS) {
      if (percent >= bucket && !this.reportedBuckets.has(bucket)) {
        this.reportedBuckets.add(bucket);
        this.logging.logEvent('Docs_ScrollDepth', {
          slug: this.currentSlug,
          bucket,
        });
      }
    }
  }

  /**
   * `slug` is the page the vote was cast on. A negative vote is held while the
   * reader explains it and may be flushed after navigation, so resolving the
   * page at send time would file the complaint against the wrong document.
   */
  trackFeedback(
    helpful: boolean,
    comment: string | undefined,
    slug: string
  ): void {
    const trimmed = comment?.trim();
    this.logging.logEvent('Docs_Feedback', {
      slug: slug || (this.currentSlug ?? 'unknown'),
      helpful,
      ...(trimmed ? { comment: trimmed.slice(0, MAX_COMMENT_LENGTH) } : {}),
    });
  }

  private referrerKind(): ReferrerKind {
    const referrer = this.document?.referrer ?? '';
    if (!referrer) {
      return 'direct';
    }

    let host: string;
    try {
      host = new URL(referrer).hostname.toLowerCase();
    } catch {
      // A referrer we cannot parse tells us nothing beyond "not ours".
      return 'external';
    }

    if (INTERNAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return 'internal';
    }
    if (SEARCH_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
      return 'search';
    }
    return 'external';
  }
}

/** Geometry of a scrolling element, whether the document or a CDK scrollable. */
export interface ScrollGeometry {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}

/**
 * How far through the content the reader has reached, 0-100.
 *
 * A page that fits entirely on screen counts as fully read — there is nothing
 * left to scroll to, so treating it as 0% would misreport every short page.
 */
export function scrollPercentOf(geometry: ScrollGeometry): number {
  const scrollable = geometry.scrollHeight - geometry.clientHeight;
  if (scrollable <= 0) {
    return 100;
  }
  const percent = (geometry.scrollTop / scrollable) * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
}
