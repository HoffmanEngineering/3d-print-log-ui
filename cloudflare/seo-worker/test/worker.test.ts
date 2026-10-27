import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/env';
import shell from './fixtures/app-shell.html?raw';
import { clone, PRINT_SEO, PROFILE_SEO, PROJECT_SEO } from './samples';

const SITE = 'https://www.3dprintlog.com';
const API = 'https://api.3dprintlog.com';

/** Headers SWA sends with a shell today (copied from a live response). */
const ORIGIN_HEADERS: Record<string, string> = {
  'content-type': 'text/html',
  'cache-control': 'public, must-revalidate, max-age=30',
  etag: '"52770391"',
  'last-modified': 'Tue, 20 Oct 2026 19:54:17 GMT',
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'x-frame-options': 'DENY',
  'cross-origin-opener-policy': 'same-origin-allow-popups',
  'content-security-policy-report-only':
    "default-src 'self'; frame-ancestors 'none'",
};

type ApiReply = Response | 'timeout' | 'throw';

interface Mock {
  calls: Request[];
  apiCalls: () => Request[];
  originCalls: () => Request[];
}

// Each test uses its own ids so the Cache API entry from one test never answers another.
let nextId = 1000;
function freshId(): number {
  return nextId++;
}

/** A project id no other test uses. */
function freshGuid(): string {
  return `00000000-0000-4000-8000-${String(freshId()).padStart(12, '0')}`;
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
    ...init,
  });
}

function seoFor(
  id: number | string,
  base = PRINT_SEO,
  kind = 'prints'
): typeof PRINT_SEO {
  const value = clone(base);
  value.canonicalUrl = `${SITE}/${kind}/${id}`;
  return value;
}

/**
 * Mocks outbound fetch: requests to the API host get `api`, everything else gets the
 * origin response.
 */
function mockFetch(
  opts: {
    api?: ApiReply | ((req: Request) => ApiReply);
    origin?: () => Response;
  } = {}
): Mock {
  const calls: Request[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input as RequestInfo, init);
      calls.push(req);
      if (
        req.url.startsWith(API) ||
        req.url.startsWith('https://api.example.test')
      ) {
        const reply =
          typeof opts.api === 'function'
            ? opts.api(req)
            : (opts.api ?? json(PRINT_SEO));
        if (reply === 'throw') throw new Error('network down');
        if (reply === 'timeout') {
          return new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal ?? req.signal;
            signal?.addEventListener('abort', () => reject(signal.reason));
          });
        }
        return reply;
      }
      return opts.origin
        ? opts.origin()
        : new Response(req.method === 'HEAD' ? null : shell, {
            status: 200,
            headers: ORIGIN_HEADERS,
          });
    }
  );
  return {
    calls,
    apiCalls: () =>
      calls.filter(
        (c) =>
          c.url.startsWith(API) || c.url.startsWith('https://api.example.test')
      ),
    originCalls: () =>
      calls.filter(
        (c) =>
          !(
            c.url.startsWith(API) ||
            c.url.startsWith('https://api.example.test')
          )
      ),
  };
}

async function run(
  input: string | Request,
  workerEnv: Env = env as Env
): Promise<Response> {
  // An incoming request carries `cf` properties a test-built one does not; the Worker reads none.
  const request = (
    typeof input === 'string' ? new Request(`${SITE}${input}`) : input
  ) as Request<unknown, IncomingRequestCfProperties>;
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, workerEnv, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

function count(html: string, re: RegExp): number {
  return (
    html.match(
      new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)
    ) ?? []
  ).length;
}

