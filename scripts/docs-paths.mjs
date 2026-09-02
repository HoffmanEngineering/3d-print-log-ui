// Where the docs pipeline reads from and writes to. Shared by the generator, the
// validator, and marketing-routes.mjs so a path change lands in one place.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(HERE, '..');

/** Authored Markdown, one file per page, plus optional sibling `<slug>.scss`. */
export const CONTENT_DIR = path.join(REPO_ROOT, 'src', 'content', 'docs');

/**
 * Authored Markdown, one file per release, named `<version>.md`.
 *
 * Deliberately NOT under CONTENT_DIR: readDocSources treats every `.md` there as
 * a doc page and would mint 99 routes. These are fragments of one page.
 */
export const RELEASE_NOTES_DIR = path.join(
  REPO_ROOT,
  'src',
  'content',
  'release-notes'
);

/** Generated Angular sources and data artifacts. Gitignored. */
export const GENERATED_DIR = path.join(
  REPO_ROOT,
  'src',
  'app',
  'documentation',
  'generated'
);

/** The canonical generated artifact, read directly by the .mjs scripts. */
export const MANIFEST_JSON = path.join(GENERATED_DIR, 'docs-manifest.json');

/**
 * Anchor ids that have already been published. Checked in, not generated: it is
 * the record of what the outside world may have bookmarked.
 */
export const ANCHORS_JSON = path.join(
  REPO_ROOT,
  'src',
  'content',
  'docs-anchors.json'
);

/**
 * `name -> { light, dark }` for every generated documentation figure, written by
 * scripts/process-captures.mjs and checked in beside the assets it describes.
 *
 * Checked in for the same reason the assets are: `docs:generate` runs on every
 * build, and a build must not depend on a Cypress run having happened.
 */
export const DOC_CAPTURES_JSON = path.join(
  REPO_ROOT,
  'src',
  'content',
  'docs-captures.json'
);
