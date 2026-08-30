/**
 * One entry of `generated/docs-search-index.json` — a heading section, not a
 * page. Shape is fixed by `sectionsOf` in scripts/docs-emit.mjs.
 */
export interface DocSearchSection {
  readonly id: string;
  readonly path: string;
  /** Route plus the section's anchor, when its heading declares one. */
  readonly url: string;
  readonly title: string;
  /** The nav label of the page this section belongs to. */
  readonly page: string;
  readonly group: string;
  readonly text: string;
}

/** Characters of context shown around a match. */
const EXCERPT_LENGTH = 160;

/**
 * A window of `text` around the first query term that appears in it.
 *
 * The opening sentence is usually the wrong thing to show: on a 5,000-character
 * release note the words the reader searched for can be paragraphs down, and an
 * excerpt that does not contain them reads as an irrelevant result.
 */
export function excerptFor(text: string, query: string): string {
  if (!text) {
    return '';
  }
  if (text.length <= EXCERPT_LENGTH) {
    return text;
  }

  const at = firstTermIndex(text, query);
  if (at < 0) {
    return `${cut(text, 0, EXCERPT_LENGTH)}…`;
  }

  // Centre the window on the match, then pull back to a word boundary so the
  // excerpt does not open mid-word.
  const start = Math.max(0, at - Math.floor(EXCERPT_LENGTH / 3));
  const from = start === 0 ? 0 : wordBoundaryAfter(text, start);
  const body = cut(text, from, EXCERPT_LENGTH);

  return `${from > 0 ? '…' : ''}${body}${from + body.length < text.length ? '…' : ''}`;
}

/** Where the earliest query term occurs, or -1. */
function firstTermIndex(text: string, query: string): number {
  const haystack = text.toLowerCase();
  let earliest = -1;

  for (const term of query.toLowerCase().split(/\s+/).filter(Boolean)) {
    const at = haystack.indexOf(term);
    if (at >= 0 && (earliest < 0 || at < earliest)) {
      earliest = at;
    }
  }
  return earliest;
}

function wordBoundaryAfter(text: string, from: number): number {
  const space = text.indexOf(' ', from);
  return space < 0 || space - from > 20 ? from : space + 1;
}

function cut(text: string, from: number, length: number): string {
  return text.slice(from, from + length).trim();
}
