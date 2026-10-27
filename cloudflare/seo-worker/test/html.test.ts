import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  jsonLdFor,
  jsonLdScript,
  safeHttpUrl,
  summaryHtml,
} from '../src/html';
import { parseSeoMetadata, type SeoMetadata } from '../src/seo';
import { clone, PRINT_SEO, PROFILE_SEO, PROJECT_SEO } from './samples';

function seoOf(value: unknown): SeoMetadata {
  const seo = parseSeoMetadata(value);
  if (!seo) throw new Error('sample did not parse');
  return seo;
}

/** Parses the JSON inside a <script type="application/ld+json"> element. */
function jsonFromScript(script: string): unknown {
  const match =
    /^<script type="application\/ld\+json">([\s\S]*)<\/script>$/.exec(script);
  if (!match) throw new Error(`not a JSON-LD script: ${script}`);
  return JSON.parse(match[1]!);
}

describe('escapeHtml', () => {
  it('escapes the five characters that matter in text and attributes', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
    );
  });
});

describe('safeHttpUrl', () => {
  it.each([
    [
      'https://www.3dprintlog.com/prints/1',
      'https://www.3dprintlog.com/prints/1',
    ],
    ['http://example.com/a b', 'http://example.com/a%20b'],
    ['HTTPS://Example.com/x', 'https://example.com/x'],
  ])('keeps %s', (input, expected) => {
    expect(safeHttpUrl(input)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    ' javascript:alert(1)',
    'data:text/html,x',
    'vbscript:x',
    '//example.com/x',
    '/relative',
    'mailto:a@b.c',
    '',
    'not a url',
  ])('rejects %s', (input) => {
    expect(safeHttpUrl(input)).toBeNull();
  });
});

describe('jsonLdFor', () => {
  it('describes a print as a CreativeWork', () => {
    expect(jsonLdFor(seoOf(PRINT_SEO))).toEqual({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: 'Benchy',
      headline: 'Benchy',
      description: 'Printed in two colors with a 0.4 nozzle.',
      url: 'https://www.3dprintlog.com/prints/123',
      mainEntityOfPage: 'https://www.3dprintlog.com/prints/123',
      image: {
        '@type': 'ImageObject',
        url: 'https://api.3dprintlog.com/api/Prints/123/social-image?v=3f2a9c1b7d4e',
        width: 1200,
        height: 750,
        caption: 'Benchy',
      },
      author: {
        '@type': 'Person',
        name: 'Ada Maker',
        url: 'https://www.3dprintlog.com/users/7',
      },
      datePublished: '2026-10-03T14:05:00+00:00',
      dateModified: '2026-10-20T09:12:00+00:00',
      isPartOf: {
        '@type': 'WebSite',
        name: '3D Print Log',
        url: 'https://www.3dprintlog.com/',
      },
    });
  });

  it('describes a project as a CollectionPage', () => {
    const ld = jsonLdFor(seoOf(PROJECT_SEO)) as Record<string, unknown>;
    expect(ld['@type']).toBe('CollectionPage');
    expect(ld.name).toBe('Desk organizer');
    expect(ld.url).toBe(PROJECT_SEO.canonicalUrl);
    expect(ld.author).toEqual({
      '@type': 'Person',
      name: 'Ada Maker',
      url: 'https://www.3dprintlog.com/users/7',
    });
  });

  it('describes a profile as a ProfilePage about a Person', () => {
    expect(jsonLdFor(seoOf(PROFILE_SEO))).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: 'Ada Maker Profile',
      description: "View Ada Maker's 3D prints and projects on 3DPrintLog.com",
      url: 'https://www.3dprintlog.com/users/7',
      dateCreated: '2025-05-01T00:00:00+00:00',
      mainEntity: {
        '@type': 'Person',
        name: 'Ada Maker',
        url: 'https://www.3dprintlog.com/users/7',
        image: 'https://lh3.googleusercontent.com/a/abc123',
      },
      isPartOf: {
        '@type': 'WebSite',
        name: '3D Print Log',
        url: 'https://www.3dprintlog.com/',
      },
    });
  });

  it('leaves out what it does not know', () => {
    const value = {
      ...clone(PRINT_SEO),
      image: null,
      author: null,
      publishedAt: null,
      updatedAt: null,
    };
    const ld = jsonLdFor(seoOf(value)) as Record<string, unknown>;
    expect(ld).not.toHaveProperty('image');
    expect(ld).not.toHaveProperty('author');
    expect(ld).not.toHaveProperty('datePublished');
    expect(ld).not.toHaveProperty('dateModified');
  });

  it('omits an author URL the profile does not make public', () => {
    const value = clone(PRINT_SEO) as {
      author: { name: string; url: string | null };
    };
    value.author.url = null;
    expect((jsonLdFor(seoOf(value)) as Record<string, unknown>).author).toEqual(
      { '@type': 'Person', name: 'Ada Maker' }
    );
  });

  it('names a profile Person after the page when it has no author', () => {
    const ld = jsonLdFor(seoOf({ ...clone(PROFILE_SEO), author: null })) as {
      mainEntity: Record<string, unknown>;
    };
    expect(ld.mainEntity.name).toBe('Ada Maker');
  });
});

