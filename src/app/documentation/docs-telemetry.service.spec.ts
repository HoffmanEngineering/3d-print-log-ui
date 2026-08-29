import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  DocsTelemetryService,
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

      service.trackScrollDepth(30);

      expect(depthCalls()).toEqual([
        jasmine.objectContaining({ slug: 'prints', bucket: 25 }),
      ]);
    });

    it('does not re-emit a bucket already reported for this page', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackScrollDepth(30);
      service.trackScrollDepth(40);
      service.trackScrollDepth(26);

      expect(depthCalls().length).toBe(1);
    });

    it('emits every bucket crossed in a single jump, in order', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackScrollDepth(100);

      expect(depthCalls().map((p) => p['bucket'])).toEqual([25, 50, 75, 100]);
    });

    it('emits nothing below the first bucket', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackScrollDepth(24);

      expect(depthCalls()).toEqual([]);
    });

    it('reports buckets again for the next page', () => {
      const service = configure();
      service.trackPageView('/docs/prints');
      service.trackScrollDepth(100);

      service.trackPageView('/docs/materials');
      service.trackScrollDepth(30);

      expect(depthCalls().slice(4)).toEqual([
        jasmine.objectContaining({ slug: 'materials', bucket: 25 }),
      ]);
    });

    it('ignores scroll reported before any page view', () => {
      const service = configure();

      expect(() => service.trackScrollDepth(50)).not.toThrow();
      expect(depthCalls()).toEqual([]);
    });
  });

  describe('trackFeedback', () => {
    it('emits Docs_Feedback with the current slug and the verdict', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackFeedback(true);

      expect(logging.logEvent).toHaveBeenCalledWith(
        'Docs_Feedback',
        jasmine.objectContaining({ slug: 'prints', helpful: true })
      );
    });

    it('includes trimmed free text when supplied', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackFeedback(false, '  the QR part is unclear  ');

      expect(logging.logEvent).toHaveBeenCalledWith(
        'Docs_Feedback',
        jasmine.objectContaining({ comment: 'the QR part is unclear' })
      );
    });

    it('omits the comment property entirely when the text is blank', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackFeedback(false, '   ');

      const props = logging.logEvent.calls.mostRecent().args[1] as Record<
        string,
        unknown
      >;
      expect('comment' in props).toBe(false);
    });

    it('truncates very long free text so a paste cannot bloat telemetry', () => {
      const service = configure();
      service.trackPageView('/docs/prints');

      service.trackFeedback(false, 'x'.repeat(2000));

      const props = logging.logEvent.calls.mostRecent().args[1] as Record<
        string,
        unknown
      >;
      expect((props['comment'] as string).length).toBe(1000);
    });
  });
});
