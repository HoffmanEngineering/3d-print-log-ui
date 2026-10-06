// Markdown twins of the /docs pages (#211).
//
// Every routed docs page is also published as Markdown at its own URL plus
// `.md` (`/docs/prints` -> `/docs/prints.md`), and `/docs/llms.txt` indexes
// them. Agents read Markdown at a fraction of the tokens of the HTML page, and
// without the app chrome around it.
//
// The twin is converted from the RENDERED template, not copied from the source
// Markdown: a third of the docs are raw HTML (`<article>`, `<doc-step>`,
// `<doc-figure>`, `routerLink`, `{{ constant }}`), which means nothing to a
// Markdown reader. Converting after rendering also means a twin can never drift
// from the page: both come from the same template in the same generator run.
//
// The Angular-only parts are resolved here, before Turndown sees them:
//   * `{{ name }}` and `{{ 'literal' }}` interpolations become their values. Any
//     other expression throws, so a page that starts depending on component
//     state fails the build instead of shipping a twin with a hole in it.
//   * `routerLink`, `[routerLink]` and relative `src`/`href` become absolute
//     URLs, because a twin is often read far away from the site.
//   * `<doc-figure>` becomes its image (alt text plus URL), `<doc-video>` a
//     YouTube link, `<doc-callout>` a blockquote, `<doc-step>` a numbered
//     heading, and an inline `<mat-icon>` its ligature name in a code span.

import TurndownService from 'turndown';

import { SITE_ORIGIN } from './release-notes-lib.mjs';

/** Sidebar group headings for `/docs/llms.txt`, keyed by frontmatter `group`. */
const GROUP_HEADINGS = {
  start: 'Start here',
  features: 'Features',
  reference: 'Reference',
  integrations: 'Integrations',
  about: 'About',
};

/** The suffix every docs `title:` carries for the browser tab. */
const TITLE_SUFFIX = / \| 3D Print Log Docs$/;

const CALLOUT_LABELS = {
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
  danger: 'Important',
};

/** The URL of a page's Markdown twin. */
export function twinUrl(slug, origin = SITE_ORIGIN) {
  return `${origin}/docs/${slug}.md`;
}

/** The published path of a page's twin, relative to the site root. */
export function twinPath(slug) {
  return `docs/${slug}.md`;
}

/**
 * Every twin file, keyed by its path relative to the site root.
 *
 * @param {object} manifest from buildManifest
 * @param {Record<string, string>} templates slug -> rendered template (the
 *   release notes entry should carry the whole history, not just the newest)
 * @param {Record<string, {light: {src: string}}>} captures doc figure map
 * @param {{ llmsTxt?: string | null, origin?: string }} [options]
 * @returns {Map<string, string>}
 */
export function planTwins(manifest, templates, captures = {}, options = {}) {
  const origin = options.origin ?? SITE_ORIGIN;
  const files = new Map();
  const routed = manifest.pages.filter((page) => !page.dormant);

  for (const page of routed) {
    files.set(
      twinPath(page.slug),
      renderTwin(page, templates[page.slug] ?? '', {
        captures,
        origin,
        pages: routed,
      })
    );
  }

  files.set('docs/llms.txt', renderDocsLlmsTxt(routed, origin));

  // `/llms.md` is the same document as `/llms.txt` under the extension some
  // agents try first. Copied, not rewritten, so the two cannot disagree.
  if (options.llmsTxt) files.set('llms.md', options.llmsTxt);

  return files;
}

/**
 * One page's Markdown twin.
 *
 * @param {object} page a manifest page
 * @param {string} template its rendered Angular template
 * @param {{ captures?: object, origin?: string, pages?: object[] }} [context]
 * @returns {string}
 */