/** The content of the only meta tag with the given name/property; fails on zero or several. */
function metaContent(
  html: string,
  attr: 'name' | 'property',
  key: string
): string {
  const re = new RegExp(
    `<meta\\b[^>]*\\b${attr}="${key.replace(/[.:]/g, '\\$&')}"[^>]*>`,
    'g'
  );
  const tags = html.match(re) ?? [];
  expect(tags, `${attr}=${key}`).toHaveLength(1);
  const content = /\bcontent="([^"]*)"/.exec(tags[0]!);
  return content?.[1] ?? '';
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('pass-through', () => {
  it.each([
    '/prints',
    '/prints/new',
    '/prints/12/edit',
    '/prints/abc',
    '/projects/123',
    '/users/ada',
    '/docs/prints',
    '/',
  ])('%s goes straight to the origin', async (path) => {
    const mock = mockFetch();
    const res = await run(path);
    expect(mock.apiCalls()).toHaveLength(0);
    expect(mock.originCalls()).toHaveLength(1);
    expect(res.headers.get('etag')).toBe('"52770391"');
    expect(await res.text()).toBe(shell);
  });

  it.each(['POST', 'PUT', 'DELETE', 'OPTIONS'])(
    '%s on a public page goes straight to the origin',
    async (method) => {
      const mock = mockFetch();
      const res = await run(
        new Request(`${SITE}/prints/${freshId()}`, {
          method,
          body: method === 'OPTIONS' ? null : 'x',
        })
      );
      expect(mock.apiCalls()).toHaveLength(0);
      expect(mock.originCalls()[0]!.method).toBe(method);
      expect(res.status).toBe(200);
    }
  );

  it('sends pass-through requests to ORIGIN_URL when it is set (local dev)', async () => {
    // Without this, wrangler dev would fetch its own localhost URL and loop.
    const mock = mockFetch();
    await run(
      new Request('http://localhost:8790/prints/new?x=1', {
        method: 'POST',
        body: 'x',
      }),
      {
        ...(env as Env),
        ORIGIN_URL: 'https://www.3dprintlog.com',
      }
    );
    const sent = mock.originCalls()[0]!;
    expect(sent.url).toBe(`${SITE}/prints/new?x=1`);
    expect(sent.method).toBe('POST');
  });

  it('passes the request through unchanged, headers included', async () => {
    const mock = mockFetch();
    await run(
      new Request(`${SITE}/prints/new?x=1`, {
        headers: { 'if-none-match': '"abc"', cookie: 'a=b' },
      })
    );
    const sent = mock.originCalls()[0]!;
    expect(sent.url).toBe(`${SITE}/prints/new?x=1`);
    expect(sent.headers.get('if-none-match')).toBe('"abc"');
    expect(sent.headers.get('cookie')).toBe('a=b');
  });
});

describe('a public page', () => {
  it('fetches the matching /seo from API_BASE_URL', async () => {
    const id = freshId();
    const mock = mockFetch({ api: json(seoFor(id)) });
    await run(`/prints/${id}`);
    expect(mock.apiCalls().map((c) => c.url)).toEqual([
      `${API}/api/Prints/${id}/seo`,
    ]);
  });

  it('takes the API base URL from the environment', async () => {
    const id = freshId();
    const mock = mockFetch({ api: json(seoFor(id)) });
    await run(`/prints/${id}`, {
      ...(env as Env),
      API_BASE_URL: 'https://api.example.test/',
    });
    expect(mock.apiCalls().map((c) => c.url)).toEqual([
      `https://api.example.test/api/Prints/${id}/seo`,
    ]);
  });

  it.each<[string, (id: string) => string, string, () => string]>([
    ['a project', (id) => `/projects/${id}`, 'Projects', freshGuid],
    ['a profile', (id) => `/users/${id}`, 'Users', () => String(freshId())],
    [
      'a profile achievements tab',
      (id) => `/users/${id}/achievements`,
      'Users',
      () => String(freshId()),
    ],
  ])('%s reads its own /seo', async (_name, path, api, makeId) => {
    const id = makeId();
    const mock = mockFetch({ api: json(PROFILE_SEO) });
    await run(path(id));
    expect(mock.apiCalls().map((c) => new URL(c.url).pathname)).toEqual([
      `/api/${api}/${id}/seo`,
    ]);
  });

  it('asks the origin for a full response, not a 304 or a range', async () => {
    const id = freshId();
    const mock = mockFetch({ api: json(seoFor(id)) });
    await run(
      new Request(`${SITE}/prints/${id}?utm_source=discord`, {
        headers: {
          'if-none-match': '"52770391"',
          'if-modified-since': 'Tue, 20 Oct 2026 19:54:17 GMT',
          range: 'bytes=0-10',
        },
      })
    );
    const sent = mock.originCalls()[0]!;
    expect(sent.url).toBe(`${SITE}/prints/${id}?utm_source=discord`);
    expect(sent.headers.get('if-none-match')).toBeNull();
    expect(sent.headers.get('if-modified-since')).toBeNull();
    expect(sent.headers.get('range')).toBeNull();
  });

  it('fetches the origin from ORIGIN_URL when it is set (local dev)', async () => {
    const id = freshId();
    const mock = mockFetch({ api: json(seoFor(id)) });
    await run(new Request(`http://localhost:8790/prints/${id}?a=1`), {
      ...(env as Env),
      ORIGIN_URL: 'https://www.3dprintlog.com',
    });
    expect(mock.originCalls()[0]!.url).toBe(`${SITE}/prints/${id}?a=1`);
  });

  it('caches /seo for its max-age', async () => {
    const id = freshId();
    const mock = mockFetch({ api: () => json(seoFor(id)) });
    await run(`/prints/${id}`);
    await run(`/prints/${id}`);
    expect(mock.apiCalls()).toHaveLength(1);
  });

  it('does not cache /seo the API marks uncacheable', async () => {
    const id = freshId();
    const mock = mockFetch({
      api: () =>
        json(seoFor(id), {
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
          },
        }),
    });
    await run(`/prints/${id}`);
    await run(`/prints/${id}`);
    expect(mock.apiCalls()).toHaveLength(2);
  });
});

