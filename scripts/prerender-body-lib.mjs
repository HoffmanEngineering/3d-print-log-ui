// Checks that a prerendered docs page carries its body, not just its <head>
// (#230). The docs layout used to serialize with an empty child <router-outlet>,
// so every /docs page shipped title, description and JSON-LD around no content.
//
// The expected text comes from the page's Markdown twin, which docs-twins.mjs
// converts from the page's own rendered template. It is the same prose, so a
// phrase taken from it must appear in the routed page's HTML.

/** How much of the chosen paragraph is required, in non-space characters. */
const PHRASE_LENGTH = 60;

/** A paragraph shorter than this (a date, a badge line) is not distinctive. */
const MIN_PARAGRAPH_WORDS = 8;

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: String.fromCharCode(0xa0),
};

/** Decodes HTML character references in one pass, so `&amp;lt;` stays `&lt;`. */
export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, ref) => {
    if (ref[0] === '#') {
      const code =
        ref[1] === 'x' || ref[1] === 'X'
          ? parseInt(ref.slice(2), 16)
          : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[ref.toLowerCase()] ?? match;
  });
}

/**
 * The text of an HTML fragment, without its tags.
 *
 * A scan rather than a tag-stripping regex: this is never used to sanitize
 * anything, but a scan has no edge cases worth arguing about either.
 */
export function textOf(html) {
  let out = '';
  let inTag = false;
  for (const ch of html) {
    if (inTag) {
      if (ch === '>') inTag = false;
    } else if (ch === '<') {
      inTag = true;
    } else {
      out += ch;
    }
  }
  return decodeEntities(out);
}

/**
 * Removes all whitespace. Inline tags and block boundaries put spaces in
 * different places in HTML and in Markdown, so comparing without any is the
 * one normalization that is fair to both and still demands the exact words.
 */
export function squash(text) {
  return text.replace(/\s+/g, '');
}

/** Markdown inline syntax -> the text a reader sees. */
export function plainInline(markdown) {
  const withoutLinks = markdown.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');
  let out = '';
  for (let i = 0; i < withoutLinks.length; i++) {
    const ch = withoutLinks[i];
    if (ch === '\\' && i + 1 < withoutLinks.length) {
      out += withoutLinks[++i];
    } else if (ch !== '*' && ch !== '_' && ch !== '`') {
      out += ch;
    }
  }
  return out;
}

/**
 * The first ordinary prose paragraph of a Markdown twin, as plain text, or null.
 *
 * Skips the twin's preamble (H1, description quote, "HTML version:" line, which
 * docs-twins.mjs adds and the page does not render) and anything that is not a
 * paragraph: headings, images, lists, quotes, tables, code and rules.
 */
export function firstParagraph(twin) {
  const blocks = twin.split(/\n\s*\n/);
  for (const raw of blocks) {
    const block = raw.trim();
    if (!/^[A-Za-z]/.test(block)) continue;
    if (block.startsWith('HTML version:')) continue;
    const text = plainInline(block.replace(/\s*\n\s*/g, ' '));
    if (text.split(/\s+/).length >= MIN_PARAGRAPH_WORDS) return text;
  }
  return null;
}

/** The phrase a page's prerendered body must contain, whitespace removed. */
export function expectedPhrase(twin) {
  const paragraph = firstParagraph(twin);
  return paragraph
    ? [...squash(paragraph)].slice(0, PHRASE_LENGTH).join('')
    : null;
}

/**
 * The HTML of the routed page inside the docs layout: everything between the
 * layout's own <router-outlet> and the first layout widget after it. The
 * router inserts the page as the outlet's next sibling, so an empty outlet
 * leaves this empty.
 */
export function routedPageHtml(html) {
  const layout = html.indexOf('<app-documentation');
  if (layout < 0) return null;
  const outlet = html.indexOf('<router-outlet', layout);
  if (outlet < 0) return null;
  const end = html.indexOf('<app-doc-related', outlet);
  if (end < 0) return null;
  return html.slice(outlet, end);
}

/** Problems with one docs page's prerendered body; empty when it is fine. */
export function docBodyProblems(html, twin) {
  const page = routedPageHtml(html);
  if (page === null) {
    return ['no docs layout <router-outlet> followed by <app-doc-related>'];
  }
  const phrase = expectedPhrase(twin);
  if (!phrase) {
    return [
      'its Markdown twin has no prose paragraph to check the body against',
    ];
  }
  if (!squash(textOf(page)).includes(phrase)) {
    return [
      `routed page body is missing text from its first paragraph ("${phrase}")`,
    ];
  }
  return [];
}
