#!/usr/bin/env node
// Content checks for src/content/docs. Runs in `npm run test:scripts`, so a doc
// that would 404, break a bookmark, or fail the prerender verifier in CI fails
// here first — this is what replaced the old seven-point wiring checklist.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { readDocCaptures, readDocSources } from './docs-build-lib.mjs';
import {
  ANCHORS_JSON,
  CONTENT_DIR,
  RELEASE_NOTES_DIR,
  REPO_ROOT,
} from './docs-paths.mjs';
import { validateDocs } from './docs-validate-lib.mjs';
import {
  captureAssetProblems,
  homeCaptureProblems,
} from './process-captures.lib.mjs';
import { readReleaseSources } from './release-notes-lib.mjs';

/**
 * `/assets/docs/captures/x.webp` -> the bytes committed at `src/assets/...`.
 *
 * Only this script touches the filesystem; docs-validate-lib stays pure so its
 * corpus is whatever a test hands it.
 */
const HOME_CAPTURES_JSON = path.join(
  REPO_ROOT,
  'src',
  'content',
  'home-captures.json'
);
const HOME_TEMPLATE = path.join(
  REPO_ROOT,
  'src',
  'app',
  'home',
  'home.component.html'
);

const readAsset = (publicPath) => {
  const file = path.join(REPO_ROOT, 'src', ...publicPath.split('/'));
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
};

try {
  const sources = readDocSources(CONTENT_DIR);
  const releases = readReleaseSources(RELEASE_NOTES_DIR);
  const anchorBaseline = fs.existsSync(ANCHORS_JSON)
    ? JSON.parse(fs.readFileSync(ANCHORS_JSON, 'utf8'))
    : {};

  const captures = readDocCaptures();

  const problems = [
    ...validateDocs({
      sources,
      releases,
      anchorBaseline,
      captures,
    }),
    ...captureAssetProblems(captures, readAsset).map((message) => ({
      file: 'docs-captures.json',
      message: `docs-captures.json: ${message}`,
    })),
    // The home set writes its assets, its template and its map in one step and
    // nothing else proves they stayed in agreement. The OG image reads the map,
    // so a stale entry ships a social preview pointing at a missing file.
    ...homeCaptureProblems(
      JSON.parse(fs.readFileSync(HOME_CAPTURES_JSON, 'utf8')),
      readAsset,
      fs.readFileSync(HOME_TEMPLATE, 'utf8')
    ).map((message) => ({
      file: 'home-captures.json',
      message: `home-captures.json: ${message}`,
    })),
  ];

  if (problems.length > 0) {
    console.error(`Doc validation failed (${problems.length}):`);
    for (const problem of problems) console.error(`  - ${problem.message}`);
    process.exit(1);
  }

  console.log(
    `Doc validation passed: ${sources.length} pages, ${releases.length} releases.`
  );
} catch (error) {
  console.error(`validate-docs failed — ${error.message}`);
  process.exit(1);
}
