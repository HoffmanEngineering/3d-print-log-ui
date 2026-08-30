import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  DocsTelemetryService,
  REDACTED_QUERY,
  isReportableQuery,
  scrollPercentOf,
} from './docs-telemetry.service';

describe('scrollPercentOf', () => {
  it('reports 0 at the top of a long page', () => {
    expect(
      scrollPercentOf({ scrollTop: 0, clientHeight: 800, scrollHeight: 4000 })
    ).toBe(0);
  });

  it('reports 100 when scrolled to the bottom', () => {
    expect(
      scrollPercentOf({
        scrollTop: 3200,
        clientHeight: 800,
        scrollHeight: 4000,
      })
    ).toBe(100);
  });

  it('reports the midpoint of the scrollable distance', () => {
    expect(
      scrollPercentOf({
        scrollTop: 1600,
        clientHeight: 800,
        scrollHeight: 4000,
      })
    ).toBe(50);
  });

  it('treats a page shorter than the viewport as fully read', () => {
    expect(
      scrollPercentOf({ scrollTop: 0, clientHeight: 800, scrollHeight: 600 })
    ).toBe(100);
  });

  it('never exceeds 100 when the browser over-scrolls', () => {
    expect(
      scrollPercentOf({
        scrollTop: 3500,
        clientHeight: 800,
        scrollHeight: 4000,
      })
    ).toBe(100);
  });
});

