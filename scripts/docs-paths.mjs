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

/**
 * The What's New dialog's shorter take on a release, named `<version>.md` like
 * the release it summarises. Optional: a release without one (usually a patch)
 * is on the page and lights the unread indicator, but never opens the dialog.
 *
 * A subdirectory, so readReleaseSources (which reads only the `.md` files
 * directly in RELEASE_NOTES_DIR) never mistakes one for a release.
 */
export const RELEASE_DIALOG_DIR = path.join(RELEASE_NOTES_DIR, 'dialog');

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

/**
 * The site-wide llms.txt. Hand-written and shipped as-is; the docs generator
 * also republishes it as `/llms.md` (#211).
 */
export const LLMS_TXT = path.join(REPO_ROOT, 'src', 'llms.txt');