describe('rewriting a 200 /seo', () => {
  async function rewritten(
    path: string,
    seo: unknown,
    origin?: () => Response
  ): Promise<{ res: Response; html: string }> {
    mockFetch({ api: json(seo), origin });
    const res = await run(path);
    return { res, html: await res.text() };
  }

  it('sets the title, description and canonical link once each', async () => {
    const id = freshId();
    const { res, html } = await rewritten(`/prints/${id}`, seoFor(id));
    expect(res.status).toBe(200);
    expect(count(html, /<title>/)).toBe(1);
    expect(html).toContain('<title>Benchy | 3D Print Log</title>');
    expect(html).not.toContain('Loading… — 3D Print Log');
    expect(metaContent(html, 'name', 'description')).toBe(
      'Printed in two colors with a 0.4 nozzle.'
    );
    expect(count(html, /rel="canonical"/)).toBe(1);
    expect(html).toContain(
      `<link rel="canonical" href="${SITE}/prints/${id}">`
    );
  });

  it('writes Open Graph and Twitter tags for a print', async () => {
    const id = freshId();
    const { html } = await rewritten(`/prints/${id}`, seoFor(id));
    expect(metaContent(html, 'property', 'og:title')).toBe(
      'Benchy | 3D Print Log'
    );
    expect(metaContent(html, 'property', 'og:description')).toBe(
      'Printed in two colors with a 0.4 nozzle.'
    );
    expect(metaContent(html, 'property', 'og:url')).toBe(
      `${SITE}/prints/${id}`
    );
    expect(metaContent(html, 'property', 'og:type')).toBe('article');
    expect(metaContent(html, 'property', 'og:site_name')).toBe('3D Print Log');
    expect(metaContent(html, 'property', 'og:image')).toBe(
      'https://api.3dprintlog.com/api/Prints/123/social-image?v=3f2a9c1b7d4e'
    );
    expect(metaContent(html, 'property', 'og:image:width')).toBe('1200');
    expect(metaContent(html, 'property', 'og:image:height')).toBe('750');
    expect(metaContent(html, 'property', 'og:image:alt')).toBe('Benchy');
    expect(metaContent(html, 'name', 'twitter:card')).toBe(
      'summary_large_image'
    );
    expect(metaContent(html, 'name', 'twitter:title')).toBe(
      'Benchy | 3D Print Log'
    );
    expect(metaContent(html, 'name', 'twitter:description')).toBe(
      'Printed in two colors with a 0.4 nozzle.'
    );
    expect(metaContent(html, 'name', 'twitter:image')).toBe(
      'https://api.3dprintlog.com/api/Prints/123/social-image?v=3f2a9c1b7d4e'
    );
    expect(metaContent(html, 'name', 'twitter:image:alt')).toBe('Benchy');
  });

  it('marks a project as an article and a profile as a profile', async () => {
    const project = await rewritten(`/projects/${freshGuid()}`, PROJECT_SEO);
    expect(metaContent(project.html, 'property', 'og:type')).toBe('article');
    const profile = await rewritten(`/users/${freshId()}`, PROFILE_SEO);
    expect(metaContent(profile.html, 'property', 'og:type')).toBe('profile');
  });

  it('gives an image of unknown size no width or height tags', async () => {
    const { html } = await rewritten(`/users/${freshId()}`, PROFILE_SEO);
    expect(metaContent(html, 'property', 'og:image')).toBe(
      'https://lh3.googleusercontent.com/a/abc123'
    );
    expect(html).not.toContain('og:image:width');
    expect(html).not.toContain('og:image:height');
  });

  it('uses a small card and no image tags without an image', async () => {
    const id = freshId();
    const { html } = await rewritten(`/prints/${id}`, {
      ...seoFor(id),
      image: null,
    });
    expect(metaContent(html, 'name', 'twitter:card')).toBe('summary');
    expect(html).not.toContain('og:image');
    expect(html).not.toContain('twitter:image');
  });

  it('drops an image URL that is not http(s)', async () => {
    const id = freshId();
    const seo = seoFor(id);
    seo.image.url = 'javascript:alert(1)';
    const { html } = await rewritten(`/prints/${id}`, seo);
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('og:image');
    expect(metaContent(html, 'name', 'twitter:card')).toBe('summary');
  });

  it('keeps the canonical URL on SITE_ORIGIN even when the API names another host', async () => {
    const id = freshId();
    const seo = {
      ...seoFor(id),
      canonicalUrl: `https://staging.example.test/prints/${id}`,
    };
    const { html } = await rewritten(`/prints/${id}`, seo);
    expect(metaContent(html, 'property', 'og:url')).toBe(
      `${SITE}/prints/${id}`
    );
    expect(html).toContain(
      `<link rel="canonical" href="${SITE}/prints/${id}">`
    );
    expect(warn).toHaveBeenCalled();

    const id2 = freshId();
    mockFetch({ api: json(seoFor(id2)) });
    const res = await run(`/prints/${id2}`, {
      ...(env as Env),
      SITE_ORIGIN: 'https://example.test',
    });
    const other = await res.text();
    expect(metaContent(other, 'property', 'og:url')).toBe(
      `https://example.test/prints/${id2}`
    );
  });

  it('removes the shell noindex so the page can be indexed', async () => {
    const id = freshId();
    expect(shell).toContain('<meta name="robots" content="noindex">');
    const { html } = await rewritten(`/prints/${id}`, seoFor(id));
    expect(html).not.toContain('noindex');
    expect(html).not.toContain('name="googlebot"');
  });

  it('removes the home page Markdown twin link the shell inherits', async () => {
    const id = freshId();
    expect(shell).toContain('type="text/markdown"');
    const { html } = await rewritten(`/prints/${id}`, seoFor(id));
    expect(html).not.toContain('type="text/markdown"');
  });

  it('replaces tags already in the page instead of adding a second copy', async () => {
    // index.prod.html carries home-page og/twitter/canonical tags and the shell script strips
    // them today; make sure a shell that still has them ends up with one of each.
    const id = freshId();
    const withTags = shell.replace(
      '</head>',
      '<meta property="og:title" content="Home"><meta property="og:type" content="website">' +
        '<meta property="og:url" content="https://www.3dprintlog.com/"><meta property="og:image" content="https://www.3dprintlog.com/logo.svg">' +
        '<meta property="og:image:secure_url" content="https://www.3dprintlog.com/logo.svg">' +
        '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:text:title" content="Home">' +
        '<link rel="canonical" href="https://www.3dprintlog.com/"><script type="application/ld+json">{"@type":"WebSite"}</script>' +
        '<meta name="description" content="Second description"></head>'
    );
    const { html } = await rewritten(
      `/prints/${id}`,
      seoFor(id),
      () => new Response(withTags, { headers: ORIGIN_HEADERS })
    );
    for (const property of [
      'og:title',
      'og:type',
      'og:url',
      'og:image',
      'og:description',
    ]) {
      expect(count(html, new RegExp(`property="${property}"`))).toBe(1);
    }
    expect(html).not.toContain('og:image:secure_url');
    expect(html).not.toContain('twitter:text:title');
    expect(count(html, /name="twitter:card"/)).toBe(1);
    expect(count(html, /name="description"/)).toBe(1);
    expect(count(html, /rel="canonical"/)).toBe(1);
    expect(count(html, /application\/ld\+json/)).toBe(1);
    expect(html).not.toContain('"@type":"WebSite"}</script>');
    expect(metaContent(html, 'property', 'og:title')).toBe(
      'Benchy | 3D Print Log'
    );
  });

  it('keeps the rest of the head and the app scripts', async () => {
    const id = freshId();
    const { html } = await rewritten(`/prints/${id}`, seoFor(id));
    expect(html).toContain('<meta name="theme-color" content="#3F50B5">');
    expect(html).toContain('<base href="/">');
    expect(html).toMatch(
      /<script src="main-[A-Z0-9]+\.js" type="module"><\/script>/
    );
    expect(html).toContain("gtag('config', 'G-4TEMNSY6QX')");
  });

  it('adds one JSON-LD script chosen by type', async () => {
    const id = freshId();
    const print = await rewritten(`/prints/${id}`, seoFor(id));
    expect(count(print.html, /application\/ld\+json/)).toBe(1);
    expect(jsonLd(print.html)['@type']).toBe('CreativeWork');
    const project = await rewritten(`/projects/${freshGuid()}`, PROJECT_SEO);
    expect(jsonLd(project.html)['@type']).toBe('CollectionPage');
    const profile = await rewritten(`/users/${freshId()}`, PROFILE_SEO);
    expect(jsonLd(profile.html)['@type']).toBe('ProfilePage');
  });

  it('keeps a hostile title inside the JSON-LD script', async () => {
    const id = freshId();
    const seo = { ...seoFor(id), title: '</script><script>alert(1)</script>' };
    const { html } = await rewritten(`/prints/${id}`, seo);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(jsonLd(html).name).toBe('</script><script>alert(1)</script>');
  });

  it('escapes hostile text in the head and the summary', async () => {
    const id = freshId();
    const evil = '"><img src=x onerror=alert(1)><!--';
    const seo = {
      ...seoFor(id),
      title: `${evil} | 3D Print Log`,
      description: evil,
      facts: [{ label: evil, value: '<b>bold</b>' }],
      author: { name: evil, url: 'https://www.3dprintlog.com/users/7' },
    };
    seo.image.alt = evil;
    const { html } = await rewritten(`/prints/${id}`, seo);
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<b>bold</b>');
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(metaContent(html, 'property', 'og:description')).toBe(
      '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;&lt;!--'
    );
    expect(html).toContain(
      '<title>&quot;&gt;&lt;img src=x onerror=alert(1)&gt;&lt;!-- | 3D Print Log</title>'
    );
  });

  it('puts a readable summary after the loading skeleton inside <app-root>', async () => {
    const id = freshId();
    const { html } = await rewritten(`/prints/${id}`, seoFor(id));
    const appRoot = /<app-root>([\s\S]*?)<\/app-root>/.exec(html)?.[1] ?? '';
    const skeletonAt = appRoot.indexOf('class="app-loading-shell"');
    const summaryAt = appRoot.indexOf('class="app-seo-summary"');
    expect(skeletonAt).toBeGreaterThanOrEqual(0);
    expect(summaryAt).toBeGreaterThan(skeletonAt);
    expect(appRoot).toContain('<h1>Benchy</h1>');
    expect(appRoot).toContain('<dt>Printer</dt><dd>Prusa MK4</dd>');
    expect(appRoot).toContain('width="1200" height="750"');
    expect(appRoot).toContain(
      '<a href="https://www.3dprintlog.com/users/7">Ada Maker</a>'
    );
  });

  it('keeps the origin headers, drops the length and validators, and caches no longer than the origin', async () => {
    const id = freshId();
    const { res } = await rewritten(`/prints/${id}`, seoFor(id));
    expect(res.headers.get('content-type')).toBe('text/html');
    expect(res.headers.get('cache-control')).toBe(
      'public, must-revalidate, max-age=30'
    );
    expect(res.headers.get('strict-transport-security')).toBe(
      'max-age=31536000; includeSubDomains; preload'
    );
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy-report-only')).toBe(
      ORIGIN_HEADERS['content-security-policy-report-only']
    );
    expect(res.headers.get('content-length')).toBeNull();
    expect(res.headers.get('etag')).toBeNull();
    expect(res.headers.get('last-modified')).toBeNull();
    expect(res.headers.get('x-seo-worker')).toBe('rewritten');
  });

  it('keeps no-cache from the origin', async () => {
    const id = freshId();
    const { res } = await rewritten(
      `/prints/${id}`,
      seoFor(id),
      () =>
        new Response(shell, {
          headers: { ...ORIGIN_HEADERS, 'cache-control': 'no-cache' },
        })
    );
    expect(res.headers.get('cache-control')).toBe('no-cache');
  });

  it('caps a missing or longer origin lifetime at the /seo max-age', async () => {
    const id = freshId();
    const headers: Record<string, string> = { ...ORIGIN_HEADERS };
    delete headers['cache-control'];
    const { res } = await rewritten(
      `/prints/${id}`,
      seoFor(id),
      () => new Response(shell, { headers })
    );
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');

    const id2 = freshId();
    const long = await rewritten(
      `/prints/${id2}`,
      seoFor(id2),
      () =>
        new Response(shell, {
          headers: {
            ...ORIGIN_HEADERS,
            'cache-control': 'public, max-age=86400',
          },
        })
    );
    expect(long.res.headers.get('cache-control')).toBe('public, max-age=300');
  });
});

