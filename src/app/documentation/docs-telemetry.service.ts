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
 * Cap on a reported search query. Real queries are a few words; anything longer
 * is a paste, and `zero-result-searches.kql` groups on this value so an
 * unbounded one would also make its own row forever.
 */
const MAX_QUERY_LENGTH = 200;

/** Stands in for a query that did not look like something a person typed. */
export const REDACTED_QUERY = '[redacted]';

/**
 * Longest reported query, in words. Real ones are two or three; a command
 * fragment such as `claude mcp add --transport http printlog` runs longer, and
 * so does a question typed out in full — "how do I connect my klipper printer
 * to the print log app" is exactly the zero-result row worth reading. Past
 * this it is a paste rather than a question.
 */
const MAX_QUERY_WORDS = 16;

/** Longest single word. "troubleshooting" is 15; an API key is not a word. */
const MAX_QUERY_WORD_LENGTH = 24;

/**
 * Letters, digits, and the punctuation that appears in words, flags and paths —
 * so `--callback-port`, `X-Api-Key` and `api/Moonraker` all report as typed.
 *
 * `:` and `@` are deliberately absent. They are what make a URL a URL and an
 * address an address, and excluding them is what keeps a pasted signed link or
 * email out of telemetry while the flags stay readable.
 *
 * So is `=`. `password=hunter2` is sixteen ordinary lowercase characters — it
 * clears the length cap and it is not mixed-case enough to read as generated,
 * so the assignment itself is the only thing marking it as a secret. Nothing
 * a reader searches for needs one.
 */
const REPORTABLE_WORD = /^[\p{L}\p{N}'\-_./+]+$/u;

/** Shortest word that is long enough to be worth checking for key-ness. */
const TOKEN_MIN_LENGTH = 16;

/**
 * Whether a word reads as a generated key rather than something typed.
 *
 * The length cap alone stops a 32-character client ID, but not a shorter one.
 * Mixed case AND digits AND length together is the shape of a generated
 * secret; ordinary long words are one case (`troubleshooting`), and named
 * things keep their case without digits (`OctoPrint-Webhook`).
 */
function looksLikeToken(word: string): boolean {
  return (
    word.length >= TOKEN_MIN_LENGTH &&
    /\p{Ll}/u.test(word) &&
    /\p{Lu}/u.test(word) &&
    /\p{N}/u.test(word)
  );
}

/**
 * Whether a query is safe to report as written.
 *
 * The docs cover auth setup and the MCP page ships a real client ID, so a
 * reader can plausibly paste a token, an email, or a signed URL into the
 * palette — and `logEvent` would carry it straight to App Insights.
 *
 * This allows rather than blocks. A blocklist of things that look secret has
 * to recognise every format a secret can take and fails open on the next one;
 * a shape test for "a few ordinary words" fails closed instead, and the
 * queries worth reading — `qr code`, `filament cost`, `--callback-port` —
 * all pass it.
 */
export function isReportableQuery(query: string): boolean {
  const words = query.split(/\s+/).filter(Boolean).map(trimSentencePunctuation);

  return (
    words.length > 0 &&
    words.length <= MAX_QUERY_WORDS &&
    words.every(
      (word) =>
        word.length <= MAX_QUERY_WORD_LENGTH &&
        REPORTABLE_WORD.test(word) &&
        !looksLikeToken(word)
    )
  );
}

/**
 * Drops the punctuation that ends a word in a sentence, so ordinary phrasing
 * is judged on the word itself.
 *
 * "why won't my print stick?" and "error: missing_refresh_token" are the shape
 * of a real docs search, and both were being withheld over one trailing mark.
 * Only trailing marks go: a `:` in the MIDDLE of a word is still what makes
 * `https://…` a URL, and that has to stay disqualifying.
 */
function trimSentencePunctuation(word: string): string {
  return word.replace(/[.,;:!?]+$/, '');
}

/** The query as reported: itself, or a marker that still counts as a search. */
function reportableQuery(query: string): string {
  return isReportableQuery(query)
    ? query.slice(0, MAX_QUERY_LENGTH)
    : REDACTED_QUERY;
}

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

  /**
   * A settled search. Emitted for zero-result queries too — `zero-result-searches.kql`
   * is the most actionable query in the whole analytics set, and it is fed
   * entirely by the searches that found nothing.
   *
   * The query is reported only when it looks like something a person typed;
   * see `isReportableQuery`. An accidental paste must not become the payload.
   */
  trackSearch(query: string, resultCount: number): void {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    // Redacted rather than dropped: a search that found nothing still counts
    // toward the zero-result rate even when its text cannot be reported.
    this.logging.logEvent('Docs_Search', {
      query: reportableQuery(trimmed),
      resultCount,
    });
  }

  /**
   * A result the reader actually opened.
   *
   * `rank` is 0-based, matching the position in the rendered list.
   * `search-quality.kql` averages it to see how far down the useful answer sits.
   */
  trackSearchResultClick(query: string, slug: string, rank: number): void {
    this.logging.logEvent('Docs_SearchResultClick', {
      query: reportableQuery(query.trim()),
      slug: slugFromDocsUrl(slug),
      rank,
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
