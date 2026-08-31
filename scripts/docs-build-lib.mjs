// Reading doc sources, planning the generated tree, and syncing it to disk.
//
// Planning is pure: `planOutputs` returns a path -> contents map, so the whole
// generated tree is comparable byte for byte (that is what `--check` uses, and
// what makes generation idempotent by construction).
//
// Ordering matters on write. `tsconfig.app.json` seeds the compile graph from
// main.ts, so the route barrels are transitive compile inputs. They are written
// LAST, after the page components they import, so a watching Angular build never
// sees a barrel pointing at a file that does not exist yet.
//
// Writes are atomic per file, not across the tree, and that is deliberate. A
// watching Angular build can still rebuild against a mixed generation — a new
// manifest beside an old route barrel — while a rename or deletion is in flight,
// and a `--check` run racing a write can report that transient as drift. Both
// are dev-only and self-correct on the next rebuild; every non-watch entry point
// (`npm start`, `build`, `test`, CI) generates to completion before anything
// reads the tree. Making the swap atomic across files would mean staging the
// whole generated directory and renaming it in one step, which buys nothing for
// the paths that actually gate a release.

import fs from 'node:fs';
import path from 'node:path';

import { parseFrontmatter } from './docs-frontmatter.mjs';
import { DOC_CAPTURES_JSON } from './docs-paths.mjs';
import {
  emitCapturesTs,
  emitDeclarationsTs,
  emitFiguresTs,
  emitManifestTs,
  emitOutlineTs,
  emitPageComponentTs,
  emitPageTemplate,
  emitRoutesTs,
  emitSearchIndexJson,
  emitServerRoutesTs,
} from './docs-emit.mjs';
import { buildManifest, RELEASE_NOTES_SLUG } from './docs-manifest-lib.mjs';
import { renderMarkdown, withHeadingIds } from './docs-markdown.mjs';
import {
  emitArchiveTs,
  renderArchiveHost,
  renderRecentReleases,
  renderRelease,
  toReleaseManifest,
} from './release-notes-emit.mjs';

/** Barrels are written last; see the note at the top of this file. */
const BARRELS = [
  'docs-declarations.ts',
  'docs-manifest.ts',
  'docs.routes.ts',
  'docs.server-routes.ts',
];

/**
 * @param {string} contentDir directory of `<slug>.md` files
 * @returns {object[]} frontmatter records with `body`, sorted by slug
 */
export function readDocSources(contentDir) {
  const names = fs
    .readdirSync(contentDir)
    .filter((name) => name.endsWith('.md'))
    .sort();

  return names.map((name) => {
    const raw = fs.readFileSync(path.join(contentDir, name), 'utf8');
    let parsed;
    try {
      parsed = parseFrontmatter(raw);
    } catch (error) {
      throw new Error(`${name}: ${error.message}`);
    }

    const expected = name.replace(/\.md$/, '');
    if (parsed.data.slug !== expected) {
      throw new Error(
        `${name} declares slug "${parsed.data.slug}" but must match its filename ("${expected}").`
      );
    }

    // A page styles itself by dropping `<slug>.scss` beside its Markdown; the
    // generator copies it next to the generated component. No frontmatter field
    // for it, so the file's presence is the only thing that can drift.
    const stylesheet = path.join(contentDir, `${expected}.scss`);
    const styles = fs.existsSync(stylesheet)
      ? fs.readFileSync(stylesheet, 'utf8')
      : null;

    return {
      ...parsed.data,
      body: parsed.body,
      sourceFile: name,
      styles,
      hasStyles: styles !== null && !parsed.data.component,
    };
  });
}

/**
 * The checked-in figure map written by scripts/process-captures.mjs.
 *
 * Absent is legal and means "no figures have been captured yet" — a fresh clone
 * that has never run Cypress still builds, and `validate-docs` is what reports a
 * `<doc-figure name>` the map cannot resolve.
 *
 * @returns {Record<string, {light: object, dark: object}>}
 */
export function readDocCaptures(file = DOC_CAPTURES_JSON) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

/**
 * @param {object[]} sources from readDocSources
 * @param {object[]} [releases] from readReleaseSources, newest first
 * @param {Record<string, object>} [captures] from readDocCaptures
 * @returns {{ files: Map<string, string>, manifest: object, templates: Record<string, string> }}
 */
