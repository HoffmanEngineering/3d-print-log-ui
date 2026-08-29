import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { planOutputs, readDocSources, syncOutputs } from './docs-build-lib.mjs';

const SOURCE = [
  '---',
  'slug: prints',
  'title: Tracking Prints | 3D Print Log Docs',
  'description: Log every 3D print with photos, filament usage, print time, and settings today.',
  'navLabel: Prints',
  'group: features',
  'order: 10',
  'mode: how-to',
  'updated: 2026-08-28',
  '---',
  '',
  '## Prints',
  '',
  'Log a print.',
  '',
].join('\n');

function tempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-build-'));
  test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function withSources(files) {
  const dir = tempDir();
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), body);
  }
  return dir;
}

test('reads every Markdown file in the content directory', () => {
  const dir = withSources({ 'prints.md': SOURCE, 'notes.txt': 'ignored' });
  const sources = readDocSources(dir);

  assert.equal(sources.length, 1);
  assert.equal(sources[0].slug, 'prints');
  assert.match(sources[0].body, /## Prints/);
});

test('rejects a file whose slug does not match its filename', () => {
  const dir = withSources({ 'materials.md': SOURCE });
  assert.throws(() => readDocSources(dir), /materials\.md.*slug "prints"/s);
});

test('reads sources in a stable order regardless of directory listing', () => {
  const dir = withSources({
    'prints.md': SOURCE,
    'about.md': SOURCE.replace('slug: prints', 'slug: about')
      .replace('navLabel: Prints', 'navLabel: About')
      .replace('group: features', 'group: about'),
  });

  assert.deepEqual(
    readDocSources(dir).map((s) => s.slug),
    ['about', 'prints']
  );
});

test('plans a component, a template, and the shared projections', () => {
  const { files } = planOutputs(readDocSources(withSources({ 'prints.md': SOURCE })));
  const names = [...files.keys()].sort();

  assert.deepEqual(names, [
    'docs-declarations.ts',
    'docs-figures.ts',
    'docs-manifest.json',
    'docs-manifest.ts',
    'docs-search-index.json',
    'docs.routes.ts',
    'docs.server-routes.ts',
    'pages/docs-prints.component.html',
    'pages/docs-prints.component.ts',
  ]);
});

test('plans no component file for a page that supplies its own', () => {
  const source = SOURCE.replace(
    'mode: how-to',
    ['mode: how-to', 'component:', '  className: DocsPrintsComponent', '  path: ../docs/x'].join('\n')
  );
  const { files } = planOutputs(readDocSources(withSources({ 'prints.md': source })));

  assert.ok(!files.has('pages/docs-prints.component.ts'));
  assert.ok(files.has('pages/docs-prints.component.html'));
});

test('planning is deterministic: the same sources produce identical bytes', () => {
  const dir = withSources({ 'prints.md': SOURCE });
  const a = planOutputs(readDocSources(dir)).files;
  const b = planOutputs(readDocSources(dir)).files;

  assert.deepEqual([...a.entries()], [...b.entries()]);
});

test('the planned manifest JSON round-trips to the pages it described', () => {
  const { files, manifest } = planOutputs(
    readDocSources(withSources({ 'prints.md': SOURCE }))
  );
  const parsed = JSON.parse(files.get('docs-manifest.json'));

  assert.deepEqual(
    parsed.pages.map((p) => p.path),
    manifest.pages.map((p) => p.path)
  );
});

test('syncOutputs writes the planned files', () => {
  const out = tempDir();
  const result = syncOutputs(out, new Map([['a/b.ts', 'x\n']]));

  assert.equal(fs.readFileSync(path.join(out, 'a', 'b.ts'), 'utf8'), 'x\n');
  assert.deepEqual(result.written, ['a/b.ts']);
});

test('syncOutputs rewrites only the files whose contents changed', () => {
  const out = tempDir();
  syncOutputs(out, new Map([['a.ts', 'x\n'], ['b.ts', 'y\n']]));

  const result = syncOutputs(out, new Map([['a.ts', 'x\n'], ['b.ts', 'CHANGED\n']]));

  assert.deepEqual(result.written, ['b.ts']);
});

test('syncOutputs deletes a generated file whose source is gone', () => {
  const out = tempDir();
  syncOutputs(out, new Map([['a.ts', 'x\n'], ['stale.ts', 'y\n']]));

  const result = syncOutputs(out, new Map([['a.ts', 'x\n']]));

  assert.deepEqual(result.removed, ['stale.ts']);
  assert.equal(fs.existsSync(path.join(out, 'stale.ts')), false);
});

test('syncOutputs removes a directory left empty by cleaning', () => {
  const out = tempDir();
  syncOutputs(out, new Map([['pages/gone.ts', 'y\n'], ['a.ts', 'x\n']]));

  syncOutputs(out, new Map([['a.ts', 'x\n']]));

  assert.equal(fs.existsSync(path.join(out, 'pages')), false);
});

test('check mode reports drift without touching the filesystem', () => {
  const out = tempDir();
  syncOutputs(out, new Map([['a.ts', 'x\n']]));

  const result = syncOutputs(out, new Map([['a.ts', 'CHANGED\n']]), { check: true });

  assert.deepEqual(result.drift, ['a.ts']);
  assert.equal(fs.readFileSync(path.join(out, 'a.ts'), 'utf8'), 'x\n');
});

test('check mode reports a missing output as drift', () => {
  const out = tempDir();
  const result = syncOutputs(out, new Map([['a.ts', 'x\n']]), { check: true });

  assert.deepEqual(result.drift, ['a.ts']);
});

test('check mode reports a stale output as drift', () => {
  const out = tempDir();
  syncOutputs(out, new Map([['a.ts', 'x\n'], ['stale.ts', 'y\n']]));

  const result = syncOutputs(out, new Map([['a.ts', 'x\n']]), { check: true });

  assert.deepEqual(result.drift, ['stale.ts']);
  assert.equal(fs.existsSync(path.join(out, 'stale.ts')), true);
});

test('check mode reports no drift when the tree already matches', () => {
  const out = tempDir();
  const files = new Map([['a.ts', 'x\n'], ['pages/b.ts', 'y\n']]);
  syncOutputs(out, files);

  assert.deepEqual(syncOutputs(out, files, { check: true }).drift, []);
});

test('the route barrels are written after the files they import', () => {
  // Angular seeds its compile graph from these barrels; a barrel that lands
  // before its page component would point the builder at a file that is not
  // there yet.
  const out = tempDir();
  const { files } = planOutputs(readDocSources(withSources({ 'prints.md': SOURCE })));

  const order = syncOutputs(out, files).written;

  assert.ok(
    order.indexOf('pages/docs-prints.component.ts') < order.indexOf('docs.routes.ts'),
    `barrel written too early: ${order.join(', ')}`
  );
  assert.ok(order.indexOf('docs-manifest.json') < order.indexOf('docs-manifest.ts'));
});

test('a stylesheet beside the Markdown is copied next to the generated component', () => {
  const dir = withSources({ 'prints.md': SOURCE, 'prints.scss': ':host { color: red; }\n' });
  const { files } = planOutputs(readDocSources(dir));

  assert.equal(
    files.get('pages/docs-prints.component.scss'),
    ':host { color: red; }\n'
  );
});

test('a page with no stylesheet produces no stylesheet output', () => {
  const { files } = planOutputs(readDocSources(withSources({ 'prints.md': SOURCE })));
  assert.ok(!files.has('pages/docs-prints.component.scss'));
});

test('a hand-written component keeps its own stylesheet rather than a copy', () => {
  const source = SOURCE.replace(
    'mode: how-to',
    ['mode: how-to', 'component:', '  className: DocsPrintsComponent', '  path: ../docs/x'].join('\n')
  );
  const { files } = planOutputs(
    readDocSources(withSources({ 'prints.md': source, 'prints.scss': 'x\n' }))
  );

  assert.ok(!files.has('pages/docs-prints.component.scss'));
});