export function renderTwin(page, template, context = {}) {
  const origin = context.origin ?? SITE_ORIGIN;
  const pageUrl = `${origin}/docs/${page.slug}`;
  const heading = page.title.replace(TITLE_SUFFIX, '');

  const html = resolveInterpolations(
    template,
    resolveConstants(page.constants ?? {}),
    page.slug
  );
  const body = dropLeadingHeading(
    htmlToMarkdown(html, {
      captures: context.captures ?? {},
      origin,
      pageUrl,
      // The page title becomes the twin's one h1, so a body that brings its own
      // h1 (getting-started's hero) moves every heading down a level.
      headingShift: /<h1[\s>]/i.test(html) ? 1 : 0,
    }),
    [heading, page.navLabel]
  );

  const bySlug = new Map((context.pages ?? []).map((p) => [p.slug, p]));
  const related = (page.related ?? [])
    .map((slug) => bySlug.get(slug))
    .filter(Boolean);

  const parts = [
    `# ${heading}`,
    `> ${page.description}`,
    `HTML version: ${pageUrl}. Last updated ${page.updated}.`,
    body,
  ];
  if (related.length > 0) {
    parts.push(
      [
        '## Related pages',
        '',
        ...related.map(
          (p) =>
            `- [${p.navLabel}](${twinUrl(p.slug, origin)}): ${p.description}`
        ),
      ].join('\n')
    );
  }
  parts.push(`Index of every docs page in Markdown: ${origin}/docs/llms.txt`);

  return `${parts.filter((part) => part.trim() !== '').join('\n\n')}\n`;
}

/**
 * `/docs/llms.txt`: the docs pages only, each linked to its Markdown twin.
 * The site-wide `/llms.txt` stays the cold-arrival entry point; this is the
 * scoped index for an agent that already knows it wants the user docs.
 */
export function renderDocsLlmsTxt(pages, origin = SITE_ORIGIN) {
  const lines = [
    '# 3D Print Log Docs',
    '',
    '> User documentation for 3D Print Log, a web app for tracking 3D prints, printers, filament, and print statistics. Every link below is the Markdown version of a docs page; drop the `.md` for the HTML page.',
    '',
    `For the API, the MCP server, and when to use 3D Print Log at all, start at ${origin}/llms.txt instead.`,
  ];

  for (const [group, title] of Object.entries(GROUP_HEADINGS)) {
    const inGroup = pages.filter((page) => page.group === group);
    if (inGroup.length === 0) continue;
    lines.push('', `## ${title}`, '');
    for (const page of inGroup) {
      lines.push(
        `- [${page.navLabel}](${twinUrl(page.slug, origin)}): ${page.description}`
      );
    }
  }

  const known = new Set(Object.keys(GROUP_HEADINGS));
  const stray = pages.filter((page) => !known.has(page.group));
  if (stray.length > 0) {
    throw new Error(
      `docs/llms.txt has no heading for group(s): ${[...new Set(stray.map((p) => p.group))].join(', ')}.`
    );
  }

  lines.push(
    '',
    '## Optional',
    '',
    `- [Home](${origin}/index.md): What 3D Print Log is, who it is for, and what it costs.`,
    `- [Site index](${origin}/llms.txt): The API, the MCP server, and when to use 3D Print Log.`
  );

  return `${lines.join('\n')}\n`;
}

/**
 * Resolves `${this.name}` references between a page's `constants:`, the same
 * way the generated component's template literals do.
 */
export function resolveConstants(constants) {
  const resolved = {};
  const resolving = new Set();

  const resolve = (name) => {
    if (name in resolved) return resolved[name];
    if (!(name in constants)) {
      throw new Error(`constant "${name}" is not declared`);
    }
    if (resolving.has(name)) {
      throw new Error(`constant "${name}" refers to itself`);
    }
    resolving.add(name);
    const value = String(constants[name]).replace(
      /\$\{this\.([A-Za-z_$][\w$]*)\}/g,
      (_, ref) => resolve(ref)
    );
    resolving.delete(name);
    resolved[name] = value;
    return value;
  };

  for (const name of Object.keys(constants)) resolve(name);
  return resolved;
}

/**
 * Replaces each `{{ … }}` with its value. Scanned by hand rather than with a
 * regex: an interpolation can span lines and carry braces of its own (klipper's
 * Jinja sample is one long string literal).
 */