describe('DocsTelemetryService', () => {
  let logging: jasmine.SpyObj<LoggingService>;

  /** Builds the service with a stubbed document.referrer. */
  function configure(referrer = ''): DocsTelemetryService {
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        DocsTelemetryService,
        { provide: LoggingService, useValue: logging },
        { provide: DOCUMENT, useValue: { referrer } },
      ],
    });
    return TestBed.inject(DocsTelemetryService);
  }

  function propsOf(call: number): Record<string, unknown> {
    return logging.logEvent.calls.argsFor(call)[1] as Record<string, unknown>;
  }

  describe('trackPageView', () => {
    it('emits Docs_PageView with the slug taken from the docs route', () => {
      const service = configure();

      service.trackPageView('/docs/prints');

      expect(logging.logEvent).toHaveBeenCalledWith(
        'Docs_PageView',
        jasmine.objectContaining({ slug: 'prints' })
      );
    });

    it('strips query strings and fragments from the slug', () => {
      const service = configure();

      service.trackPageView('/docs/materials?tab=1#loaded_filament');

      expect(propsOf(0)['slug']).toBe('materials');
    });

    it('reports the docs root as the getting-started slug', () => {
      const service = configure();

      service.trackPageView('/docs');

      expect(propsOf(0)['slug']).toBe('getting-started');
    });
  });

  describe('referrer kind', () => {
    it('classifies an empty referrer as direct', () => {
      const service = configure('');

      service.trackPageView('/docs/prints');

      expect(propsOf(0)['referrerKind']).toBe('direct');
    });

    it('classifies a search engine referrer as search', () => {
      const service = configure('https://www.google.com/search?q=filament');

      service.trackPageView('/docs/prints');

      expect(propsOf(0)['referrerKind']).toBe('search');
    });

    it('classifies our own origin as internal', () => {
      const service = configure('https://www.3dprintlog.com/prints');

      service.trackPageView('/docs/prints');

      expect(propsOf(0)['referrerKind']).toBe('internal');
    });

    it('classifies anything else as external', () => {
      const service = configure('https://old.reddit.com/r/3Dprinting');

      service.trackPageView('/docs/prints');

      expect(propsOf(0)['referrerKind']).toBe('external');
    });

    it('describes later navigations as internal, not as the landing referrer', () => {
      const service = configure('https://www.google.com/search?q=filament');

      service.trackPageView('/docs/prints');
      service.trackPageView('/docs/materials');

      expect(propsOf(0)['referrerKind']).toBe('search');
      expect(propsOf(1)['referrerKind']).toBe('internal');
    });

    it('does not treat a lookalike host as a search engine', () => {
      const service = configure('https://notbing.com/page');

      service.trackPageView('/docs/prints');

      expect(propsOf(0)['referrerKind']).toBe('external');
    });

    it('does not throw on a malformed referrer', () => {
      const service = configure('not a url');

      expect(() => service.trackPageView('/docs/prints')).not.toThrow();
      expect(propsOf(0)['referrerKind']).toBe('external');
    });
  });

  describe('trackScrollDepth', () => {
    /** Scroll-depth events only, ignoring the page view. */
    function depthCalls(): Array<Record<string, unknown>> {
      return logging.logEvent.calls
        .allArgs()
        .filter((args) => args[0] === 'Docs_ScrollDepth')
        .map((args) => args[1] as Record<string, unknown>);
    }

    it('emits a bucket once the reader passes it', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackScrollDepth(30, 'prints');

      expect(depthCalls()).toEqual([
        jasmine.objectContaining({ slug: 'prints', bucket: 25 }),
      ]);
    });

    it('does not re-emit a bucket already reported for this page', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackScrollDepth(30, 'prints');
      service.trackScrollDepth(40, 'prints');
      service.trackScrollDepth(26, 'prints');

      expect(depthCalls().length).toBe(1);
    });

    it('emits every bucket crossed in a single jump, in order', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackScrollDepth(100, 'prints');

      expect(depthCalls().map((p) => p['bucket'])).toEqual([25, 50, 75, 100]);
    });

    it('emits nothing below the first bucket', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackScrollDepth(24, 'prints');

      expect(depthCalls()).toEqual([]);
    });

    it('reports buckets again for the next page', () => {
      const service = configure();
      service.trackPageView('/docs/prints');
      service.trackScrollDepth(100, 'prints');

      service.trackPageView('/docs/materials');
      service.trackScrollDepth(30, 'materials');

      expect(depthCalls().slice(4)).toEqual([
        jasmine.objectContaining({ slug: 'materials', bucket: 25 }),
      ]);
    });

    it('drops a sample belonging to a page the reader has already left', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackPageView('/docs/materials');
      service.trackScrollDepth(80, 'prints');

      expect(depthCalls()).toEqual([]);
    });

    it('ignores scroll reported before any page view', () => {
      const service = configure();

      expect(() => service.trackScrollDepth(50, 'prints')).not.toThrow();
      expect(depthCalls()).toEqual([]);
    });
  });

  describe('trackFeedback', () => {
    it('emits Docs_Feedback with the current slug and the verdict', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackFeedback(true, undefined, 'prints');

      expect(logging.logEvent).toHaveBeenCalledWith(
        'Docs_Feedback',
        jasmine.objectContaining({ slug: 'prints', helpful: true })
      );
    });

    it('attributes feedback to the page it was cast on, not the current one', () => {
      const service = configure();
      service.trackPageView('/docs/prints');
      service.trackPageView('/docs/materials');

      service.trackFeedback(false, 'unclear', 'prints');

      expect(logging.logEvent).toHaveBeenCalledWith(
        'Docs_Feedback',
        jasmine.objectContaining({ slug: 'prints' })
      );
    });

    it('includes trimmed free text when supplied', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackFeedback(false, '  the QR part is unclear  ', 'prints');

      expect(logging.logEvent).toHaveBeenCalledWith(
        'Docs_Feedback',
        jasmine.objectContaining({ comment: 'the QR part is unclear' })
      );
    });

    it('omits the comment property entirely when the text is blank', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackFeedback(false, '   ', 'prints');

      const props = logging.logEvent.calls.mostRecent().args[1] as Record<
        string,
        unknown
      >;
      expect('comment' in props).toBe(false);
    });

    it('truncates very long free text so a paste cannot bloat telemetry', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackFeedback(false, 'x'.repeat(2000), 'prints');

      const props = logging.logEvent.calls.mostRecent().args[1] as Record<
        string,
        unknown
      >;
      expect((props['comment'] as string).length).toBe(1000);
    });
  });

  describe('trackSearch', () => {
    it('reports the query and how many results it found', () => {
      const service = configure();

      service.trackSearch('spool photos', 4);

      expect(logging.logEvent).toHaveBeenCalledWith('Docs_Search', {
        query: 'spool photos',
        resultCount: 4,
      });
    });

    it('reports a search that found nothing', () => {
      // This is the row zero-result-searches.kql exists to surface: something a
      // real person expected to find and could not.
      const service = configure();

      service.trackSearch('kryptonite', 0);

      expect(logging.logEvent).toHaveBeenCalledWith('Docs_Search', {
        query: 'kryptonite',
        resultCount: 0,
      });
    });

    it('trims the query, so the same search groups as one row', () => {
      const service = configure();

      service.trackSearch('  spool  ', 1);

      expect(propsOf(0)['query']).toBe('spool');
    });

    it('reports nothing for an empty query', () => {
      const service = configure();

      service.trackSearch('   ', 0);

      expect(logging.logEvent).not.toHaveBeenCalled();
    });

    it('redacts a pasted query but still counts the search', () => {
      const service = configure();

      service.trackSearch('x'.repeat(5000), 0);

      expect(propsOf(0)['query']).toBe(REDACTED_QUERY);
      // The row still has to reach zero-result-searches.kql: a search that
      // found nothing counts even when its text cannot be reported.
      expect(propsOf(0)['resultCount']).toBe(0);
    });

    it('redacts something that looks like a credential', () => {
      const service = configure();

      service.trackSearch('uzxvtpefYIrWoYbaJteoRzZtIYw4wP7j', 0);

      expect(propsOf(0)['query']).toBe(REDACTED_QUERY);
    });
  });

  describe('trackSearchResultClick', () => {
    it('reports the query, the page opened, and its rank', () => {
      const service = configure();

      service.trackSearchResultClick('spool photos', 'docs/release-notes', 2);

      expect(logging.logEvent).toHaveBeenCalledWith('Docs_SearchResultClick', {
        query: 'spool photos',
        slug: 'release-notes',
        rank: 2,
      });
    });

    it('reports the top result as rank 0', () => {
      const service = configure();

      service.trackSearchResultClick('materials', 'docs/materials', 0);

      expect(propsOf(0)['rank']).toBe(0);
    });

    it('reduces the path to the slug the other docs events use', () => {
      // Every other Docs_* event keys on the slug; a full path here would not
      // join against them.
      const service = configure();

      service.trackSearchResultClick('a', 'docs/materials', 0);

      expect(propsOf(0)['slug']).toBe('materials');
    });

    it('redacts a pasted query', () => {
      const service = configure();

      service.trackSearchResultClick('x'.repeat(5000), 'docs/materials', 0);

      expect(propsOf(0)['query']).toBe(REDACTED_QUERY);
    });
  });
});