describe('a page that is not public', () => {
  it('returns the shell with 404 and noindex', async () => {
    // The body SeoController's NotFound() sends ([ApiController] problem details).
    const notFound = {
      type: 'https://tools.ietf.org/html/rfc9110#section-15.5.5',
      title: 'Not Found',
      status: 404,
      traceId: '00-abc-def-00',
    };
    mockFetch({
      api: json(notFound, {
        status: 404,
        headers: { 'content-type': 'application/problem+json; charset=utf-8' },
      }),
    });
    const res = await run(`/prints/${freshId()}`);
    const html = await res.text();
    expect(res.status).toBe(404);
    expect(count(html, /<meta name="robots" content="noindex">/)).toBe(1);
    // The SPA still boots, so an owner viewing their own private print still sees it.
    expect(html).toMatch(
      /<script src="main-[A-Z0-9]+\.js" type="module"><\/script>/
    );
    expect(html).toContain('class="app-loading-shell"');
    expect(html).not.toContain('og:title');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('content-length')).toBeNull();
    expect(res.headers.get('etag')).toBeNull();
    expect(res.headers.get('x-seo-worker')).toBe('not-public');
  });

  it('adds noindex when the shell has none', async () => {
    const plain = shell
      .replace(/<meta name="robots"[^>]*>/, '')
      .replace(/<meta name="googlebot"[^>]*>/, '');
    mockFetch({
      api: new Response(null, { status: 404 }),
      origin: () => new Response(plain, { headers: ORIGIN_HEADERS }),
    });
    const html = await (await run(`/prints/${freshId()}`)).text();
    expect(count(html, /<meta name="robots" content="noindex">/)).toBe(1);
  });
});

