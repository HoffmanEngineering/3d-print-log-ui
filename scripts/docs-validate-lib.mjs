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

import {
  DEFAULT_DOC_SLUG,
  DOC_MODES,
  RELEASE_NOTES_SLUG,
  normalizeMovedAnchors,
} from './docs-manifest-lib.mjs';
import {
  extractAnchors,
  ID_PATTERN,
  renderMarkdown,
  withHeadingIds,
} from './docs-markdown.mjs';
import { anchorFor, isVersion } from './release-notes-lib.mjs';
import { renderRelease } from './release-notes-emit.mjs';

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
  'a',
  'article',
  'aside',
  'b',
  'blockquote',
  'br',
  'button',
  'code',
  'dd',
  // The doc primitives, declared by DocumentationModule. See
  // src/app/documentation/primitives.
  'doc-callout',
  'doc-figure',
  'doc-marker',
  'doc-step',
  'doc-steps',
  'doc-video',
  'dl',
  'dt',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'mat-icon',
  'ol',
  'p',
  'pre',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'time',
  'tr',
  'ul',
  'youtube-player',
]);

/**
 * @param {{ sources: object[], releases?: object[], anchorBaseline?: Record<string, string[]>, captures?: Record<string, object> }} input
 * @returns {{ file: string, message: string }[]}
 */