describe('isReportableQuery', () => {
  // The docs cover auth setup and the MCP page ships a real client ID, so the
  // palette is one keystroke away from a reader holding a credential. This
  // allows ordinary words rather than blocking known secret shapes, so an
  // unfamiliar format fails closed instead of passing through.
  it('reports the queries worth reading', () => {
    for (const query of [
      'qr code',
      'filament cost',
      'klipper macro',
      "printer's nozzle",
      'multi-material',
      'G-code',
      'Fehlerbehebung',
      // Command shapes: the reader who searches a flag is the reader the
      // integration pages are written for, and an empty analytics row for
      // them is the blind spot this list exists to avoid.
      '--callback-port',
      '--callback-port 8400',
      'claude mcp add --transport http printlog',
      'X-Api-Key',
      'api/Moonraker/notifier',
      'OctoPrint-Webhook',
      '3d_print_log',
    ]) {
      expect(isReportableQuery(query)).withContext(query).toBe(true);
    }
  });

  it('withholds anything that does not read as typed words', () => {
    for (const query of [
      'uzxvtpefYIrWoYbaJteoRzZtIYw4wP7j',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0',
      'csh.hoffman@gmail.com',
      'https://api.3dprintlog.com/mcp',
      'x'.repeat(5000),
      '',
      '   ',
      // A flag carrying a real credential is still withheld: widening the
      // character class for commands must not widen it for what follows one.
      '--client-id uzxvtpefYIrWoYbaJteoRzZtIYw4wP7j',
      // Short enough to pass the length cap, still shaped like a key.
      'aB3xK9mQ2pL7wR4t',
      // Ten words is a command; more than that is prose.
      'how do I connect my klipper printer to the print log app',
    ]) {
      expect(isReportableQuery(query))
        .withContext(JSON.stringify(query.slice(0, 40)))
        .toBe(false);
    }
  });
});
