#!/usr/bin/env node
// Incremental `strictNullChecks` gate (issue #98).
//
// TypeScript has no per-directory strictness, and a tsconfig that *includes*
// only one directory still pulls every transitively-imported file into the
// program and reports errors for it. Measured on this repo: a core/-only
// include reports 253 errors, of which only 124 are actually in core/.
//
// So the gate compiles the whole app with strictNullChecks on and then keeps
// only the diagnostics under STRICT_DIRECTORIES. Directories graduate onto that
// list one PR at a time, which makes widening it a deliberate, reviewed change
// the same way `preload-route-matrix.spec.ts` pins the preload list.

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

/**
 * Directories that must be free of strictNullChecks errors. Add one per PR and
 * fix its fallout in the same change; never add a directory you have not fixed.
 */
export const STRICT_DIRECTORIES = ['src/app/core/'];

/** Matches the `path/to/file.ts(12,34): error TS2531: ...` form tsc emits. */
const DIAGNOSTIC = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;

export function parseDiagnostics(stdout) {
  const diagnostics = [];

  for (const line of stdout.split(/\r?\n/)) {
    const match = DIAGNOSTIC.exec(line.trim());
    if (!match) {
      continue;
    }

    const [, file, lineNo, column, code, message] = match;
    diagnostics.push({
      file: file.replace(/\\/g, '/'),
      line: Number(lineNo),
      column: Number(column),
      code,
      message,
    });
  }

  return diagnostics;
}

export function isGated(file, directories = STRICT_DIRECTORIES) {
  const normalized = file.replace(/\\/g, '/');
  return directories.some((directory) => normalized.includes(directory));
}

export function selectGatedDiagnostics(
  stdout,
  directories = STRICT_DIRECTORIES
) {
  return parseDiagnostics(stdout).filter((diagnostic) =>
    isGated(diagnostic.file, directories)
  );
}

function runTsc() {
  try {
    execFileSync(
      process.execPath,
      [
        path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
        '-p',
        path.join(repoRoot, 'tsconfig.strict.json'),
      ],
      { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    return '';
  } catch (error) {
    // tsc exits non-zero whenever it reports anything, including errors outside
    // the gated directories, so a non-zero exit is expected and not itself a
    // failure. Only the filtered diagnostics decide the outcome.
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
}

function main() {
  const output = runTsc();
  const all = parseDiagnostics(output);
  const gated = all.filter((diagnostic) => isGated(diagnostic.file));

  if (gated.length === 0) {
    console.log(
      `strictNullChecks gate clean for ${STRICT_DIRECTORIES.join(', ')} ` +
        `(${all.length} error(s) remain outside the gate).`
    );
    return;
  }

  console.error(
    `strictNullChecks gate failed: ${gated.length} error(s) in ${STRICT_DIRECTORIES.join(', ')}\n`
  );
  for (const diagnostic of gated) {
    console.error(
      `  ${diagnostic.file}:${diagnostic.line}:${diagnostic.column} ` +
        `${diagnostic.code}: ${diagnostic.message}`
    );
  }
  console.error(
    '\nFix these rather than widening the gate. See issue #98 for the staging plan.'
  );
  process.exitCode = 1;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main();
}
