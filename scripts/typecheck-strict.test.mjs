import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STRICT_DIRECTORIES,
  isGated,
  parseDiagnostics,
  selectGatedDiagnostics,
} from './typecheck-strict.mjs';

const SAMPLE = [
  "src/app/core/services/auth.service.ts(42,11): error TS2531: Object is possibly 'null'.",
  "src/app/print/print-list/print-list.component.ts(88,3): error TS2322: Type 'string | null' is not assignable to type 'string'.",
  'src/app/core/stores/new-print-store.service.ts(7,5): error TS18048: Something is possibly undefined.',
  'Found 3 errors in 3 files.',
  '',
].join('\n');

test('parseDiagnostics extracts file, position, code and message', () => {
  const diagnostics = parseDiagnostics(SAMPLE);

  assert.equal(diagnostics.length, 3);
  assert.deepEqual(diagnostics[0], {
    file: 'src/app/core/services/auth.service.ts',
    line: 42,
    column: 11,
    code: 'TS2531',
    message: "Object is possibly 'null'.",
  });
});

test('parseDiagnostics ignores summary and blank lines', () => {
  assert.deepEqual(parseDiagnostics('Found 3 errors in 3 files.\n\n'), []);
});

test('parseDiagnostics normalizes Windows path separators', () => {
  const diagnostics = parseDiagnostics(
    "src\\app\\core\\services\\auth.service.ts(1,1): error TS2531: Object is possibly 'null'."
  );

  assert.equal(diagnostics[0].file, 'src/app/core/services/auth.service.ts');
});

test('selectGatedDiagnostics keeps only errors inside the gated directories', () => {
  const gated = selectGatedDiagnostics(SAMPLE);

  assert.equal(gated.length, 2);
  assert.ok(
    gated.every((diagnostic) => diagnostic.file.includes('src/app/core/'))
  );
});

test('selectGatedDiagnostics drops errors that bleed in from ungated directories', () => {
  const gated = selectGatedDiagnostics(SAMPLE);

  assert.ok(
    !gated.some((diagnostic) => diagnostic.file.includes('src/app/print/')),
    'print/ is not on the gate yet, so its errors must not fail the build'
  );
});

test('isGated matches a directory regardless of path prefix', () => {
  assert.ok(isGated('src/app/core/services/auth.service.ts'));
  assert.ok(isGated('D:/repo/src/app/core/services/auth.service.ts'));
  assert.ok(!isGated('src/app/filament/filament-detail.component.ts'));
});

test('the gate starts at core/ only', () => {
  assert.deepEqual(STRICT_DIRECTORIES, ['src/app/core/']);
});
