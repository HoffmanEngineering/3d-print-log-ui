// The docs manifest and its projections.
//
// "Route" means four different things in this app and they are deliberately NOT
// the same list, which is why each one is its own named projection with its own
// test rather than a filter applied at the call site:
//
//   toChildRoutes   Angular child routes  — components, alias redirects, default
//   toServerRoutes  prerender targets     — canonical pages only
//   toDocRoutes     DOC_ROUTES / sitemap  — canonical, published pages only
//   toArticleRoutes TechArticle + Breadcrumb expectations in verify-prerender.mjs
//
// buildManifest is the only place that validates cross-page invariants (unique
// slugs, unique aliases, known groups), so every consumer reads an already-sound
// manifest.

/** Sidebar groups, in the order they appear. A divider separates each pair. */
export const DOC_GROUPS = [
  'start',
  'features',
  'reference',
  'integrations',
  'about',
];

/** Where `/docs` lands. A generator constant: no document declares it. */
export const DEFAULT_DOC_SLUG = 'getting-started';

/**
 * The page that renders src/content/release-notes/*.md beneath its own body.
 *
 * A generator constant for the same reason DEFAULT_DOC_SLUG is one: exactly one
 * page has this behaviour, and keying off the slug keeps the release sources out
 * of the per-page frontmatter contract that every other doc obeys.
 */
export const RELEASE_NOTES_SLUG = 'release-notes';

/** Diataxis modes a page may declare. */
export const DOC_MODES = ['tutorial', 'how-to', 'reference', 'explanation'];

/**
 * The `movedAnchors` map a page declares, validated.
 *
 * Frontmatter cannot type this for us: docs-frontmatter only coerces the three
 * keys in its SEQUENCE_KEYS set, and this one is a nested mapping rather than a
 * sequence. A scalar here would otherwise reach the flattening loop below and be
 * walked character by character, minting one bogus redirect per letter.
 *
 * Exported because validateDocs needs the same rule: validate-docs.mjs never
 * calls buildManifest, so a check that lived only here would not run in
 * `npm run test:scripts`.
 *
 * @param {object} page frontmatter record
 * @returns {Record<string, string[]>}
 */
export function normalizeMovedAnchors(page) {
  const moved = page.movedAnchors;
  if (moved === undefined || moved === null) return {};

  if (typeof moved !== 'object' || Array.isArray(moved)) {
    throw new Error(
      `Doc "${page.slug}": movedAnchors must be a mapping of source slug to a list of ids.`
    );
  }

  for (const [source, ids] of Object.entries(moved)) {
    if (!Array.isArray(ids)) {
      throw new Error(
        `Doc "${page.slug}": movedAnchors["${source}"] must be a sequence: write a block list, one "- id" per line.`
      );
    }
    for (const id of ids) {
      if (typeof id !== 'string' || id.trim() === '') {
        throw new Error(
          `Doc "${page.slug}": movedAnchors["${source}"] contains an empty id.`
        );
      }
    }
  }

  return moved;
}

/**
 * @param {object[]} pages frontmatter records, one per source file
 * @param {object[]} [releases] release manifest rows, newest first
 * @returns {{ pages: object[], releases: object[], movedAnchors: Record<string, string> }}
 */