export function validateDocs({
  sources,
  releases = [],
  anchorBaseline = {},
  captures = {},
}) {
  const problems = [];
  const add = (file, message) =>
    problems.push({ file, message: `${file}: ${message}` });

  validateReleases(releases, add);

  // The release-notes page is checked as the whole history, not as the ten
  // releases that render into its template. Every rule below — the anchor
  // contract above all — is about what the reader can reach, and the component
  // expands the archive to reach an archived anchor. Checking only the page
  // template would quietly stop guarding the great majority of published ids.
  const renderedReleases =
    releases.length > 0 ? releases.map(renderRelease).join('\n') : '';

  /**
   * The full page a reader can reach, release history included.
   *
   * `withHeadingIds` has to run here for the same reason it runs in
   * planOutputs: it is part of what the page IS. Validating the bare
   * renderMarkdown output would reject `[Jump](#materials-list)` as a link to
   * an id nothing declares, while the deployed page declares it.
   *
   * This only widens what may be LINKED to. The published-anchor contract is
   * checked against docs-anchors.json, which is hand-maintained and holds
   * explicit ids only, so a derived id still never enters it.
   */
  const templateFor = (source) => {
    const rendered = withHeadingIds(renderMarkdown(source.body ?? ''));
    return source.slug === RELEASE_NOTES_SLUG && renderedReleases
      ? `${rendered}\n${renderedReleases}`
      : rendered;
  };

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

  /** Pages present as sources but whose Markdown did not render. */
  const unrendered = new Set();
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

    if (
      typeof s.updated === 'string' &&
      !/^\d{4}-\d{2}-\d{2}$/.test(s.updated)
    ) {
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
      template = templateFor(s);
    } catch (error) {
      // The render error is the only real problem here. Every downstream check
      // reads anchorsBySlug, and an absent key means "no such page" — so
      // without this the author also gets told their anchors vanished and that
      // the page they are editing does not exist.
      add(file, error.message);
      unrendered.add(s.slug);
      continue;
    }

    const ids = extractAnchors(template);
    anchorsBySlug.set(s.slug, ids);

    // extractAnchors dedupes, which is right for the contract check below and
    // wrong here: two elements sharing an id make the deep link ambiguous.
    const seen = new Set();
    for (const match of template.matchAll(ID_PATTERN)) {
      const id = match[1] ?? match[2];
      if (seen.has(id)) {
        add(file, `id "${id}" is declared more than once.`);
      }
      seen.add(id);
    }

    for (const element of elementsOf(template)) {
      if (!ELEMENT_ALLOWLIST.has(element)) {
        add(file, `element <${element}> is not in the docs element allowlist.`);
      }
    }

    for (const problem of figureProblems(template, captures)) {
      add(file, problem);
    }

    for (const problem of markerProblems(template)) {
      add(file, problem);
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

  // movedAnchors: a published id whose section now lives on another page.
  //
  // These rules exist because a wrong redirect is invisible. A claim naming a
  // nonexistent id, or an id the source page still declares, produces a link
  // that resolves to the wrong content rather than an error.
  /** `sourceSlug#id` -> the slug claiming it. */
  const movedClaims = new Map();

  for (const s of sources) {
    const file = s.sourceFile ?? `${s.slug}.md`;

    // A page whose template did not render has no entry in anchorsBySlug, which
    // is indistinguishable here from "declares no ids". Reporting both would
    // undo the one-error-per-render-failure guarantee above.
    if (unrendered.has(s.slug)) continue;

    let moved;
    try {
      moved = normalizeMovedAnchors(s); // rule 0
    } catch (error) {
      add(file, error.message);
      continue;
    }

    if (Object.keys(moved).length > 0 && s.dormant) {
      add(
        file,
        `movedAnchors is declared but "${s.slug}" is dormant, so the redirect would have no route to land on.`
      ); // rule 7
      continue;
    }

    for (const [sourceSlug, ids] of Object.entries(moved)) {
      if (sourceSlug === s.slug) {
        add(file, `movedAnchors lists its own slug "${sourceSlug}".`); // rule 5
        continue;
      }
      if (!routed.some((p) => p.slug === sourceSlug)) {
        add(
          file,
          `movedAnchors names "${sourceSlug}", which is not a routed doc page.`
        ); // rule 1
        continue;
      }

      for (const id of ids) {
        const key = `${sourceSlug}#${id}`;

        if (!anchorsBySlug.get(s.slug)?.includes(id)) {
          add(
            file,
            `movedAnchors claims "${key}" but declares no id "${id}" on this page.`
          ); // rule 2
        }
        if (anchorsBySlug.get(sourceSlug)?.includes(id)) {
          add(
            file,
            `movedAnchors claims "${key}", but "${id}" is still declared on "${sourceSlug}". Two homes make the redirect a lie.`
          ); // rule 3
        }
        if (movedClaims.has(key)) {
          add(
            file,
            `"${key}" is claimed by both "${movedClaims.get(key)}" and "${s.slug}".`
          ); // rule 4
        } else {
          movedClaims.set(key, s.slug);
        }
        if (!(anchorBaseline[`docs/${sourceSlug}`] ?? []).includes(id)) {
          add(
            file,
            `movedAnchors claims "${key}" was never published; move the section and update the link instead.`
          ); // rule 6
        }
      }
    }
  }

  // Link checks need every page's anchors, so they run once the loop is done.
  for (const s of sources) {
    const file = s.sourceFile ?? `${s.slug}.md`;
    const template = anchorsBySlug.has(s.slug) ? templateFor(s) : '';

    for (const href of linksOf(template)) {
      const [target, fragment] = splitFragment(href);

      if (target === '') {
        if (fragment && !anchorsBySlug.get(s.slug)?.includes(fragment)) {
          add(
            file,
            `link to #${fragment}, but no element on the page declares that id.`
          );
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

    if (unrendered.has(s.slug)) continue;

    for (const anchor of anchorBaseline[`docs/${s.slug}`] ?? []) {
      if (anchorsBySlug.get(s.slug)?.includes(anchor)) continue;
      // A published id is also honored when another page claims it via
      // movedAnchors: the URL still resolves, by redirect rather than in place.
      if (movedClaims.has(`${s.slug}#${anchor}`)) continue;
      add(
        file,
        `anchor "${anchor}" was published previously and is no longer declared.`
      );
    }
  }

  // The default child route is a generator constant, so nothing otherwise ties
  // it to a page that exists. Deleting or retiring the landing page leaves
  // /docs redirecting to a route no projection emits.
  if (!routed.some((s) => s.slug === DEFAULT_DOC_SLUG)) {
    add(
      'src/content/docs',
      `the default doc page "${DEFAULT_DOC_SLUG}" is missing or dormant; /docs would redirect to a route that does not exist.`
    );
  }

  // Deleting a source used to take its published anchors with it silently: the
  // check above only ever runs for pages that still exist.
  for (const [route, anchors] of Object.entries(anchorBaseline)) {
    const slug = route.replace(/^docs\//, '');
    const exists = sources.some((s) => s.slug === slug);
    if (exists || !anchors.length) continue;
    add(
      'docs-anchors.json',
      `${route} has published anchors (${anchors
        .map((a) => `"${a}"`)
        .join(', ')}) but no doc page exists.`
    );
  }

  return problems;
}

/** An HTML character reference: `&amp;`, `&#64;`, `&mdash;`. */
const CHARACTER_REFERENCE = /&#?[a-zA-Z0-9]+;/;

/**
 * Rules for src/content/release-notes/*.md.
 *
 * `readReleaseSources` already refuses a file whose `version` does not match its
 * filename, because nothing downstream can run without that. What is left here
 * is everything a release can get wrong that still parses: a version the anchor
 * generator would mangle, a missing date the what's-new surface would sort on,
 * and a title that is silently blank in the heading.
 */
function validateReleases(releases, add) {
  const seen = new Map();
  // Non-global: `.test` and `.exec` are both called on it below, and a global
  // regex would carry lastIndex between them.

  for (const release of releases) {
    const file = `release-notes/${release.sourceFile ?? `${release.version}.md`}`;

    if (!isVersion(release.version)) {
      add(
        file,
        `version "${release.version}" must be numeric (1.49.1, or the legacy two-part 1.6); the anchor "${anchorFor(release.version)}" is derived from it.`
      );
    }

    const previous = seen.get(release.version);
    if (previous)
      add(
        file,
        `version "${release.version}" is already declared by ${previous}.`
      );
    else seen.set(release.version, file);

    if (
      typeof release.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(release.date)
    ) {
      add(
        file,
        `date "${release.date}" must be a quoted ISO date (YYYY-MM-DD).`
      );
    }

    // An empty title is legal, not an oversight: 1.29.0 shipped with a bare
    // version heading and `headingFor` renders exactly that. What is checked is
    // that the field is a string, so a forgotten quote cannot reach the heading.
    if (typeof release.title !== 'string') {
      add(file, 'frontmatter field "title" must be a string.');
    } else if (CHARACTER_REFERENCE.test(release.title)) {
      // A title is data, not markup: it is rendered through {{ }} in the
      // archive and used verbatim as the GitHub Release title, and in both
      // places an entity shows up as its literal source text. Only the
      // generated <h3> is HTML, and that path escapes for itself.
      add(
        file,
        `title contains the character reference "${CHARACTER_REFERENCE.exec(release.title)[0]}"; write the character itself.`
      );
    }

    if (!Array.isArray(release.highlights)) {
      add(file, 'frontmatter field "highlights" must be a sequence.');
    }
  }
}

/**
 * A `<doc-figure>` start tag, with its attributes.
 *
 * Quote-aware, because `[^>]*` stopped at the first `>` wherever it appeared —
 * including inside a value. `alt="Prints > 10"` truncated the attribute string
 * mid-way, and the rules below then reported a figure that binds neither name
 * nor src, which is true of the fragment and false of the markup.
 *
 * The three alternatives are DISJOINT — the last one excludes both quote
 * characters — and that is load-bearing, not tidiness. With a plain `[^>]`
 * there, a quote could be consumed by two different branches, so a run of them
 * could be decomposed exponentially many ways and a long one would hang the
 * validator (CodeQL js/redos). Disjoint alternatives leave exactly one parse.
 */
const DOC_FIGURE = /<doc-figure\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

/** Any opening `<doc-figure`, matched or not — see `figureProblems`. */
const DOC_FIGURE_OPEN = /<doc-figure\b/g;

/**
 * Reads an attribute off a start tag, whether it is written plainly or as a
 * property binding. Only the literal form carries a value this script can read;
 * `[width]="something"` is reported as present with an unreadable value, which
 * is all any rule below needs.
 */
function attributeOf(attributes, name) {
  // Single quotes are legal in the raw HTML blocks a doc page may contain, and
  // `alt='He said "no"'` is the reason an author would reach for them.
  const match = new RegExp(`\\s\\[?${name}\\]?\\s*=\\s*("[^"]*"|'[^']*')`).exec(
    attributes
  );
  return match ? match[1].slice(1, -1) : null;
}

/**
 * The `<doc-figure>` contract.
 *
 * `alt` must describe the image in words. `alt` being a required input only
 * makes the BINDING required — `alt=""` compiles, and marks the screenshot
 * decorative. It never is: a doc figure is a picture of the product carrying
 * information the prose does not repeat. Scoped to `doc-figure` rather than to
 * every `<img>` on purpose: a bare `<img>` in a doc is sometimes genuinely
 * ornamental, and the existing pages include one. The primitive is the thing
 * that promises otherwise.
 *
 * `name` and `src` are the two ways to point at an image and exactly one is
 * allowed, because a figure carrying both would silently render the generated
 * one and leave the author editing a path that does nothing.
 *
 * A `name` must resolve. This is the gate the whole capture pipeline hangs off:
 * assets are content-hashed and committed, so a figure whose capture was never
 * run, or whose target was renamed, is a broken image on a published page and
 * nothing else would notice.
 *
 * `width`/`height` belong with `src` and only with `src`. Without them the
 * screenshot reflows the prose under it as it loads; beside a `name` they are
 * numbers the next recapture invalidates without touching the Markdown.
 *
 * @param {string} template
 * @param {Record<string, object>} captures docs-captures.json
 * @returns {string[]} one message per offending figure
 */
function figureProblems(template, captures) {
  const problems = [];

  const tags = [...template.matchAll(DOC_FIGURE)];

  // Every `<doc-figure` must have parsed. An unbalanced quote makes the tag
  // regex fail rather than match a truncated fragment, and a figure that
  // silently escaped every rule below is the one shape this function must not
  // allow — it is the rule that a missing alt or an unresolvable name is caught.
  const opened = [...template.matchAll(DOC_FIGURE_OPEN)].length;
  if (opened !== tags.length) {
    problems.push(
      `${opened - tags.length} <doc-figure> tag(s) could not be parsed; check for an unbalanced quote in an attribute.`
    );
  }

  for (const [, attributes] of tags) {
    const alt = attributeOf(attributes, 'alt');
    if (alt === null) {
      problems.push(
        '<doc-figure> is missing alt; describe what the screenshot shows.'
      );
    } else if (alt.trim() === '') {
      problems.push(
        '<doc-figure> has an empty alt; describe what the screenshot shows.'
      );
    }

    const name = attributeOf(attributes, 'name');
    const src = attributeOf(attributes, 'src');
    // Named without rebuilding the markup around it. An interpolation into
    // `name="..."` reads as an HTML attribute being assembled from unescaped
    // input, which is what CodeQL's incomplete-html-attribute-sanitization rule
    // is for. Nothing here is ever rendered — these are console messages — but
    // a validator should not be the thing teaching that pattern.
    const label = name ? `<doc-figure> named "${name}"` : '<doc-figure>';

    if (name !== null && src !== null) {
      problems.push(
        `${label} binds both name and src; use name for a generated capture, src for a hand-placed asset.`
      );
      continue;
    }
    if (name === null && src === null) {
      problems.push(
        '<doc-figure> binds neither name nor src; it has no image to show.'
      );
      continue;
    }

    const dimensions = ['width', 'height'].filter(
      (attribute) => attributeOf(attributes, attribute) !== null
    );

    if (name !== null) {
      if (!Object.prototype.hasOwnProperty.call(captures, name)) {
        problems.push(
          `${label} names a capture that does not exist. Add it to DOC_CAPTURE_SET in cypress/fixtures/demo/manifest.ts and run \`npm run capture:docs:all\`.`
        );
      }
      if (dimensions.length > 0) {
        problems.push(
          `${label} sets ${dimensions.join(' and ')}; a named figure takes its dimensions from the capture, and a hand-typed one goes stale on the next recapture.`
        );
      }
      continue;
    }

    for (const attribute of ['width', 'height']) {
      if (attributeOf(attributes, attribute) === null) {
        problems.push(
          `<doc-figure> for "${src}" is missing ${attribute}; without it the image reflows the prose as it loads.`
        );
      }
    }
  }

  return problems;
}

/**
 * A `<doc-marker>` start tag, with its attributes. Same quote-aware, disjoint
 * shape as `DOC_FIGURE` and for the same two reasons — see its comment.
 */
const DOC_MARKER = /<doc-marker\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

/** Any opening `<doc-marker`, matched or not — see `markerProblems`. */
const DOC_MARKER_OPEN = /<doc-marker\b/g;

/**
 * The three tokens that decide whether a marker is inside a figure, in one
 * pass. `<doc-figure>` never nests, so a single in/out flag is enough.
 */
const FIGURE_SCAN = /<doc-figure\b|<\/doc-figure\s*>|<doc-marker\b/g;

/**
 * The `<doc-marker>` contract.
 *
 * A marker is only meaningful as a child of a `<doc-figure>`: it positions
 * itself against that figure's image box. Written anywhere else it renders as
 * an absolutely positioned disc over whatever paragraph happens to be the
 * nearest positioned ancestor, which is a layout bug no test would catch.
 *
 * `x` and `y` are percentages and must be literal numbers in 0-100. Percentages
 * are the whole point — they survive a recapture, where pixels would not — and
 * a coordinate has nothing to compute from, so unlike `width` on a figure there
 * is no legitimate property-binding form to tolerate here.
 *
 * `label` must name the region in words, for the same reason `alt` must on a
 * figure: the disc itself shows a bare ordinal, so a reader who cannot see the
 * screenshot gets "3" and no way to know what 3 points at.
 *
 * @param {string} template
 * @returns {string[]} one message per offending marker
 */
function markerProblems(template) {
  const problems = [];

  const tags = [...template.matchAll(DOC_MARKER)];

  // Same guard as figureProblems: a tag the regex could not parse is a tag that
  // silently escaped every rule below.
  const opened = [...template.matchAll(DOC_MARKER_OPEN)].length;
  if (opened !== tags.length) {
    problems.push(
      `${opened - tags.length} <doc-marker> tag(s) could not be parsed; check for an unbalanced quote in an attribute.`
    );
  }

  let inFigure = false;
  let stray = 0;
  for (const [token] of template.matchAll(FIGURE_SCAN)) {
    if (token.startsWith('<doc-marker')) {
      if (!inFigure) stray += 1;
    } else {
      inFigure = !token.startsWith('</');
    }
  }
  if (stray > 0) {
    problems.push(
      `${stray} <doc-marker> tag(s) sit outside a <doc-figure>; a marker positions itself against a figure's image and has nothing to point at on its own.`
    );
  }

  for (const [, attributes] of tags) {
    const label = attributeOf(attributes, 'label');
    if (label === null) {
      problems.push(
        '<doc-marker> is missing label; name the region the marker points at.'
      );
    } else if (label.trim() === '') {
      problems.push(
        '<doc-marker> has an empty label; name the region the marker points at.'
      );
    }

    for (const axis of ['x', 'y']) {
      const raw = attributeOf(attributes, axis);
      if (raw === null) {
        problems.push(
          `<doc-marker> is missing ${axis}; a marker is placed as a percentage of the image box.`
        );
        continue;
      }
      const value = Number(raw.trim());
      if (raw.trim() === '' || !Number.isFinite(value)) {
        problems.push(
          `<doc-marker> has a non-numeric ${axis}; a marker is placed as a percentage of the image box.`
        );
      } else if (value < 0 || value > 100) {
        problems.push(
          `<doc-marker> has ${axis}="${raw}", which is outside the image; a marker is placed as a percentage of the image box.`
        );
      }
    }
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
  //
  // Only an array of plain string literals can be resolved statically. A
  // matrix-parameter object (`{ tab: 'details' }`) or a segment that is a class
  // member is skipped rather than guessed at: harvesting every quoted substring
  // turned the object's value into a path segment and reported a dead link to a
  // page nobody had linked to.
  for (const match of template.matchAll(
    /\s\[routerLink\]=("\[[^\]]*\]"|'\[[^\]]*\]')/g
  )) {
    const inner = match[1].slice(2, -2).trim();
    if (inner === '') continue;

    const parts = inner.split(',').map((part) => part.trim());
    const segments = parts.map((part) =>
      /^'[^']*'$/.test(part) || /^"[^"]*"$/.test(part)
        ? part.slice(1, -1)
        : null
    );
    if (segments.some((segment) => segment === null)) continue;

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
  'true',
  'false',
  'null',
  'undefined',
  'as',
  'let',
  'of',
  'track',
  'async',
  'this',
  'item',
  'index',
  'case',
  'default',
]);
