// Reading the per-release Markdown sources, and turning one of them into a
// GitHub Release body.
//
// `src/content/release-notes/<version>.md` is the single source of truth for
// release prose -- one file per release, written by the /release skill. This
// module reads them; nothing here should ever write one.
//
// One file per release is what makes the GitHub extraction trivial: there is no
// page to scan for section boundaries, so a release body is just "render this
// file". It also means `extract-release-notes.mjs` reads only checked-in
// sources -- the deploy workflow verifies a tag's notes BEFORE `npm ci` and
// before any generation has run, so it can never depend on a generated artifact.

import fs from 'node:fs';
import path from 'node:path';

import { parseFrontmatter } from './docs-frontmatter.mjs';
import { renderMarkdown } from './docs-markdown.mjs';
import { RELEASE_NOTES_DIR } from './docs-paths.mjs';

export const SITE_ORIGIN = 'https://www.3dprintlog.com';

/**
 * A version as it may appear in a filename or an `id`. Two-part versions exist
 * only as the single legacy `1.6`; new releases are always three-part.
 */
const VERSION = /^\d+\.\d+(?:\.\d+)?$/;

/**
 * `1.6` and `1.6.0` are the same release. Normalizing means a `v1.6` tag and a
 * `v1.6.0` tag both find it.
 */
export function normalizeVersion(raw) {
  const trimmed = String(raw).trim().replace(/^v/i, '');
  const parts = trimmed.split('.');
  while (parts.length < 3) parts.push('0');
  return parts.join('.');
}

/** Newest first. Numeric per segment, so 1.43.10 sorts above 1.43.9. */
export function compareVersionsDesc(a, b) {
  const left = normalizeVersion(a).split('.').map(Number);
  const right = normalizeVersion(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return right[i] - left[i];
  }
  return 0;
}

/**
 * The anchor for a release. Derived from the frontmatter `version`, never from
 * the heading text: a Markdown slugger would mangle `1.38.0` into `1-38-0` and
 * silently re-mint all 97 published ids under its own algorithm.
 */
export function anchorFor(version) {
  return `v${version}`;
}

/** `1.49.1` + `Push Notification Fixes` -> `1.49.1 - Push Notification Fixes`. */
export function headingFor(version, title) {
  return title ? `${version} - ${title}` : version;
}

/**
 * @param {string} [dir]
 * @returns {{ version: string, date: string, title: string, highlights: string[],
 *   anchor: string, body: string, sourceFile: string }[]} newest release first
 */
export function readReleaseSources(dir = RELEASE_NOTES_DIR) {
  if (!fs.existsSync(dir)) return [];

  const names = fs.readdirSync(dir).filter((name) => name.endsWith('.md'));

  const sources = names.map((name) => {
    const raw = fs.readFileSync(path.join(dir, name), 'utf8');
    let parsed;
    try {
      parsed = parseFrontmatter(raw);
    } catch (error) {
      throw new Error(`${name}: ${error.message}`);
    }

    // The filename is the version. Letting them drift would put a release under
    // an anchor nobody can predict from the file they edited.
    const expected = name.replace(/\.md$/, '');
    if (String(parsed.data.version) !== expected) {
      throw new Error(
        `${name} declares version "${parsed.data.version}" but must match its filename ("${expected}").`
      );
    }

    return {
      version: expected,
      date: parsed.data.date === undefined ? '' : String(parsed.data.date),
      title: parsed.data.title === undefined ? '' : String(parsed.data.title),
      highlights: parsed.data.highlights ?? [],
      anchor: anchorFor(expected),
      body: parsed.body,
      sourceFile: name,
    };
  });

  return sources.sort((a, b) => compareVersionsDesc(a.version, b.version));
}

/** True for a string this module is willing to treat as a version. */
export function isVersion(text) {
  return VERSION.test(String(text));
}

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
 * Convert one release's rendered HTML to Markdown suitable for a GitHub Release
 * body. Handles only the shapes the release notes actually use.
 */
export function htmlToMarkdown(html) {
  let s = html;

  // Drop structural and media-only elements. Their inner block content (if any)
  // is still picked up below, since blocks are matched wherever they appear.
  s = s.replace(/<\/?(?:div|section|hr|img|mat-[a-z-]+)\b[^>]*>/gi, '');
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
 * The GitHub Release body for one version (with or without a leading `v`).
 *
 * Throws when the version has no file -- a silent empty release body is worse
 * than a failed deploy, and the deploy runs this as its first step so a missing
 * file fails in seconds rather than after a full build.
 *
 * @param {string} version
 * @param {string} [dir]
 */
export function extractReleaseNotes(version, dir = RELEASE_NOTES_DIR) {
  const wanted = normalizeVersion(version);
  const release = readReleaseSources(dir).find(
    (source) => normalizeVersion(source.version) === wanted
  );

  if (!release) {
    throw new Error(
      `no release notes for ${wanted}: add src/content/release-notes/${wanted}.md`
    );
  }

  return {
    version: release.version,
    title: headingFor(release.version, release.title),
    markdown: htmlToMarkdown(renderMarkdown(release.body)),
  };
}
