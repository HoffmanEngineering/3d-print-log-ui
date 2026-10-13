import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'src');

// Build output, regenerated from sources this test already covers.
const SKIP_DIRS = new Set([join(src, 'app', 'documentation', 'generated')]);
const EXTENSIONS = ['.scss', '.css', '.ts', '.html'];

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(path)) yield* sourceFiles(path);
    } else if (EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      yield path;
    }
  }
}

// src/styles/theme.scss builds an M2 theme, which emits no Material 3 --mat-sys-* system
// tokens. Reading one therefore resolves to its fallback (a light-theme value, so
// it stays light in dark mode) or to nothing, dropping the declaration (#269, #270). Use
// the theme-aware --app-* tokens defined in theme.scss, or --mat-divider-color.
test('no stylesheet reads a --mat-sys-* token the M2 theme never defines', () => {
  const uses = [];
  for (const file of sourceFiles(src)) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (/var\(\s*--mat-sys-/.test(line)) {
          uses.push(`${relative(root, file)}:${i + 1}: ${line.trim()}`);
        }
      });
  }
  assert.deepEqual(uses, []);
});