export function planOutputs(sources, releases = [], captures = {}) {
  const manifest = buildManifest(
    sources.map(({ body, sourceFile, styles, ...frontmatter }) => frontmatter),
    toReleaseManifest(releases)
  );
  const stylesBySlug = new Map(sources.map((s) => [s.slug, s.styles]));

  /** @type {Record<string, string>} */
  const templates = {};
  for (const source of sources) {
    try {
      // Ids are minted on the rendered template, so raw HTML pages get them
      // too — mcp and getting-started are <article> markup end to end.
      templates[source.slug] = withHeadingIds(renderMarkdown(source.body));
    } catch (error) {
      throw new Error(`${source.sourceFile}: ${error.message}`);
    }
  }

  // Search and the figure inventory index the WHOLE history, not just what the
  // page paints on arrival: a reader searching for a two-year-old release should
  // still find it, and the component expands the archive to reach its anchor.
  const indexed = { ...templates };

  if (templates[RELEASE_NOTES_SLUG] !== undefined && releases.length > 0) {
    const pageBody = templates[RELEASE_NOTES_SLUG];
    // The page itself carries only the newest releases. Everything older is a
    // lazily imported chunk, so it is deliberately NOT in the template.
    templates[RELEASE_NOTES_SLUG] =
      `${pageBody}\n${renderRecentReleases(releases)}\n${renderArchiveHost(releases)}`;
    indexed[RELEASE_NOTES_SLUG] =
      `${pageBody}\n${releases.map(renderRelease).join('\n')}`;
  }

  /** @type {Map<string, string>} */
  const files = new Map();

  for (const page of manifest.pages) {
    files.set(
      `pages/docs-${page.slug}.component.html`,
      emitPageTemplate(templates[page.slug] ?? '')
    );
    const component = emitPageComponentTs(page);
    if (component) {
      files.set(`pages/docs-${page.slug}.component.ts`, component);
    }
    if (page.hasStyles) {
      files.set(
        `pages/docs-${page.slug}.component.scss`,
        stylesBySlug.get(page.slug)
      );
    }
  }

  files.set('docs-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  files.set('docs-search-index.json', emitSearchIndexJson(manifest, indexed));
  files.set('docs-figures.ts', emitFiguresTs(manifest, indexed));
  files.set('docs-captures.ts', emitCapturesTs(captures));
  files.set('docs-outline.ts', emitOutlineTs(manifest, templates));
  files.set('release-notes-archive.ts', emitArchiveTs(releases));
  files.set('docs-declarations.ts', emitDeclarationsTs(manifest));
  files.set('docs-manifest.ts', emitManifestTs());
  files.set('docs.routes.ts', emitRoutesTs(manifest));
  files.set('docs.server-routes.ts', emitServerRoutesTs(manifest));

  return { files, manifest, templates };
}

/**
 * Brings `outDir` in line with `files`.
 *
 * @param {string} outDir
 * @param {Map<string, string>} files relative POSIX path -> contents
 * @param {{ check?: boolean }} [options] when checking, nothing is written and
 *   every difference is reported instead
 * @returns {{ written: string[], removed: string[], drift: string[] }}
 */
export function syncOutputs(outDir, files, options = {}) {
  const check = options.check === true;
  const written = [];
  const removed = [];
  const drift = [];

  const existing = new Set(listFiles(outDir));

  for (const relative of orderedPaths(files)) {
    const contents = files.get(relative);
    const target = path.join(outDir, ...relative.split('/'));
    const current = existing.has(relative)
      ? fs.readFileSync(target, 'utf8')
      : null;

    if (current === contents) continue;

    if (check) {
      drift.push(relative);
      continue;
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    writeAtomic(target, contents);
    written.push(relative);
  }

  for (const relative of [...existing].sort()) {
    if (files.has(relative)) continue;
    if (check) {
      drift.push(relative);
      continue;
    }
    fs.rmSync(path.join(outDir, ...relative.split('/')), { force: true });
    removed.push(relative);
  }

  if (!check) pruneEmptyDirectories(outDir);

  return { written, removed, drift: drift.sort() };
}

/** Page files first, then the barrels that import them. */
function orderedPaths(files) {
  const all = [...files.keys()].sort();
  return [
    ...all.filter((name) => !BARRELS.includes(name)),
    ...BARRELS.filter((name) => files.has(name)),
  ];
}

/**
 * Writes through a temporary file in the same directory so a reader — an Angular
 * watch build, a concurrent `--check` — never observes a half-written file.
 */
function writeAtomic(target, contents) {
  const temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, contents);
  fs.renameSync(temp, target);
}

function listFiles(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...listFiles(path.join(dir, entry.name), relative));
    } else if (!entry.name.endsWith('.tmp')) {
      out.push(relative);
    }
  }
  return out.sort();
}

function pruneEmptyDirectories(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = path.join(dir, entry.name);
    pruneEmptyDirectories(child);
    if (fs.readdirSync(child).length === 0) fs.rmdirSync(child);
  }
}
