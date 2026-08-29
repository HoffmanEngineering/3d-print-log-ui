// Frontmatter reader for src/content/docs/*.md.
//
// Deliberately a small, strict subset of YAML rather than a dependency: the docs
// generator runs as plain Node ESM in CI, at deploy, and inside `node --test`, and
// the frontmatter shape is fixed by REQUIRED_FIELDS in scripts/docs-validate-lib.mjs.
// Anything outside the subset is an error, so an unsupported construct fails loudly
// at generation time instead of being read as something the author did not mean.
//
// Supported: `key: scalar`, `key: [a, b]`, block sequences of scalars, and one
// level of nested mapping (used by `constants:`).

const FENCE = /^---\s*$/;

/**
 * @param {string} raw full file contents
 * @returns {{ data: Record<string, unknown>, body: string }}
 */
export function parseFrontmatter(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');

  if (!FENCE.test(lines[0] ?? '')) {
    throw new Error('Document must open with a `---` frontmatter fence.');
  }

  const close = lines.findIndex((line, i) => i > 0 && FENCE.test(line));
  if (close === -1) {
    throw new Error('Unterminated frontmatter: no closing `---` fence.');
  }

  return {
    data: parseBlock(lines.slice(1, close), 0),
    body: lines
      .slice(close + 1)
      .join('\n')
      .replace(/^\n+/, ''),
  };
}

/**
 * Parses one indentation level of a mapping.
 *
 * @param {string[]} lines
 * @param {number} indent expected indentation of keys at this level
 */
function parseBlock(lines, indent) {
  /** @type {Record<string, unknown>} */
  const out = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      i += 1;
      continue;
    }

    const depth = line.length - line.trimStart().length;
    if (depth !== indent) {
      throw new Error(`Unexpected indentation in frontmatter: "${line}"`);
    }

    const match = /^([A-Za-z_][A-Za-z0-9_-]*):(.*)$/.exec(line.trim());
    if (!match) {
      throw new Error(`Cannot parse frontmatter line: "${line}"`);
    }

    const [, key, rest] = match;
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      throw new Error(`Duplicate key in frontmatter: "${key}"`);
    }

    const inline = rest.trim();
    if (inline !== '') {
      out[key] = parseScalarOrFlow(inline);
      assertSequence(key, out[key]);
      i += 1;
      continue;
    }

    // A bare `key:` introduces a block sequence, a nested mapping, or nothing.
    const child = [];
    i += 1;
    while (i < lines.length) {
      const next = lines[i];
      if (isBlank(next)) {
        child.push(next);
        i += 1;
        continue;
      }
      const nextDepth = next.length - next.trimStart().length;
      if (nextDepth <= indent) break;
      child.push(next);
      i += 1;
    }

    const meaningful = child.filter((l) => !isBlank(l));
    if (meaningful.length === 0) {
      out[key] = null;
    } else if (meaningful[0].trimStart().startsWith('- ')) {
      out[key] = meaningful.map((l) => parseScalar(l.trimStart().slice(2).trim()));
    } else {
      const childIndent =
        meaningful[0].length - meaningful[0].trimStart().length;
      out[key] = parseBlock(meaningful, childIndent);
    }

    assertSequence(key, out[key]);
  }

  return out;
}

function isBlank(line) {
  return line === undefined || line.trim() === '';
}

// Fields the generator iterates. A bare scalar here is the worst kind of typo:
// `aliases: old` parses fine, and every downstream `for...of` then walks the
// string character by character, minting /docs/o, /docs/l and /docs/d.
const SEQUENCE_KEYS = new Set(['aliases', 'related']);

function assertSequence(key, value) {
  if (!SEQUENCE_KEYS.has(key) || value === null || Array.isArray(value)) return;
  throw new Error(
    `Frontmatter field ${key} must be a sequence: write "${key}: [${value}]" or a block list.`
  );
}

function parseScalarOrFlow(text) {
  if (text.startsWith('[')) {
    if (!text.endsWith(']')) {
      throw new Error(`Unterminated flow sequence in frontmatter: "${text}"`);
    }
    const inner = text.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((part) => parseScalar(part.trim()));
  }
  return parseScalar(text);
}

function parseScalar(text) {
  // A quoted scalar may still carry a trailing comment. Find the closing quote
  // first, then ignore everything after it -- checking `endsWith` instead left
  // `title: "My title" # note` quoted, and the quotes reached the page <title>.
  const quoted = /^(['"])((?:[^\\]|\\.)*?)\1\s*(?:#.*)?$/.exec(text);
  if (quoted) {
    const quote = quoted[1];
    const inner = quoted[2];
    // YAML escapes a literal quote inside a single-quoted scalar by doubling it.
    return quote === "'" ? inner.replace(/''/g, "'") : inner;
  }

  // An unquoted scalar ends at a ` #` comment. Quote the value to keep a `#`.
  const value = text.replace(/\s+#.*$/, '').trim();

  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~' || value === '') return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d*\.\d+$/.test(value)) return Number(value);

  return value;
}