describe('failing open', () => {
  it.each<[string, ApiReply]>([
    ['a 500', new Response('boom', { status: 500 })],
    ['a 429', new Response('slow down', { status: 429 })],
    ['a 403', new Response('no', { status: 403 })],
    [
      'bad JSON',
      new Response('{not json', {
        headers: { 'content-type': 'application/json' },
      }),
    ],
    [
      'HTML instead of JSON',
      new Response('<html></html>', {
        headers: { 'content-type': 'text/html' },
      }),
    ],
    ['an unexpected shape', json({ hello: 'world' })],
    ['a network error', 'throw'],
    ['a timeout', 'timeout'],
  ])('returns the shell untouched on %s', async (_name, reply) => {
    mockFetch({ api: reply });
    const res = await run(`/prints/${freshId()}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(shell);
    expect(res.headers.get('etag')).toBe('"52770391"');
    expect(res.headers.get('cache-control')).toBe(
      'public, must-revalidate, max-age=30'
    );
    expect(warn).toHaveBeenCalled();
  });

  it('treats a 404 from an API without the /seo endpoint as an error, not as "not public"', async () => {
    // What the API answered before #285 was deployed. Reading it as "not public" would
    // mark every public page 404 + noindex.
    const noRoute = {
      type: 'https://tools.ietf.org/html/rfc9110#section-15.5.5',
      title: 'Not Found',
      status: 404,
      detail:
        'No endpoint exists at this path. See https://www.3dprintlog.com/docs/api and https://api.3dprintlog.com/swagger/v1/swagger.json.',
    };
    mockFetch({
      api: json(noRoute, {
        status: 404,
        headers: { 'content-type': 'application/problem+json' },
      }),
    });
    const res = await run(`/prints/${freshId()}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(shell);
    expect(warn).toHaveBeenCalled();
  });

  it('returns the shell untouched when the Worker is misconfigured', async () => {
    const id = freshId();
    mockFetch({ api: json(seoFor(id)) });
    const res = await run(`/prints/${id}`, {
      ...(env as Env),
      SITE_ORIGIN: 'not a url',
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(shell);
    expect(warn).toHaveBeenCalled();
  });

  it.each<[string, () => Response]>([
    [
      'a JSON response',
      () =>
        new Response('{}', { headers: { 'content-type': 'application/json' } }),
    ],
    [
      'a 304',
      () => new Response(null, { status: 304, headers: { etag: '"1"' } }),
    ],
    [
      'a 500',
      () =>
        new Response('error', {
          status: 500,
          headers: { 'content-type': 'text/html' },
        }),
    ],
    [
      'a 404 page',
      () =>
        new Response('<html>404</html>', {
          status: 404,
          headers: { 'content-type': 'text/html' },
        }),
    ],
    [
      'a redirect',
      () => new Response(null, { status: 301, headers: { location: '/x' } }),
    ],
  ])('passes %s from the origin through untouched', async (_name, origin) => {
    mockFetch({ api: json(PRINT_SEO), origin });
    const expected = origin();
    const res = await run(`/prints/${freshId()}`);
    expect(res.status).toBe(expected.status);
    expect(await res.text()).toBe(await expected.text());
    expect(res.headers.get('x-seo-worker')).toBeNull();
  });
});

describe('HEAD', () => {
  it('answers a public page with 200, the origin headers and no body', async () => {
    const id = freshId();
    const mock = mockFetch({ api: json(seoFor(id)) });
    const res = await run(
      new Request(`${SITE}/prints/${id}`, { method: 'HEAD' })
    );
    expect(mock.originCalls()[0]!.method).toBe('HEAD');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('content-length')).toBeNull();
    expect(res.headers.get('etag')).toBeNull();
    expect(await res.text()).toBe('');
  });

  it('answers a page that is not public with 404', async () => {
    mockFetch({ api: new Response(null, { status: 404 }) });
    const res = await run(
      new Request(`${SITE}/prints/${freshId()}`, { method: 'HEAD' })
    );
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('');
  });

  it('passes the origin response through when /seo fails', async () => {
    mockFetch({ api: new Response('boom', { status: 500 }) });
    const res = await run(
      new Request(`${SITE}/prints/${freshId()}`, { method: 'HEAD' })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBe('"52770391"');
  });
});

function jsonLd(html: string): Record<string, unknown> {
  const match =
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  if (!match) throw new Error('no JSON-LD');
  return JSON.parse(match[1]!) as Record<string, unknown>;
}
