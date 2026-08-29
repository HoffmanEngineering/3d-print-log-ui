// Content rules for src/content/docs/*.md.
//
// This is the check that replaces the old seven-point wiring checklist: if a doc
// passes here and `docs:generate --check` is clean, the page is wired. Every rule
// exists because breaking it produces a failure that is invisible locally —
// a dead deep link, a duplicate description that fails verify-prerender in CI, a
// template member that only fails under AOT.
//
// Global title/description uniqueness deliberately stays in verify-prerender.mjs:
// marketing SEO text lives in Angular sources this script cannot read, and the
// prerendered HTML is the only place both pools exist together.

import { DOC_MODES } from './docs-manifest-lib.mjs';
import { extractAnchors, renderMarkdown } from './docs-markdown.mjs';

const REQUIRED_FIELDS = {
  slug: 'string',
  title: 'string',
  description: 'string',
  navLabel: 'string',
  group: 'string',
  order: 'number',
  mode: 'string',
  updated: 'string',
};

const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 170;

/**
 * Elements a doc page may use. Anything else is either a mistake or a decision
 * that deserves review — a new Angular component in a doc means the docs module's
 * template scope has to change too.
 */
const ELEMENT_ALLOWLIST = new Set([
  'a', 'article', 'aside', 'b', 'blockquote', 'br', 'button', 'code', 'dd', 'dl',
  'dt', 'div', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'img', 'li', 'mat-icon', 'ol', 'p', 'pre', 'section', 'small',
  'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'tr', 'ul', 'youtube-player',
]);

/**
 * @param {{ sources: object[], anchorBaseline?: Record<string, string[]> }} input
 * @returns {{ file: string, message: string }[]}
 */
export function validateDocs({ sources, anchorBaseline = {} }) {
  const problems = [];
  const add = (file, message) => problems.push({ file, message: `${file}: ${message}` });

  // Link targets resolve against ROUTED pages only. A dormant page keeps its
  // source file but is filtered out of every route projection, so a link to it
  // resolves against nothing at runtime.
  const routed = sources.filter((s) => !s.dormant);
  const bySlug = new Map(routed.map((s) => [s.slug, s]));
  const aliasOwners = new Map();
  for (const s of routed) {
    if (!Array.isArray(s.aliases)) continue;
    for (const alias of s.aliases) aliasOwners.set(alias, s.slug);
  }

  const titles = new Map();
  const descriptions = new Map();
  /** @type {Map<string, string[]>} */
  const anchorsBySlug = new Map();

  for (const s of sources) {
    const file = s.sourceFile ?? `${s.slug}.md`;

    for (const [field, type] of Object.entries(REQUIRED_FIELDS)) {
      if (s[field] === undefined || s[field] === null || s[field] === '') {
        add(file, `missing required frontmatter field "${field}".`);
      } else if (typeof s[field] !== type) {
        add(file, `frontmatter field "${field}" must be a ${type}.`);
      }
    }

    if (typeof s.mode === 'string' && !DOC_MODES.includes(s.mode)) {
      add(file, `mode "${s.mode}" is not one of ${DOC_MODES.join(', ')}.`);
    }

    if (typeof s.updated === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(s.updated)) {
      add(file, `updated "${s.updated}" must be an ISO date (YYYY-MM-DD).`);
    }

    if (typeof s.description === 'string') {
      const length = s.description.length;
      if (length < DESCRIPTION_MIN || length > DESCRIPTION_MAX) {
        add(
          file,
          `description is ${length} characters; must be ${DESCRIPTION_MIN}-${DESCRIPTION_MAX}.`
        );
      }
    }

    if (typeof s.title === 'string') {
      const seen = titles.get(s.title);
      if (seen) add(file, `title is already used by ${seen}.`);
      else titles.set(s.title, file);
    }

    if (typeof s.description === 'string') {
      const seen = descriptions.get(s.description);
      if (seen) add(file, `description is already used by ${seen}.`);
      else descriptions.set(s.description, file);
    }

    let template = '';
    try {
      template = renderMarkdown(s.body ?? '');
    } catch (error) {
      add(file, error.message);
      continue;
    }

    const ids = extractAnchors(template);
    anchorsBySlug.set(s.slug, ids);

    // extractAnchors dedupes, which is right for the contract check below and
    // wrong here: two elements sharing an id make the deep link ambiguous.
    const seen = new Set();
    for (const match of template.matchAll(/\sid="([^"]+)"/g)) {
      if (seen.has(match[1])) {
        add(file, `id "${match[1]}" is declared more than once.`);
      }
      seen.add(match[1]);
    }

    for (const element of elementsOf(template)) {
      if (!ELEMENT_ALLOWLIST.has(element)) {
        add(file, `element <${element}> is not in the docs element allowlist.`);
      }
    }

    // A `component:` page owns its class, so its template may reference anything
    // that class declares — this script cannot read TypeScript to know what.
    if (!s.component) {
      const declared = new Set(Object.keys(s.constants ?? {}));
      for (const member of membersOf(template)) {
        if (!declared.has(member)) {
          add(
            file,
            `template references "${member}", which is not declared in constants: or by a component:.`
          );
        }
      }
    }
  }

  // Link checks need every page's anchors, so they run once the loop is done.
  for (const s of sources) {
    const file = s.sourceFile ?? `${s.slug}.md`;
    const template = anchorsBySlug.has(s.slug) ? renderMarkdown(s.body ?? '') : '';

    for (const href of linksOf(template)) {
      const [target, fragment] = splitFragment(href);

      if (target === '') {
        if (fragment && !anchorsBySlug.get(s.slug)?.includes(fragment)) {
          add(file, `link to #${fragment}, but no element on the page declares that id.`);
        }
        continue;
      }

      if (!target.startsWith('/docs/')) continue;

      const slug = target.slice('/docs/'.length).replace(/\/$/, '');
      const resolved = bySlug.has(slug) ? slug : aliasOwners.get(slug);
      if (!resolved) {
        add(file, `link to ${target}, but there is no doc page "${slug}".`);
        continue;
      }
      if (fragment && !anchorsBySlug.get(resolved)?.includes(fragment)) {
        add(
          file,
          `link to ${target}#${fragment}, but that page declares no id "${fragment}".`
        );
      }
    }

    for (const anchor of anchorBaseline[`docs/${s.slug}`] ?? []) {
      if (!anchorsBySlug.get(s.slug)?.includes(anchor)) {
        add(
          file,
          `anchor "${anchor}" was published previously and is no longer declared.`
        );
      }
    }
  }

  // Deleting a source used to take its published anchors with it silently: the
  // check above only ever runs for pages that still exist.
  for (const [route, anchors] of Object.entries(anchorBaseline)) {
    const slug = route.replace(/^docs\//, '');
    if (anchorsBySlug.has(slug) || !anchors.length) continue;
    add(
      'docs-anchors.json',
      `${route} has published anchors (${anchors
        .map((a) => `"${a}"`)
        .join(', ')}) but no doc page exists.`
    );
  }

  return problems;
}