export function resolveInterpolations(template, constants, slug = '') {
  let out = '';
  let from = 0;
  for (;;) {
    const open = template.indexOf('{{', from);
    if (open === -1) return out + template.slice(from);
    const close = template.indexOf('}}', open + 2);
    if (close === -1) {
      throw new Error(`${slug}: unterminated {{ interpolation`);
    }
    out += template.slice(from, open);
    out += escapeText(
      evaluate(template.slice(open + 2, close).trim(), constants, slug)
    );
    from = close + 2;
  }
}

function evaluate(expression, constants, slug) {
  const quote = expression[0];
  if (
    (quote === "'" || quote === '"') &&
    expression.length >= 2 &&
    expression.endsWith(quote) &&
    !expression.slice(1, -1).includes(quote)
  ) {
    return expression.slice(1, -1);
  }
  if (
    /^[A-Za-z_$][\w$]*$/.test(expression) &&
    Object.hasOwn(constants, expression)
  ) {
    return constants[expression];
  }
  throw new Error(
    `${slug}: the Markdown twin cannot evaluate {{ ${expression} }}. ` +
      'Only a declared constant or a string literal can be resolved at build time.'
  );
}

function escapeText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Drops the body's opening heading when it only repeats the page's title or
 * sidebar label (most pages open with `## Prints` and a rule), so the twin
 * does not say it twice.
 */
function dropLeadingHeading(markdown, names) {
  const lines = markdown.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  const match = /^#{1,6} (.+)$/.exec(lines[i] ?? '');
  const known = names.filter(Boolean).map(normalize);
  if (!match || !known.includes(normalize(match[1]))) return markdown;
  i += 1;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  if (lines[i]?.trim() === '---') i += 1;
  return lines.slice(i).join('\n').trim();
}

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * An absolute URL for a link or image in a twin. Relative paths gain the
 * origin, and a bare `#fragment` points back at the HTML page it came from.
 */
export function absolutize(url, origin, pageUrl) {
  if (!url) return url;
  if (url.startsWith('#')) return `${pageUrl}${url}`;
  // Absolute (`https:`, `mailto:`) or protocol-relative: already portable.
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return url;
  // Everything else resolves against the site root, as it does in the app:
  // index.html sets `<base href="/">`, so `./assets/x.png` on /docs/prints is
  // /assets/x.png, not /docs/assets/x.png.
  return new URL(url, `${origin}/`).href;
}

/** `['/printers']` or `['/docs', 'prints']` -> `/printers`, `/docs/prints`. */
function routerLinkArray(value) {
  const segments = [...value.matchAll(/'([^']*)'/g)].map((m) => m[1]);
  if (segments.length === 0) return null;
  return segments
    .map((segment, i) => (i === 0 ? segment : segment.replace(/^\/+/, '')))
    .join('/');
}

function linkTarget(node) {
  const href = node.getAttribute('href');
  if (href) return href;
  const routerLink = node.getAttribute('routerlink');
  if (routerLink) return routerLink;
  const bound = node.getAttribute('[routerlink]');
  return bound ? routerLinkArray(bound) : null;
}

function fence(code) {
  let ticks = '```';
  while (code.includes(ticks)) ticks += '`';
  return `${ticks}\n${code}\n${ticks}`;
}

/** Trims blank lines at either end and the indentation they all share. */
function dedent(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const indents = lines
    .filter((line) => line.trim() !== '')
    .map((line) => line.length - line.trimStart().length);
  const shared = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(shared).trimEnd()).join('\n');
}

/** Element children. Turndown's DOM does not make `children` iterable. */
function elementChildren(node) {
  return Array.from(node.childNodes).filter((child) => child.nodeType === 1);
}

function cellText(content) {
  return content.replace(/\n+/g, ' ').trim().replace(/\|/g, '\\|');
}

function altText(node) {
  return (node.getAttribute('alt') ?? '').replace(/[[\]]/g, '');
}

