import assert from 'node:assert/strict';
import test from 'node:test';

import { parseFrontmatter } from './docs-frontmatter.mjs';

test('splits YAML frontmatter from the Markdown body', () => {
  const { data, body } = parseFrontmatter(
    ['---', 'slug: prints', '---', '', '# Prints', ''].join('\n')
  );

  assert.deepEqual(data, { slug: 'prints' });
  assert.equal(body, '# Prints\n');
});

test('rejects a file that does not open with a frontmatter fence', () => {
  assert.throws(() => parseFrontmatter('# Prints\n'), /frontmatter/i);
});

test('rejects a frontmatter block that is never closed', () => {
  assert.throws(() => parseFrontmatter('---\nslug: prints\n'), /unterminated/i);
});

test('reads a flow sequence into an array of strings', () => {
  const { data } = parseFrontmatter(
    ['---', 'related: [projects, materials]', 'aliases: []', '---', ''].join(
      '\n'
    )
  );

  assert.deepEqual(data.related, ['projects', 'materials']);
  assert.deepEqual(data.aliases, []);
});

test('reads a block sequence into an array of strings', () => {
  const { data } = parseFrontmatter(
    ['---', 'related:', '  - projects', '  - materials', '---', ''].join('\n')
  );

  assert.deepEqual(data.related, ['projects', 'materials']);
});

test('reads a nested mapping into an object', () => {
  const { data } = parseFrontmatter(
    [
      '---',
      'constants:',
      '  mcpEndpoint: https://api.3dprintlog.com/mcp',
      '  mcpClientId: abc123',
      '---',
      '',
    ].join('\n')
  );

  assert.deepEqual(data.constants, {
    mcpEndpoint: 'https://api.3dprintlog.com/mcp',
    mcpClientId: 'abc123',
  });
});

test('keeps a quoted scalar verbatim, including its colon', () => {
  const { data } = parseFrontmatter(
    ['---', "title: 'Prints: a guide'", 'description: "a #1 pick"', '---', ''].join('\n')
  );

  assert.equal(data.title, 'Prints: a guide');
  assert.equal(data.description, 'a #1 pick');
});

test('strips a trailing comment from an unquoted scalar', () => {
  const { data } = parseFrontmatter(
    ['---', 'order: 10 # sort key', '---', ''].join('\n')
  );

  assert.equal(data.order, 10);
});

test('reads numbers, booleans and dates as their natural types', () => {
  const { data } = parseFrontmatter(
    ['---', 'order: 10', 'draft: true', 'updated: 2026-08-28', '---', ''].join(
      '\n'
    )
  );

  assert.equal(data.order, 10);
  assert.equal(data.draft, true);
  assert.equal(data.updated, '2026-08-28');
});

test('rejects a duplicate key rather than silently keeping the last one', () => {
  assert.throws(
    () => parseFrontmatter('---\nslug: a\nslug: b\n---\n'),
    /duplicate key/i
  );
});

test('tolerates CRLF line endings', () => {
  const { data, body } = parseFrontmatter(
    '---\r\nslug: prints\r\n---\r\n\r\n# Prints\r\n'
  );

  assert.equal(data.slug, 'prints');
  assert.equal(body, '# Prints\n');
});

// --- findings from the adversarial review -----------------------------------

// The quote branch ran before comment stripping, so a trailing comment left the
// quotes in the value and shipped them into the page <title>.
test('strips a trailing comment from a quoted scalar', () => {
  const { data } = parseFrontmatter('---\ntitle: "My title" # note\n---\nBody\n');

  assert.equal(data.title, 'My title');
});

test('keeps a # that is inside a quoted scalar', () => {
  const { data } = parseFrontmatter('---\ntitle: "Colors # and more"\n---\nBody\n');

  assert.equal(data.title, 'Colors # and more');
});

// `aliases: old` used to parse as the string "old", which every downstream
// `for...of` then walked character by character, generating /docs/o, /docs/l
// and /docs/d as redirect routes.
test('rejects a sequence field written as a bare scalar', () => {
  assert.throws(
    () => parseFrontmatter('---\naliases: old\n---\nBody\n'),
    /aliases must be a sequence/
  );
});

test('accepts a sequence field in flow form', () => {
  const { data } = parseFrontmatter('---\naliases: [old, legacy]\n---\nBody\n');

  assert.deepEqual(data.aliases, ['old', 'legacy']);
});

test('accepts a sequence field in block form', () => {
  const { data } = parseFrontmatter('---\naliases:\n  - old\n  - legacy\n---\nBody\n');

  assert.deepEqual(data.aliases, ['old', 'legacy']);
});

// The block-sequence branch decided from the first line alone, then sliced two
// characters off every line that followed -- so a missing dash silently became
// a truncated value ("typo" -> "po") and generated a /docs/po redirect.
test('rejects a block sequence line missing its dash', () => {
  assert.throws(
    () => parseFrontmatter('---\naliases:\n  - legacy\n  typo\n---\nBody\n'),
    /must start with "- "/
  );
});

// A flow sequence was split on every comma, including one inside a quoted
// scalar.
test('splits a flow sequence only outside quotes', () => {
  const { data } = parseFrontmatter('---\nrelated: ["Smith, Jr.", other]\n---\nBody\n');

  assert.deepEqual(data.related, ['Smith, Jr.', 'other']);
});

// YAML escape rules differ by quote style: a backslash is literal inside single
// quotes and an escape inside double quotes.
test('decodes a double-quoted escape', () => {
  const { data } = parseFrontmatter('---\ntitle: "Say \\"hello\\""\n---\nBody\n');

  assert.equal(data.title, 'Say "hello"');
});

test('keeps a backslash literal inside a single-quoted scalar', () => {
  const { data } = parseFrontmatter("---\ntitle: 'C:\docs'\n---\nBody\n");

  assert.equal(data.title, 'C:\docs');
});
