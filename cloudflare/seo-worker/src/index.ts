import type { Env } from './env';
import { notPublic, withSeo } from './rewrite';
import { matchSeoRoute } from './routes';
import { fetchSeo } from './seo';

const DEFAULT_TIMEOUT_MS = 1500;

/** Request headers that would get a 304 or a partial body instead of a shell to rewrite. */
const CONDITIONAL_HEADERS = [
  'if-none-match',
  'if-modified-since',
  'if-match',
  'if-unmodified-since',
  'if-range',
  'range',
];

function timeoutMs(env: Env): number {
  const value = Number.parseInt(env.SEO_TIMEOUT_MS ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

/** The request as is, or re-addressed to ORIGIN_URL when that is set (local dev only). */
function toOrigin(request: Request, env: Env): Request {
  if (!env.ORIGIN_URL) return request;
  const incoming = new URL(request.url);
  return new Request(
    new URL(`${incoming.pathname}${incoming.search}`, env.ORIGIN_URL).href,
    request
  );
}

/** The request for a page the Worker will rewrite: never conditional, never a range. */
function rewriteRequest(request: Request, env: Env): Request {
  const forwarded = new Request(toOrigin(request, env));
  for (const name of CONDITIONAL_HEADERS) forwarded.headers.delete(name);
  return forwarded;
}

/**
 * The canonical URL on SITE_ORIGIN. The API builds it from its own setting
 * (Email:WebBaseUrl); if that ever names another host (a staging API, a typo), the page
 * still claims the site's canonical host rather than pointing crawlers elsewhere.
 */
function onSiteOrigin(
  canonicalUrl: string,
  siteOrigin: string,
  path: string
): string {
  const canonical = new URL(canonicalUrl);
  const site = new URL(siteOrigin);
  if (canonical.origin === site.origin) return canonical.href;
  console.warn(
    JSON.stringify({
      msg: 'canonical URL not on SITE_ORIGIN; rewriting its host',
      path,
      canonicalUrl,
      siteOrigin,
    })
  );
  return new URL(`${canonical.pathname}${canonical.search}`, site.origin).href;
}

function isHtmlPage(response: Response): boolean {
  return (
    response.status === 200 &&
    /^text\/html\b/i.test(response.headers.get('content-type') ?? '')
  );
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return fetch(toOrigin(request, env));
    const url = new URL(request.url);
    const route = matchSeoRoute(url.pathname);
    if (!route) return fetch(toOrigin(request, env));
    // If this code throws, Cloudflare sends the request to the origin instead of an error page.
    ctx.passThroughOnException();

    const seoUrl = `${env.API_BASE_URL.replace(/\/+$/, '')}${route.seoPath}`;
    const [origin, seo] = await Promise.all([
      fetch(rewriteRequest(request, env)),
      fetchSeo(seoUrl, { timeoutMs: timeoutMs(env), ctx }),
    ]);

    if (!isHtmlPage(origin)) return origin;
    const isHead = request.method === 'HEAD';
    const failOpen = (reason: string): Response => {
      // The page works exactly as it does without the Worker.
      console.warn(
        JSON.stringify({
          msg: 'seo unavailable, serving the shell unchanged',
          path: url.pathname,
          seoUrl,
          reason,
        })
      );
      return origin;
    };
    try {
      switch (seo.kind) {
        case 'ok': {
          const canonicalUrl = onSiteOrigin(
            seo.seo.canonicalUrl,
            env.SITE_ORIGIN,
            url.pathname
          );
          return withSeo(
            origin,
            { ...seo.seo, canonicalUrl },
            seo.maxAge,
            isHead
          );
        }
        case 'not-found':
          return notPublic(origin, isHead);
        case 'error':
          return failOpen(seo.reason);
      }
    } catch (error) {
      return failOpen(`rewrite failed: ${String(error)}`);
    }
  },
} satisfies ExportedHandler<Env>;
