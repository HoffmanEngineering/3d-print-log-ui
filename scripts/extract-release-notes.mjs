#!/usr/bin/env node
// Print the GitHub Release body for a version, taken from the in-app release
// notes component. Thin I/O wrapper -- all parsing lives in release-notes-lib.mjs.
//
//   node scripts/extract-release-notes.mjs v1.47.0
//   node scripts/extract-release-notes.mjs v1.47.0 --title
//
// Exits non-zero when the version has no section, so a deploy fails loudly
// rather than publishing an empty release.

import { readFileSync } from 'node:fs';
import { extractReleaseNotes } from './release-notes-lib.mjs';

const NOTES_PATH =
  'src/app/documentation/docs/docs-release-notes/docs-release-notes.component.html';

const args = process.argv.slice(2);
const wantTitle = args.includes('--title');
const version = args.find((a) => !a.startsWith('--'));

if (!version) {
  console.error(
    'usage: node scripts/extract-release-notes.mjs <version> [--title]'
  );
  process.exit(2);
}

try {
  const release = extractReleaseNotes(
    readFileSync(NOTES_PATH, 'utf8'),
    version
  );
  process.stdout.write(
    wantTitle ? `${release.title}\n` : `${release.markdown}\n`
  );
} catch (error) {
  console.error(`extract-release-notes: ${error.message}`);
  process.exit(1);
}
