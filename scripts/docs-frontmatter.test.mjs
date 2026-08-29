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
