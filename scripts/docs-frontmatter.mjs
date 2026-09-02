// Frontmatter reader for src/content/docs/*.md.
//
// Deliberately a small, strict subset of YAML rather than a dependency: the docs
// generator runs as plain Node ESM in CI, at deploy, and inside `node --test`, and
// the frontmatter shape is fixed by REQUIRED_FIELDS in scripts/docs-validate-lib.mjs.
// Anything outside the subset is an error, so an unsupported construct fails loudly
// at generation time instead of being read as something the author did not mean.
//
// Supported: `key: scalar`, `key: [a, b]` (on one line or split over several,
// which is how prettier formats a long one), block sequences of scalars, and
// nested mappings (used by `constants:` and `movedAnchors:`).

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
    } else if (meaningful[0].trimStart().startsWith('[')) {
      // Prettier rewrites any flow sequence too long for the print width into a
      // multi-line bracketed form, at whatever nesting depth it sits. The value
      // is one sequence spread over several lines, so rejoin it before parsing.
      out[key] = parseScalarOrFlow(
        meaningful.map((l) => l.trim()).join(' ')
      );
    } else if (meaningful[0].trimStart().startsWith('- ')) {
      // Every line must carry its own dash. Deciding from the first line and
      // then slicing two characters off the rest turned a forgotten dash into a
      // truncated value: `typo` became `po`, and generated a /docs/po redirect.
      out[key] = meaningful.map((l) => {
        const item = l.trimStart();
        if (!item.startsWith('- ')) {
          throw new Error(
            `Frontmatter sequence item must start with "- ": "${l.trim()}"`
          );
        }
        return parseScalar(item.slice(2).trim());
      });
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
const SEQUENCE_KEYS = new Set(['aliases', 'related', 'highlights']);

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
    // A trailing comma is legal YAML and is what prettier writes when it splits
    // a sequence over several lines; without this the last part parses to null.
    const inner = text.slice(1, -1).trim().replace(/,$/, '').trim();
    if (inner === '') return [];
    return splitFlow(inner).map((part) => parseScalar(part.trim()));
  }
  return parseScalar(text);
}

// A comma inside a quoted scalar is data, not a separator.
function splitFlow(inner) {
  const parts = [];
  let current = '';
  let quote = null;

  for (const ch of inner) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ',') {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

function parseScalar(text) {
  // A quoted scalar may still carry a trailing comment. Find the closing quote
  // first, then ignore everything after it -- checking `endsWith` instead left
  // `title: "My title" # note` quoted, and the quotes reached the page <title>.
  //
  // The two quote styles escape differently, and conflating them corrupts real
  // values: inside single quotes a backslash is literal and a quote is escaped
  // by doubling it; inside double quotes a backslash escapes the next character.
  const single = /^'((?:[^']|'')*)'\s*(?:#.*)?$/.exec(text);
  if (single) {
    return single[1].replace(/''/g, "'");
  }

  const double = /^"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/.exec(text);
  if (double) {
    return double[1].replace(/\\(.)/g, '$1');
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
