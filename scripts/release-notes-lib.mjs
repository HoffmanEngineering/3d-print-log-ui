// Pure, side-effect-free helpers for turning the in-app release-notes component
// into GitHub Release bodies. Safe to import in unit tests.
//
// The component at
//   src/app/documentation/docs/docs-release-notes/docs-release-notes.component.html
// is the single source of truth for release prose -- it is hand-written by the
// /release skill. This module reads it; nothing here should ever write it.

export const SITE_ORIGIN = 'https://www.3dprintlog.com';

// `lt` and `gt` are deliberately absent. GitHub renders raw HTML inside
// Markdown, so prose that escaped a tag on purpose ("supports &lt;button&gt;")
// must stay escaped or the tag vanishes from the release body.
const NAMED_ENTITIES = {
  amp: '&',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(text) {
  return text.replace(
    /&(?:#x([0-9a-fA-F]+)|#(\d+)|([a-zA-Z]+));/g,
    (match, hex, dec, name) => {
      if (hex || dec) {
        const code = Number.parseInt(hex ?? dec, hex ? 16 : 10);
        // Same reasoning as above: a numeric < or > stays escaped.
        if (!Number.isFinite(code) || code === 0x3c || code === 0x3e) {
          return match;
        }
        return String.fromCodePoint(code);
      }
      return NAMED_ENTITIES[name.toLowerCase()] ?? match;
    }
  );
}

function collapse(text) {
  return text.replace(/\s+/g, ' ').trim();
}

// A version id may be two-part (the single legacy `v1.6`) or three-part.
// Normalizing means a `v1.6` tag and a `v1.6.0` tag both find the section.
function normalizeVersion(raw) {
  const trimmed = String(raw).trim().replace(/^v/i, '');
  const parts = trimmed.split('.');
  while (parts.length < 3) parts.push('0');
  return parts.join('.');
}

// Lists nest, so the non-greedy `<li>...</li>` and `<ul>...</ul>` matches that
// work everywhere else in this file would close on the inner element. These two
// helpers scan with a depth counter instead.

function extractFirstList(html) {
  const open = /<ul\b[^>]*>/i.exec(html);
  if (!open) return null;

  const scan = /<(\/?)ul\b[^>]*>/gi;
  scan.lastIndex = open.index;
  let depth = 0;
  let match;

  while ((match = scan.exec(html)) !== null) {
    if (match[1] === '') {
      depth++;
      continue;
    }
    if (--depth === 0) {
      return {
        start: open.index,
        end: scan.lastIndex,
        inner: html.slice(open.index + open[0].length, match.index),
      };
    }
  }

  // Returning null here would let the block scanner skip the outer list and
  // render only its nested fragment -- publishing partial notes silently.
  throw new Error(
    'unbalanced <ul> in release notes: a list is opened but never closed'
  );
}

function splitListItems(html) {
  const scan = /<(\/?)li\b[^>]*>/gi;
  const items = [];
  let depth = 0;
  let start = -1;
  let match;

  while ((match = scan.exec(html)) !== null) {
    if (match[1] === '') {
      if (depth === 0) start = scan.lastIndex;
      depth++;
      continue;
    }
    if (--depth === 0 && start >= 0) {
      items.push(html.slice(start, match.index));
      start = -1;
    }
  }
  return items;
}

function renderList(inner, depth) {
  const pad = '  '.repeat(depth);
  const lines = [];

  for (const item of splitListItems(inner)) {
    // An item can hold more than one child list; take them all, or the leftovers
    // land in the parent's text as raw HTML.
    const children = [];
    let rest = item;

    for (
      let list = extractFirstList(rest);
      list;
      list = extractFirstList(rest)
    ) {
      children.push(list.inner);
      rest = rest.slice(0, list.start) + rest.slice(list.end);
    }

    const text = collapse(rest);
    if (text) lines.push(`${pad}- ${text}`);

    for (const child of children) {
      const sub = renderList(child, depth + 1);
      if (sub) lines.push(sub);
    }
  }
  return lines.join('\n');
}

/**
 * Split the component HTML into one entry per release.
 * Only <h3> headings are releases; the page's <h2> title is not.
 */
export function parseSections(html) {
  const heading =
    /<h3\b[^>]*\bid="v?([0-9][0-9.]*)"[^>]*>([\s\S]*?)<\/h3\s*>/gi;
  const found = [];
  let match;

  while ((match = heading.exec(html)) !== null) {
    found.push({
      version: normalizeVersion(match[1]),
      title: collapse(decodeEntities(match[2].replace(/<[^>]*>/g, ''))),
      // Where this heading opens, and where its body starts. Keeping both means
      // the next section's boundary is already known -- searching back for the
      // literal '<h3' would miss an uppercase <H3> that the matcher accepted.
      openIndex: match.index,
      start: heading.lastIndex,
    });
  }

  return found.map((section, i) => ({
    version: section.version,
    title: section.title,
    bodyHtml: html.slice(
      section.start,
      i + 1 < found.length ? found[i + 1].openIndex : html.length
    ),
  }));
}

/**
 * Convert a release section's HTML to Markdown suitable for a GitHub Release
 * body. Handles only the shapes the component actually uses.
 */
export function htmlToMarkdown(html) {
  let s = html;

  // Drop structural and media-only elements. Their inner block content (if any)
  // is still picked up below, since blocks are matched wherever they appear.
  s = s.replace(/<\/?(?:div|hr|img|mat-[a-z-]+)\b[^>]*>/gi, '');
  s = s.replace(/<br\s*\/?>/gi, ' ');

  // Inline formatting, before blocks so it survives into the block text.
  // Internal links are Angular routerLinks, which are relative and therefore
  // dead once the body is rendered off-site on github.com.
  // Two spellings in the history: the plain attribute, and the older
  // property-binding form `[routerLink]="['/prints']"`.
  s = s.replace(
    /<a\b[^>]*\[routerLink\]="\[\s*'([^']*)'\s*\][^>]*>([\s\S]*?)<\/a\s*>/gi,
    (_, route, text) => `[${collapse(text)}](${SITE_ORIGIN}${route.trim()})`
  );
  s = s.replace(
    /<a\b[^>]*\brouterLink="([^"]*)"[^>]*>([\s\S]*?)<\/a\s*>/gi,
    (_, route, text) => `[${collapse(text)}](${SITE_ORIGIN}${route.trim()})`
  );
  s = s.replace(
    /<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a\s*>/gi,
    (_, href, text) => `[${collapse(text)}](${href.trim()})`
  );
  s = s.replace(/<strong\b[^>]*>([\s\S]*?)<\/strong\s*>/gi, '**$1**');
  s = s.replace(/<em\b[^>]*>([\s\S]*?)<\/em\s*>/gi, '_$1_');
  s = s.replace(/<code\b[^>]*>([\s\S]*?)<\/code\s*>/gi, '`$1`');

  // Blocks, in document order.
  const block = /<(p|h4|ul)\b[^>]*>/gi;
  const out = [];
  let match;

  while ((match = block.exec(s)) !== null) {
    const tag = match[1].toLowerCase();

    if (tag === 'ul') {
      const list = extractFirstList(s.slice(match.index));
      if (!list) continue;
      const rendered = renderList(list.inner, 0);
      if (rendered) out.push(rendered);
      block.lastIndex = match.index + list.end;
      continue;
    }

    const rest = s.slice(block.lastIndex);
    const close = new RegExp(`</${tag}\\s*>`, 'i').exec(rest);
    const text = collapse(close ? rest.slice(0, close.index) : rest);

    if (text) out.push(tag === 'h4' ? `### ${text}` : text);
    if (close) block.lastIndex += close.index + close[0].length;
  }

  return decodeEntities(out.join('\n\n')).trim();
}

/**
 * Look up one release by version (with or without a leading `v`).
 * Throws when the version has no section -- a silent empty release body is
 * worse than a failed deploy.
 */
export function extractReleaseNotes(html, version) {
  const wanted = normalizeVersion(version);
  const section = parseSections(html).find((s) => s.version === wanted);

  if (!section) {
    throw new Error(
      `no release notes section for ${wanted}: add an <h3 id="v${wanted}"> entry to the release notes component`
    );
  }

  return {
    version: section.version,
    title: section.title,
    markdown: htmlToMarkdown(section.bodyHtml),
  };
}