export function buildManifest(pages, releases = []) {
  const slugs = new Set();
  const aliases = new Map();

  const enriched = pages.map((page) => {
    if (!DOC_GROUPS.includes(page.group)) {
      throw new Error(
        `Doc "${page.slug}" declares unknown group "${page.group}". ` +
          `Known groups: ${DOC_GROUPS.join(', ')}.`
      );
    }
    if (slugs.has(page.slug)) {
      throw new Error(`Duplicate slug "${page.slug}" across doc sources.`);
    }
    slugs.add(page.slug);

    return {
      ...page,
      path: `docs/${page.slug}`,
      className: page.component?.className ?? classNameFor(page.slug),
      selector: `app-docs-${page.slug}`,
      aliases: page.aliases ?? [],
      related: page.related ?? [],
      dormant: page.dormant === true,
      movedAnchors: normalizeMovedAnchors(page),
    };
  });

  for (const page of enriched) {
    for (const alias of page.aliases) {
      // An alias is used verbatim as a route path. An empty one produces
      // `{ path: '', redirectTo: … }`, which toChildRoutes emits ahead of the
      // default route and so shadows it.
      if (typeof alias !== 'string' || alias === '') {
        throw new Error(
          `Doc "${page.slug}" declares an alias that must be a non-empty string, got ${JSON.stringify(alias)}.`
        );
      }
      if (slugs.has(alias)) {
        throw new Error(
          `Doc "${page.slug}" declares alias "${alias}", which is already a page slug.`
        );
      }
      if (aliases.has(alias)) {
        throw new Error(
          `Alias "${alias}" is claimed by both "${aliases.get(alias)}" and "${page.slug}".`
        );
      }
      aliases.set(alias, page.slug);
    }
  }

  enriched.sort(
    (a, b) =>
      DOC_GROUPS.indexOf(a.group) - DOC_GROUPS.indexOf(b.group) ||
      a.order - b.order ||
      a.slug.localeCompare(b.slug)
  );

  /** `sourceSlug#id` -> destination slug, for the runtime redirect. */
  const movedAnchors = {};
  for (const page of enriched) {
    for (const [source, ids] of Object.entries(page.movedAnchors)) {
      for (const id of ids) {
        movedAnchors[`${source}#${id}`] = page.slug;
      }
    }
  }

  return { pages: enriched, releases, movedAnchors };
}

/** Pages that are actually routed and published. */
function live(manifest) {
  return manifest.pages.filter((p) => !p.dormant);
}

export function toChildRoutes(manifest) {
  const routes = [];

  for (const page of live(manifest)) {
    routes.push({ path: page.slug, component: page.className });
  }
  // Alias redirects come after the concrete routes so a page always wins over a
  // redirect that happens to share a prefix.
  for (const page of live(manifest)) {
    for (const alias of page.aliases) {
      routes.push({ path: alias, redirectTo: page.slug });
    }
  }
  routes.push({
    path: '',
    redirectTo: DEFAULT_DOC_SLUG,
    pathMatch: 'full',
  });

  return routes;
}

export function toServerRoutes(manifest) {
  return live(manifest).map((page) => ({
    path: page.path,
    renderMode: 'Prerender',
  }));
}

export function toDocRoutes(manifest) {
  return live(manifest).map((page) => page.path);
}

/**
 * The pages verify-prerender.mjs expects TechArticle + BreadcrumbList on.
 *
 * DocumentationComponent emits both for any route that resolves SEO tags, which
 * is every routed page — so this set is the published set, by construction and
 * not by coincidence. It stays a named projection because verify-prerender asks
 * a different question of it than the sitemap does; if a page ever needs to opt
 * out, the shell has to stop emitting the JSON-LD in the same change.
 */
export function toArticleRoutes(manifest) {
  return toDocRoutes(manifest);
}

export function toSeo(manifest) {
  /** @type {Record<string, { title: string, description: string }>} */
  const seo = {};
  for (const page of live(manifest)) {
    seo[page.path] = { title: page.title, description: page.description };
  }
  return seo;
}

export function toSidebar(manifest) {
  const nav = [];
  let previousGroup = null;

  for (const page of live(manifest)) {
    if (previousGroup !== null && page.group !== previousGroup) {
      nav.push({ divider: true });
    }
    nav.push({ name: page.navLabel, url: `/${page.path}` });
    previousGroup = page.group;
  }

  return nav;
}

/** `octoprint-webhook` -> `DocsOctoprintWebhookComponent`. */
function classNameFor(slug) {
  const pascal = slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `Docs${pascal}Component`;
}