describe('jsonLdScript', () => {
  it('cannot be closed early by a hostile title', () => {
    const value = {
      ...clone(PRINT_SEO),
      title: '</script><script>alert(1)</script> | 3D Print Log',
    };
    const script = jsonLdScript(seoOf(value));
    // The only </script> is the real one at the end.
    expect(script.indexOf('</script')).toBe(script.length - '</script>'.length);
    expect(script.toLowerCase()).not.toContain('<script>alert');
    expect(script).not.toContain('<!--');
    expect((jsonFromScript(script) as { name: string }).name).toBe(
      '</script><script>alert(1)</script>'
    );
  });

  it('escapes comment openers and line separators', () => {
    const value = {
      ...clone(PRINT_SEO),
      description: '<!-- x --> \u2028 \u2029 &',
    };
    const script = jsonLdScript(seoOf(value));
    expect(script).not.toContain('<!--');
    expect(script).not.toContain('\u2028');
    expect(script).not.toContain('\u2029');
    expect(
      (jsonFromScript(script) as { description: string }).description
    ).toBe('<!-- x --> \u2028 \u2029 &');
  });
});

describe('summaryHtml', () => {
  it('shows the title, description, image, facts and author', () => {
    const html = summaryHtml(seoOf(PRINT_SEO));
    expect(html).toContain('<h1>Benchy</h1>');
    expect(html).toContain('<p>Printed in two colors with a 0.4 nozzle.</p>');
    expect(html).toContain(
      '<img src="https://api.3dprintlog.com/api/Prints/123/social-image?v=3f2a9c1b7d4e" alt="Benchy" width="1200" height="750"'
    );
    expect(html).toContain('<dt>Printer</dt><dd>Prusa MK4</dd>');
    expect(html).toContain('<dt>Status</dt><dd>Success</dd>');
    expect(html).toContain(
      '<a href="https://www.3dprintlog.com/users/7">Ada Maker</a>'
    );
  });

  it('escapes hostile text everywhere it appears', () => {
    const evil = '<img src=x onerror=alert(1)>"\'&';
    const value = {
      ...clone(PRINT_SEO),
      title: `${evil} | 3D Print Log`,
      description: evil,
      image: {
        url: 'https://x.example/a.png?"><script>',
        width: 10,
        height: 10,
        alt: evil,
      },
      author: { name: evil, url: 'https://x.example/u?"onmouseover="alert(1)' },
      facts: [{ label: evil, value: evil }],
    };
    const html = summaryHtml(seoOf(value));
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).not.toMatch(/"\s*onmouseover=/);
    expect(html).toContain(
      '&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;'
    );
  });

  it('leaves out the image, facts and author when there are none', () => {
    const value = { ...clone(PRINT_SEO), image: null, author: null, facts: [] };
    const html = summaryHtml(seoOf(value));
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<dl');
    expect(html).not.toContain('<a ');
  });

  it('shows the author without a link when their profile is not public', () => {
    const value = clone(PRINT_SEO) as {
      author: { name: string; url: string | null };
    };
    value.author.url = null;
    const html = summaryHtml(seoOf(value));
    expect(html).toContain('Ada Maker');
    expect(html).not.toContain('<a ');
  });

  it('gives an image without a known size no width or height', () => {
    const html = summaryHtml(seoOf(PROFILE_SEO));
    expect(html).toMatch(
      /<img src="https:\/\/lh3\.googleusercontent\.com\/a\/abc123" alt="Ada Maker&#39;s profile picture"/
    );
    expect(html).not.toContain('width=');
  });

  it('does not repeat the author line on a profile', () => {
    const html = summaryHtml(seoOf(PROFILE_SEO));
    expect(html).not.toContain('By ');
  });
});
