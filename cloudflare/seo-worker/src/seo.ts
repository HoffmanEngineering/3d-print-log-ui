import { safeHttpUrl } from './html';
import type { SeoKind } from './routes';

/**
 * The parts of the API's SeoMetadataDto (3d-print-log-api, `/api/{type}/{id}/seo`) the
 * Worker uses, after validation. Every string here is plain text from the API and must be
 * HTML-escaped before it goes into a page; every URL is absolute http(s).
 */
export interface SeoMetadata {
  type: SeoKind;
  title: string;
  description: string;
  canonicalUrl: string;
  image: SeoImage | null;
  author: SeoAuthor | null;
  publishedAt: string | null;
  updatedAt: string | null;
  facts: SeoFact[];
}

export interface SeoImage {
  url: string;
  width: number | null;
  height: number | null;
  alt: string | null;
}

export interface SeoAuthor {
  name: string;
  url: string | null;
}

export interface SeoFact {
  label: string;
  value: string;
}

export type SeoResult =
  /** `maxAge`: how long a shared cache may keep this answer, in seconds (0 for not at all). */
  | { kind: 'ok'; seo: SeoMetadata; maxAge: number }
  | { kind: 'not-found' }
  | { kind: 'error'; reason: string };

const KINDS: readonly SeoKind[] = ['print', 'project', 'profile'];

/** The longest the Worker keeps a /seo answer, whatever the API says. */
export const MAX_SEO_CACHE_SECONDS = 300;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function size(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function date(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
    ? value
    : null;
}

function parseImage(value: unknown): SeoImage | null | undefined {
  if (value === null || value === undefined) return null;
  if (!isObject(value)) return undefined;
  const url = typeof value.url === 'string' ? safeHttpUrl(value.url) : null;
  if (!url) return null;
  return {
    url,
    width: size(value.width),
    height: size(value.height),
    alt: text(value.alt),
  };
}

function parseAuthor(value: unknown): SeoAuthor | null {
  if (!isObject(value)) return null;
  const name = text(value.name);
  if (!name) return null;
  return {
    name,
    url: typeof value.url === 'string' ? safeHttpUrl(value.url) : null,
  };
}

function parseFacts(value: unknown): SeoFact[] | undefined {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((fact): SeoFact[] => {
    if (!isObject(fact)) return [];
    const label = text(fact.label);
    const factValue = text(fact.value);
    return label && factValue ? [{ label, value: factValue }] : [];
  });
}

/**
 * Validates a /seo body. Returns null when the shape is not what the Worker can use
 * (unknown type, no title, no http(s) canonical URL, a wrongly typed image or facts), so
 * the caller can fail open. Optional parts that are malformed are dropped instead.
 */
export function parseSeoMetadata(value: unknown): SeoMetadata | null {
  if (!isObject(value)) return null;
  const type = KINDS.find((kind) => kind === value.type);
  const title = text(value.title);
  const canonicalUrl =
    typeof value.canonicalUrl === 'string'
      ? safeHttpUrl(value.canonicalUrl)
      : null;
  const image = parseImage(value.image);
  const facts = parseFacts(value.facts);
  if (
    !type ||
    !title ||
    !canonicalUrl ||
    image === undefined ||
    facts === undefined
  )
    return null;
  return {
    type,
    title,
    description: typeof value.description === 'string' ? value.description : '',
    canonicalUrl,
    image,
    author: parseAuthor(value.author),
    publishedAt: date(value.publishedAt),
    updatedAt: date(value.updatedAt),
    facts,
  };
}

/** The max-age a Cache-Control value allows a shared cache, or null when it allows none. */
export function sharedMaxAge(cacheControl: string | null): number | null {
  if (!cacheControl) return null;
  const directives = cacheControl
    .toLowerCase()
    .split(',')
    .map((d) => d.trim());
  if (
    directives.some(
      (d) => d === 'no-store' || d === 'no-cache' || d === 'private'
    )
  )
    return null;
  const sMaxAge = directives.find((d) => d.startsWith('s-maxage='));
  const maxAge = sMaxAge ?? directives.find((d) => d.startsWith('max-age='));
  if (!maxAge) return null;
  const seconds = Number.parseInt(maxAge.slice(maxAge.indexOf('=') + 1), 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

interface FetchSeoOptions {
  timeoutMs: number;
  ctx: ExecutionContext;
}

/**
 * Fetches and validates /seo, from the Cache API when a fresh copy is there. Never throws:
 * a timeout, network error, non-200/404 status, non-JSON or unexpected shape is an
 * `error` result for the caller to fail open on.
 */
export async function fetchSeo(
  url: string,
  { timeoutMs, ctx }: FetchSeoOptions
): Promise<SeoResult> {
  const cacheKey = new Request(url, { method: 'GET' });
  const cache = caches.default;
  try {
    const cached = await cache.match(cacheKey);
    if (cached) return await readSeo(cached, null);
  } catch (error) {
    // A cache failure is not worth failing the page for; fall through to the API.
    console.warn(
      JSON.stringify({
        msg: 'seo cache read failed',
        url,
        error: String(error),
      })
    );
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const reason =
      error instanceof Error && error.name === 'TimeoutError'
        ? `timeout after ${timeoutMs}ms`
        : String(error);
    return { kind: 'error', reason };
  }
  return readSeo(response, { cache, cacheKey, ctx });
}

async function readSeo(
  response: Response,
  store: { cache: Cache; cacheKey: Request; ctx: ExecutionContext } | null
): Promise<SeoResult> {
  if (response.status === 404) {
    // The API answers a path it has no route for with this detail (ProblemDetailsStatusCodePages),
    // and SeoController's own "not public" 404 without it. An API that does not have /seo
    // (not deployed yet, or rolled back) must not turn every public page into 404 + noindex.
    const body = await response.text().catch(() => '');
    if (body.includes('No endpoint exists at this path')) {
      return {
        kind: 'error',
        reason: 'the API has no /seo endpoint (404, no route)',
      };
    }
    return { kind: 'not-found' };
  }
  if (response.status !== 200) {
    await response.body?.cancel();
    return { kind: 'error', reason: `status ${response.status}` };
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!/^application\/(?:[\w.+-]+\+)?json\b/i.test(contentType)) {
    await response.body?.cancel();
    return { kind: 'error', reason: `content-type ${contentType || '(none)'}` };
  }

  let body: string;
  let parsed: unknown;
  try {
    body = await response.text();
    parsed = JSON.parse(body);
  } catch (error) {
    return { kind: 'error', reason: `bad JSON: ${String(error)}` };
  }
  const seo = parseSeoMetadata(parsed);
  if (!seo) return { kind: 'error', reason: 'unexpected shape' };

  const apiMaxAge = sharedMaxAge(response.headers.get('cache-control'));
  const maxAge = Math.min(apiMaxAge ?? 0, MAX_SEO_CACHE_SECONDS);
  if (store && maxAge > 0) {
    // Store a clean copy: only the body and our own Cache-Control, so nothing from the API
    // response (a Set-Cookie from App Service, say) is cached or stops it being cached.
    const copy = new Response(body, {
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, max-age=${maxAge}`,
      },
    });
    store.ctx.waitUntil(
      store.cache.put(store.cacheKey, copy).catch((error: unknown) => {
        console.warn(
          JSON.stringify({
            msg: 'seo cache write failed',
            url: store.cacheKey.url,
            error: String(error),
          })
        );
      })
    );
  }
  return { kind: 'ok', seo, maxAge };
}
