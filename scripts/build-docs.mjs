#!/usr/bin/env node
// Generates the /docs Angular sources and data artifacts from src/content/docs.
//
//   npm run docs:generate            write the generated tree
//   npm run docs:generate -- --check exit non-zero if the tree is out of date
//   npm run docs:generate -- --watch regenerate as Markdown changes
//   … --watch --then <cmd> [args]    generate, start watching, then run <cmd>
//
// `--then` exists so `npm start` can guarantee ordering without a shell-specific
// `&`: generation is synchronous and completes before the child is spawned, so
// Angular never creates its initial program against a half-written route graph.
//
// Generation is NOT wired through npm `pre*` hooks: those are script-name
// specific, so `prestart` would not fire for `start:e2e` and `prebuild` would not
// fire for `build:dev`. Every entry point calls this script by name instead.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';

import {
  planOutputs,
  readDocCaptures,
  readDocSources,
  syncOutputs,
} from './docs-build-lib.mjs';
import {
  CONTENT_DIR,
  GENERATED_DIR,
  RELEASE_NOTES_DIR,
} from './docs-paths.mjs';
import { readReleaseSources } from './release-notes-lib.mjs';

const argv = process.argv.slice(2);
const thenAt = argv.indexOf('--then');
const args = thenAt === -1 ? argv : argv.slice(0, thenAt);
const thenCommand = thenAt === -1 ? [] : argv.slice(thenAt + 1);

const check = args.includes('--check');
const watch = args.includes('--watch');
const quiet = args.includes('--quiet');

function generate() {
  const sources = readDocSources(CONTENT_DIR);
  const releases = readReleaseSources(RELEASE_NOTES_DIR);
  const { files } = planOutputs(sources, releases, readDocCaptures());
  return syncOutputs(GENERATED_DIR, files, { check });
}

function run() {
  const result = generate();

  if (check) {
    if (result.drift.length > 0) {
      console.error(
        'Generated docs are out of date. Run `npm run docs:generate`.\n' +
          result.drift.map((f) => `  - ${f}`).join('\n')
      );
      process.exit(1);
    }
    if (!quiet) console.log('Generated docs are up to date.');
    return;
  }

  if (!quiet) {
    console.log(
      `Generated docs: ${result.written.length} written, ${result.removed.length} removed.`
    );
  }
}

try {
  run();
} catch (error) {
  console.error(`docs:generate failed — ${error.message}`);
  process.exit(1);
}

if (watch) {
  console.log(`Watching ${CONTENT_DIR} and ${RELEASE_NOTES_DIR} for changes…`);
  let pending = null;
  const onChange = () => {
    // Editors save in several steps; coalesce so a half-written file is never
    // the thing that gets compiled.
    clearTimeout(pending);
    pending = setTimeout(() => {
      try {
        const result = generate();
        if (result.written.length || result.removed.length) {
          console.log(
            `docs:generate — ${result.written.length} written, ${result.removed.length} removed.`
          );
        }
      } catch (error) {
        console.error(`docs:generate failed — ${error.message}`);
      }
    }, 50);
  };

  // Two watchers, one debounce. The release notes are a sibling directory, not a
  // subtree of CONTENT_DIR, so a single recursive watch would not see them.
  for (const dir of [CONTENT_DIR, RELEASE_NOTES_DIR]) {
    if (fs.existsSync(dir)) fs.watch(dir, { recursive: true }, onChange);
  }
}

if (thenCommand.length > 0) {
  const child = spawn(thenCommand[0], thenCommand.slice(1), {
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}