/**
 * @param {string} html a rendered docs template, interpolations resolved
 * @param {{ captures: object, origin: string, pageUrl: string, headingShift?: number }} context
 * @returns {string} Markdown
 */
export function htmlToMarkdown(html, context) {
  const { captures, origin, pageUrl } = context;
  const shift = context.headingShift ?? 0;

  // Turndown decides that an element with no text is "blank" before it looks
  // at any rule, which would swallow a `<doc-figure>` (its only children are
  // markers), a `<doc-video>`, and an icon-only button. Those are routed back
  // to their own replacement here.
  /** @type {Record<string, (content: string, node: any) => string>} */
  const blankRules = {};

  const service = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '_',
    strongDelimiter: '**',
    blankReplacement(content, node) {
      const rule = blankRules[node.nodeName];
      if (rule) return rule(content, node);
      return node.isBlock ? '\n\n' : '';
    },
  });

  /** A rule for one element, applied whether or not the element has text. */
  const addElementRule = (nodeName, replacement) => {
    blankRules[nodeName] = replacement;
    service.addRule(nodeName.toLowerCase(), {
      filter: (node) => node.nodeName === nodeName,
      replacement,
    });
  };

  service.remove(['script', 'style', 'doc-marker']);

  service.addRule('heading', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement(content, node) {
      const level = Math.min(6, Number(node.nodeName.charAt(1)) + shift);
      const text = content.replace(/\s+/g, ' ').trim();
      return text ? `\n\n${'#'.repeat(level)} ${text}\n\n` : '';
    },
  });

  service.addRule('link', {
    filter: (node) => node.nodeName === 'A',
    replacement(content, node) {
      const label = content.replace(/\s+/g, ' ').trim();
      const target = absolutize(linkTarget(node), origin, pageUrl);
      if (!target) return label;
      return label ? `[${label}](${target})` : '';
    },
  });

  addElementRule('IMG', (_, node) => {
    const src = absolutize(node.getAttribute('src'), origin, pageUrl);
    return src ? `![${altText(node)}](${src})` : '';
  });

  service.addRule('code-block', {
    filter: (node) =>
      node.nodeName === 'PRE' && node.getElementsByTagName('code').length > 0,
    replacement(_, node) {
      return `\n\n${fence(dedent(node.textContent))}\n\n`;
    },
  });

  addElementRule('MAT-ICON', (_, node) => {
    // A standalone icon is decoration beside text that already says what it
    // means. An inline one stands in for a word ("click the more_horiz menu"),
    // so its ligature name is the closest a text reader can get.
    if (!node.hasAttribute('inline')) return '';
    const name = node.textContent.trim();
    return name ? `\`${name}\`` : '';
  });

  addElementRule('BUTTON', (content, node) => {
    const label =
      content.replace(/\s+/g, ' ').trim() ||
      (node.getAttribute('aria-label') ?? '').trim();
    return label ? `**${label}**` : '';
  });

  addElementRule('DOC-FIGURE', (_, node) => {
    const name = node.getAttribute('name');
    const src = absolutize(
      (name && captures[name]?.light?.src) || node.getAttribute('src'),
      origin,
      pageUrl
    );
    if (!src) return '';
    const out = [`![${altText(node)}](${src})`];
    const caption = node.getAttribute('caption');
    if (caption) out.push(`_${caption.trim()}_`);
    const markers = Array.from(node.getElementsByTagName('doc-marker'))
      .map((marker) => marker.getAttribute('label'))
      .filter(Boolean);
    if (markers.length > 0) {
      const list = markers.map((label, i) => `${i + 1}. ${label}`).join('\n');
      out.push(`Numbered markers on the image:\n\n${list}`);
    }
    return `\n\n${out.join('\n\n')}\n\n`;
  });

  const youtube = (_, node) => {
    const id = node.getAttribute('videoid');
    if (!id) return '';
    const title = node.getAttribute('title') || 'Watch the video';
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    return `\n\n[Video: ${title}](${url})\n\n`;
  };
  addElementRule('DOC-VIDEO', youtube);
  addElementRule('YOUTUBE-PLAYER', youtube);

  addElementRule('DOC-CALLOUT', (content, node) => {
    const label =
      CALLOUT_LABELS[node.getAttribute('kind') ?? 'note'] ??
      CALLOUT_LABELS.note;
    const heading = (node.getAttribute('heading') ?? '').trim();
    const lead = heading ? `**${label}: ${heading}**` : `**${label}:**`;
    const text = `${lead}\n\n${content.trim()}`.trim();
    return `\n\n${text.replace(/^/gm, '> ').replace(/^> $/gm, '>')}\n\n`;
  });

  addElementRule('DOC-STEP', (content, node) => {
    let n = 1;
    for (let s = node.previousSibling; s; s = s.previousSibling) {
      if (s.nodeName === 'DOC-STEP') n += 1;
    }
    const heading = (node.getAttribute('heading') ?? '').trim();
    // The component renders the step heading as an h4.
    const hashes = '#'.repeat(Math.min(6, 4 + shift));
    const title = heading
      ? `${hashes} Step ${n}: ${heading}`
      : `${hashes} Step ${n}`;
    return `\n\n${title}\n\n${content.trim()}\n\n`;
  });

  service.addRule('table-section', {
    filter: ['thead', 'tbody', 'tfoot'],
    replacement: (content) => content,
  });

  service.addRule('table-cell', {
    filter: ['th', 'td'],
    replacement(content, node) {
      const first = elementChildren(node.parentNode)[0] === node;
      return `${first ? '| ' : ' '}${cellText(content)} |`;
    },
  });

  service.addRule('table-row', {
    filter: 'tr',
    replacement(content, node) {
      const cells = elementChildren(node);
      const isHeader =
        node.parentNode.nodeName === 'THEAD' ||
        (elementChildren(node.parentNode)[0] === node &&
          cells.every((cell) => cell.nodeName === 'TH'));
      const rule = isHeader ? `\n|${cells.map(() => ' --- |').join('')}` : '';
      return `\n${content}${rule}`;
    },
  });

  service.addRule('table', {
    filter: 'table',
    replacement: (content) => `\n\n${content.replace(/^\n+/, '')}\n\n`,
  });

  // Turndown pads list markers to four columns (`-   item`). Valid, but every
  // nested line then carries the padding too; one space reads as authored.
  service.addRule('list-item', {
    filter: 'li',
    replacement(content, node) {
      const parent = node.parentNode;
      let marker = '- ';
      if (parent.nodeName === 'OL') {
        const start = Number(parent.getAttribute('start') ?? 1);
        marker = `${start + elementChildren(parent).indexOf(node)}. `;
      }
      const body = content
        .replace(/^\n+/, '')
        .replace(/\n+$/, '\n')
        .replace(/\n/g, `\n${' '.repeat(marker.length)}`);
      const trailing = node.nextSibling && !body.endsWith('\n') ? '\n' : '';
      return `${marker}${body}${trailing}`;
    },
  });

  service.addRule('definition-term', {
    filter: 'dt',
    replacement: (content) => `\n\n**${content.trim()}**\n\n`,
  });
  service.addRule('definition', {
    filter: 'dd',
    replacement: (content) => `\n\n${content.trim()}\n\n`,
  });

  return tidy(service.turndown(html));
}

/**
 * Whitespace cleanup outside code fences: trailing spaces, runs of blank
 * lines, and the stray leading space a removed icon leaves at the start of a
 * line (` No credit card required`). One leading space never means anything
 * in Markdown, so dropping it cannot change the structure.
 */
function tidy(markdown) {
  const out = [];
  let fenced = null;
  for (const line of markdown.split('\n')) {
    const marker = /^ *(`{3,})/.exec(line);
    if (fenced) {
      out.push(line);
      if (marker && marker[1].length >= fenced.length) fenced = null;
      continue;
    }
    if (marker) fenced = marker[1];
    out.push(line.replace(/^ (?=\S)/, '').trimEnd());
  }
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