function elementsOf(template) {
  const names = new Set();
  for (const match of template.matchAll(/<([A-Za-z][A-Za-z0-9-]*)/g)) {
    names.add(match[1].toLowerCase());
  }
  return names;
}

/**
 * Every route this template sends a reader to.
 *
 * A raw HTML block passes through the renderer untouched, so the sources contain
 * link spellings the Markdown link syntax never produces: single quotes, and the
 * property-bound `[routerLink]="['/printers']"` form that getting-started.md uses.
 * Matching only unbound double-quoted attributes is how two links to
 * /docs/integrations — a route that has never existed — survived in the MCP page.
 */
function linksOf(template) {
  const hrefs = [];

  for (const match of template.matchAll(
    /\s(?:href|routerLink)=("[^"]*"|'[^']*')/g
  )) {
    const value = match[1].slice(1, -1);
    if (value) hrefs.push(value);
  }

  // `[routerLink]="['/docs', 'prints']"` joins its segments into one path.
  for (const match of template.matchAll(
    /\s\[routerLink\]=("\[[^\]]*\]"|'\[[^\]]*\]')/g
  )) {
    const segments = [
      ...match[1].slice(2, -2).matchAll(/'([^']*)'|"([^"]*)"/g),
    ].map((s) => s[1] ?? s[2]);
    if (!segments.length) continue;
    hrefs.push(segments.join('/').replace(/\/{2,}/g, '/'));
  }

  return hrefs;
}

function splitFragment(href) {
  const at = href.indexOf('#');
  return at === -1 ? [href, ''] : [href.slice(0, at), href.slice(at + 1)];
}

/**
 * Root identifiers a template binds to. `{{ a.b }}` and `[x]="a"` both reach for
 * a class member; a template that names one the class does not declare compiles
 * only because nothing checked it here.
 */
function membersOf(template) {
  const members = new Set();
  const expressions = [];

  for (const match of template.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    expressions.push(match[1]);
  }
  for (const match of template.matchAll(/\s\[[\w.-]+\]="([^"]*)"/g)) {
    expressions.push(match[1]);
  }
  for (const match of template.matchAll(/@(?:if|for|switch)\s*\(([^)]*)\)/g)) {
    expressions.push(match[1]);
  }

  for (const raw of expressions) {
    // A string literal is data, not a reference — `{{'{% set x %}'}}` is how a
    // page prints literal braces, and `['/docs/prints']` is a route path.
    const expression = raw.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');

    for (const match of expression.matchAll(
      /(^|[^\w.$'"])([A-Za-z_$][\w$]*)\s*(:?)/g
    )) {
      const name = match[2];
      // A trailing colon makes it an object-literal key: `{ display: 'block' }`
      // names a CSS property, not a class member.
      if (match[3] === ':') continue;
      if (RESERVED.has(name)) continue;
      members.add(name);
    }
  }

  return members;
}

const RESERVED = new Set([
  'true', 'false', 'null', 'undefined', 'as', 'let', 'of', 'track', 'async',
  'this', 'item', 'index', 'case', 'default',
]);
