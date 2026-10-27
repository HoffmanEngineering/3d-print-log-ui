import type { SeoMetadata } from './seo';

const SITE_NAME = '3D Print Log';

/** Escapes text for use in HTML text or a double- or single-quoted attribute value. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The URL normalized, if it is an absolute http or https URL; otherwise null. */
export function safeHttpUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  return url.protocol === 'https:' || url.protocol === 'http:'
    ? url.href
    : null;
}

/** The title without the ` | 3D Print Log` suffix every /seo title carries, for headings. */
export function displayTitle(seo: SeoMetadata): string {
  const stripped = seo.title.replace(/\s*\|\s*3D Print Log\s*$/i, '').trim();
  return stripped || seo.title;
}

function siteRoot(seo: SeoMetadata): string {
  return `${new URL(seo.canonicalUrl).origin}/`;
}

function person(name: string, url: string | null): Record<string, unknown> {
  return { '@type': 'Person', name, ...(url ? { url } : {}) };
}

/**
 * The schema.org description of the page.
 *
 * - print: `CreativeWork`. A logged print is a made thing someone documents and publishes;
 *   nothing narrower fits (`Product` would imply an offer, `HowTo` steps it does not have).
 * - project: `CollectionPage`, a page that gathers several prints under one heading.
 * - profile: `ProfilePage` whose `mainEntity` is the `Person`, which is what Google
 *   documents for profile pages.
 */
export function jsonLdFor(seo: SeoMetadata): Record<string, unknown> {
  const name = displayTitle(seo);
  const description = seo.description ? { description: seo.description } : {};
  const isPartOf = { '@type': 'WebSite', name: SITE_NAME, url: siteRoot(seo) };

  if (seo.type === 'profile') {
    const personName = seo.author?.name ?? name.replace(/\s+Profile$/i, '');
    return {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name,
      ...description,
      url: seo.canonicalUrl,
      ...(seo.publishedAt ? { dateCreated: seo.publishedAt } : {}),
      ...(seo.updatedAt ? { dateModified: seo.updatedAt } : {}),
      mainEntity: {
        ...person(personName, seo.canonicalUrl),
        ...(seo.image ? { image: seo.image.url } : {}),
      },
      isPartOf,
    };
  }

  const image = seo.image
    ? {
        image: {
          '@type': 'ImageObject',
          url: seo.image.url,
          ...(seo.image.width ? { width: seo.image.width } : {}),
          ...(seo.image.height ? { height: seo.image.height } : {}),
          ...(seo.image.alt ? { caption: seo.image.alt } : {}),
        },
      }
    : {};
  return {
    '@context': 'https://schema.org',
    '@type': seo.type === 'print' ? 'CreativeWork' : 'CollectionPage',
    name,
    headline: name,
    ...description,
    url: seo.canonicalUrl,
    // A print is the main thing on its page; a CollectionPage is the page itself.
    ...(seo.type === 'print' ? { mainEntityOfPage: seo.canonicalUrl } : {}),
    ...image,
    ...(seo.author ? { author: person(seo.author.name, seo.author.url) } : {}),
    ...(seo.publishedAt ? { datePublished: seo.publishedAt } : {}),
    ...(seo.updatedAt ? { dateModified: seo.updatedAt } : {}),
    isPartOf,
  };
}

/**
 * The JSON-LD as a script element. `<`, `>` and `&` are written as \u escapes, so no text
 * from the API can close the element (`</script>`) or open a comment (`<!--`); U+2028 and
 * U+2029 are escaped for older parsers that treat them as line ends.
 */
export function jsonLdScript(seo: SeoMetadata): string {
  const json = JSON.stringify(jsonLdFor(seo))
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `<script type="application/ld+json">${json}</script>`;
}

/**
 * A short, plain HTML version of the page for crawlers that do not run JavaScript. It goes
 * inside <app-root>, after the loading skeleton, and Angular replaces both on bootstrap.
 */
export function summaryHtml(seo: SeoMetadata): string {
  const title = displayTitle(seo);
  const parts: string[] = [`<h1>${escapeHtml(title)}</h1>`];

  if (seo.author && seo.type !== 'profile') {
    const name = escapeHtml(seo.author.name);
    parts.push(
      seo.author.url
        ? `<p>By <a href="${escapeHtml(seo.author.url)}">${name}</a></p>`
        : `<p>By ${name}</p>`
    );
  }
  if (seo.description) parts.push(`<p>${escapeHtml(seo.description)}</p>`);
  if (seo.image) {
    const { url, width, height, alt } = seo.image;
    const dimensions =
      width && height ? ` width="${width}" height="${height}"` : '';
    parts.push(
      `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt ?? title)}"${dimensions} loading="lazy" decoding="async">`
    );
  }
  if (seo.facts.length > 0) {
    const rows = seo.facts
      .map(
        (f) => `<dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(f.value)}</dd>`
      )
      .join('');
    parts.push(`<dl>${rows}</dl>`);
  }
  return `<article class="app-seo-summary">${parts.join('')}</article>`;
}

/** The <head> tags for the page, in the order they are written. */
export function headTags(seo: SeoMetadata): string {
  const tags: string[] = [];
  const meta = (
    attr: 'name' | 'property',
    key: string,
    value: string
  ): void => {
    tags.push(`<meta ${attr}="${key}" content="${escapeHtml(value)}">`);
  };

  meta('name', 'description', seo.description);
  tags.push(`<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}">`);
  meta('property', 'og:site_name', SITE_NAME);
  meta('property', 'og:type', seo.type === 'profile' ? 'profile' : 'article');
  meta('property', 'og:title', seo.title);
  meta('property', 'og:description', seo.description);
  meta('property', 'og:url', seo.canonicalUrl);
  if (seo.image) {
    meta('property', 'og:image', seo.image.url);
    if (seo.image.width && seo.image.height) {
      meta('property', 'og:image:width', String(seo.image.width));
      meta('property', 'og:image:height', String(seo.image.height));
    }
    if (seo.image.alt) meta('property', 'og:image:alt', seo.image.alt);
  }
  meta('name', 'twitter:card', seo.image ? 'summary_large_image' : 'summary');
  meta('name', 'twitter:title', seo.title);
  meta('name', 'twitter:description', seo.description);
  if (seo.image) {
    meta('name', 'twitter:image', seo.image.url);
    if (seo.image.alt) meta('name', 'twitter:image:alt', seo.image.alt);
  }
  tags.push(jsonLdScript(seo));
  return tags.join('');
}
