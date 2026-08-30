#!/usr/bin/env node
// Content checks for src/content/docs. Runs in `npm run test:scripts`, so a doc
// that would 404, break a bookmark, or fail the prerender verifier in CI fails
// here first — this is what replaced the old seven-point wiring checklist.

import fs from 'node:fs';
import process from 'node:process';

import { readDocCaptures, readDocSources } from './docs-build-lib.mjs';
import { ANCHORS_JSON, CONTENT_DIR, RELEASE_NOTES_DIR } from './docs-paths.mjs';
import { validateDocs } from './docs-validate-lib.mjs';
import { readReleaseSources } from './release-notes-lib.mjs';

try {
  const sources = readDocSources(CONTENT_DIR);
  const releases = readReleaseSources(RELEASE_NOTES_DIR);
  const anchorBaseline = fs.existsSync(ANCHORS_JSON)
    ? JSON.parse(fs.readFileSync(ANCHORS_JSON, 'utf8'))
    : {};

  const captures = readDocCaptures();

  const problems = validateDocs({
    sources,
    releases,
    anchorBaseline,
    captures,
  });

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
