import { escapeHtml, headTags, summaryHtml } from './html';
import type { SeoMetadata } from './seo';

/**
 * Tags in the shell that describe some other page (the shell's generic "Loading…"
 * description and noindex, or home-page identity tags a future index.html might carry).
 * They are removed and written again from /seo, so each ends up exactly once.
 */
const REPLACED_TAGS = [
  'meta[name="description"]',
  'link[rel="canonical"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
  'meta[name="robots"]',
  'meta[name="googlebot"]',
  'script[type="application/ld+json"]',
  // The shell inherits the home page's Markdown twin link; a print page has no twin.
  'link[rel="alternate"][type="text/markdown"]',
];

const remove: HTMLRewriterElementContentHandlers = {
  element(el) {
    el.remove();
  },
};

/** The response headers for a page the Worker changed. */
function rewrittenHeaders(
  origin: Response,
  marker: string,
  cacheControl?: string
): Headers {
  const headers = new Headers(origin.headers);
  // The body is a different length, and the origin's validators describe the shell's bytes:
  // a browser revalidating with them would get a 304 for a page whose metadata changed.
  headers.delete('content-length');
  headers.delete('etag');
  headers.delete('last-modified');
  if (cacheControl !== undefined) headers.set('cache-control', cacheControl);
  headers.set('x-seo-worker', marker);
  return headers;
}

function cacheDirectives(cacheControl: string): string[] {
  return cacheControl
    .toLowerCase()
    .split(',')
    .map((d) => d.trim());
}

/**
 * The Cache-Control for a rewritten page: the origin's, unless it would let a cache keep the
 * page longer than the /seo answer it was built from. The page is never cached longer than
 * either part allows.
 */
export function pageCacheControl(
  origin: string | null,
  seoMaxAge: number
): string {
  if (origin) {
    const directives = cacheDirectives(origin);
    if (
      directives.some(
        (d) => d === 'no-store' || d === 'no-cache' || d === 'private'
      )
    )
      return origin;
    const ages = directives
      .filter((d) => d.startsWith('max-age=') || d.startsWith('s-maxage='))
      .map((d) => Number.parseInt(d.slice(d.indexOf('=') + 1), 10));
    if (
      ages.length > 0 &&
      ages.every((age) => Number.isFinite(age) && age <= seoMaxAge)
    )
      return origin;
  }
  return seoMaxAge > 0 ? `public, max-age=${seoMaxAge}` : 'no-cache';
}

/** The shell with the page's own title, meta tags, JSON-LD and an HTML summary. */
export function withSeo(
  origin: Response,
  seo: SeoMetadata,
  seoMaxAge: number,
  isHead: boolean
): Response {
  const headers = rewrittenHeaders(
    origin,
    'rewritten',
    pageCacheControl(origin.headers.get('cache-control'), seoMaxAge)
  );
  if (isHead) return new Response(null, { status: 200, headers });

  let sawTitle = false;
  const rewriter = new HTMLRewriter()
    .on('title', {
      element(el) {
        sawTitle = true;
        el.setInnerContent(escapeHtml(seo.title), { html: true });
      },
    })
    .on('head', {
      element(el) {
        el.onEndTag((end) => {
          const title = sawTitle
            ? ''
            : `<title>${escapeHtml(seo.title)}</title>`;
          end.before(title + headTags(seo), { html: true });
        });
      },
    })
    .on('app-root', {
      element(el) {
        // After the skeleton, so the loading view people see is unchanged (see README).
        el.append(summaryHtml(seo), { html: true });
      },
    });
  for (const selector of REPLACED_TAGS) rewriter.on(selector, remove);

  return new Response(rewriter.transform(origin).body, {
    status: 200,
    headers,
  });
}

/**
 * The shell for a page that is not public (or does not exist): status 404 and noindex. The
 * SPA still boots from it, so an owner signed in and viewing their own private print still
 * sees the page.
 */
export function notPublic(origin: Response, isHead: boolean): Response {
  const headers = rewrittenHeaders(origin, 'not-public');
  if (isHead) return new Response(null, { status: 404, headers });

  const rewriter = new HTMLRewriter()
    .on('meta[name="robots"]', remove)
    .on('head', {
      element(el) {
        el.onEndTag((end) => {
          end.before('<meta name="robots" content="noindex">', { html: true });
        });
      },
    });
  return new Response(rewriter.transform(origin).body, {
    status: 404,
    headers,
  });
}
