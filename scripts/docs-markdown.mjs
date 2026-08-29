// Markdown -> Angular template renderer for src/content/docs/*.md.
//
// The output is an Angular template, not inert HTML: `routerLink`, `<mat-icon>`,
// `<youtube-player>` and `{{ interpolation }}` must survive to AOT. So inline text
// is NOT HTML-escaped — docs Markdown is trusted repo content, and validate-docs.mjs
// gates which elements may appear. Only code spans and plain fences are escaped.
//
// Two rules exist to protect deep links and directives:
//   * Headings never get a derived id. Anchors are contractual (docs-anchors.json);
//     a slugger would re-mint every published id under its own algorithm.
//   * A ```angular-html fence and a raw HTML block pass through byte for byte.

// Code spans are lifted out before inline Markdown runs and put back afterwards.
// The placeholder is a NUL sentinel: it cannot occur in authored Markdown, so it
// can never collide with real prose the way a punctuation marker would.
const SPAN_MARK = String.fromCharCode(0);
const SPAN_PATTERN = new RegExp(SPAN_MARK + '([0-9]+)' + SPAN_MARK, 'g');

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
 * @param {string} markdown body text, frontmatter already stripped
 * @returns {string} an Angular template
 */
export function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  return renderBlocks(lines, 0).join('\n');
}

/**
 * @param {string} template rendered Angular template
 * @returns {string[]} every `id` attribute value, in document order, deduped
 */
export function extractAnchors(template) {
  const ids = [];
  for (const match of template.matchAll(ID_PATTERN)) {
    const id = match[1] ?? match[2];
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/**
 * An `id` attribute in either quote style. Raw HTML blocks pass through
 * verbatim, so a single-quoted id reaches the template unchanged — and an
 * anchor the extractor cannot see is one the contract cannot protect.
 */
export const ID_PATTERN = /\sid="([^"]+)"|\sid='([^']+)'/g;

/**
 * Renders a run of lines that all sit at `indent` columns or deeper.
 *
 * @param {string[]} lines
 * @param {number} indent
 * @returns {string[]} block-level output fragments
 */
function renderBlocks(lines, indent) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const body = line.slice(indent);

    // Fenced code. An `angular-html` fence is passthrough; anything else is a
    // literal sample and gets escaped.
    const fence = /^(`{3,})\s*([A-Za-z0-9_-]*)\s*$/.exec(body.trim());
    if (fence) {
      const [, ticks, lang] = fence;
      const content = [];
      i += 1;
      while (i < lines.length && lines[i].slice(indent).trim() !== ticks) {
        content.push(lines[i].slice(indent));
        i += 1;
      }
      if (i >= lines.length) {
        throw new Error(`Unterminated code fence opened with \`${ticks}\`.`);
      }
      i += 1; // closing fence
      out.push(
        lang === 'angular-html'
          ? content.join('\n')
          : `<pre><code>${escapeHtml(content.join('\n'))}</code></pre>`
      );
      continue;
    }

    if (/^-{3,}\s*$/.test(body.trim())) {
      out.push('<hr />');
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(body);
    if (heading) {
      const level = heading[1].length;
      let text = heading[2].trim();
      let id = '';
      const explicit = /^(.*?)\s*\{#([^}\s]+)\}$/.exec(text);
      if (explicit) {
        text = explicit[1].trim();
        id = ` id="${explicit[2]}"`;
      }
      out.push(`<h${level}${id}>${renderInline(text)}</h${level}>`);
      i += 1;
      continue;
    }

    if (body.startsWith('<!--')) {
      const { block, next } = takeComment(lines, i, indent);
      out.push(block);
      i = next;
      continue;
    }

    if (isRawHtmlStart(body)) {
      const { block, next } = takeRawHtml(lines, i, indent);
      out.push(block);
      i = next;
      continue;
    }

    if (listMarker(body)) {
      const { block, next } = takeList(lines, i, indent);
      out.push(block);
      i = next;
      continue;
    }

    // Paragraph: run to the next blank line or the next block-level construct.
    const para = [];
    while (i < lines.length) {
      const text = lines[i].slice(indent);
      if (
        lines[i].trim() === '' ||
        /^(#{1,6})\s+/.test(text) ||
        /^-{3,}\s*$/.test(text.trim()) ||
        /^`{3,}/.test(text.trim()) ||
        listMarker(text) ||
        isRawHtmlStart(text) ||
        text.startsWith('<!--')
      ) {
        break;
      }
      para.push(text.trim());
      i += 1;
    }
    out.push(`<p>${renderInline(para.join(' '))}</p>`);
  }

  return out;
}

function listMarker(text) {
  const bullet = /^([-*])\s+(.*)$/.exec(text);
  if (bullet) return { ordered: false, content: bullet[2] };
  const ordered = /^(\d+)[.)]\s+(.*)$/.exec(text);
  if (ordered) return { ordered: true, content: ordered[2] };
  return null;
}

/**
 * Consumes one list, including any lists nested under its items.
 */
function takeList(lines, start, indent) {
  const ordered = listMarker(lines[start].slice(indent)).ordered;
  const items = [];
  let i = start;

  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trim() === '') {
      // A blank line ends the list unless the next line continues it.
      const next = lines[i + 1];
      if (next === undefined || next.trim() === '') break;
      const nextIndent = next.length - next.trimStart().length;
      if (nextIndent < indent) break;
      if (nextIndent === indent && !listMarker(next.slice(indent))) break;
      i += 1;
      continue;
    }

    const lineIndent = raw.length - raw.trimStart().length;
    if (lineIndent < indent) break;

    const marker = lineIndent === indent ? listMarker(raw.slice(indent)) : null;
    if (!marker) break;
    if (marker.ordered !== ordered) break;

    // Everything indented past this marker belongs to the item.
    const childIndent = indent + 2;
    const child = [];
    i += 1;
    while (i < lines.length) {
      const next = lines[i];
      if (next.trim() === '') {
        const after = lines[i + 1];
        if (after === undefined || after.trim() === '') break;
        const afterIndent = after.length - after.trimStart().length;
        if (afterIndent < childIndent) break;
        child.push(next);
        i += 1;
        continue;
      }
      const nextIndent = next.length - next.trimStart().length;
      if (nextIndent < childIndent) break;
      child.push(next);
      i += 1;
    }

    const nested = child.length ? renderBlocks(child, childIndent) : [];
    items.push(
      nested.length
        ? `<li>${renderInline(marker.content)}\n${nested.join('\n')}\n</li>`
        : `<li>${renderInline(marker.content)}</li>`
    );
  }

  const tag = ordered ? 'ol' : 'ul';
  return { block: `<${tag}>\n${items.join('\n')}\n</${tag}>`, next: i };
}

function isRawHtmlStart(text) {
  // The tag name may be the whole line: prettier wraps a long element so its
  // first attribute lands on the next line.
  return (
    /^<([A-Za-z][A-Za-z0-9-]*)(\s|\/|>|$)/.test(text) && text.startsWith('<')
  );
}

/** Consumes an HTML comment block, which passes through untouched. */
function takeComment(lines, start, indent) {
  const block = [];
  let i = start;
  do {
    block.push(lines[i].slice(indent));
    i += 1;
  } while (i <= lines.length && !block[block.length - 1].includes('-->'));

  if (!block[block.length - 1].includes('-->')) {
    throw new Error('Unterminated HTML comment.');
  }

  return { block: block.join('\n'), next: i };
}

/**
 * Consumes a raw HTML block: the opening element and everything up to its
 * matching close tag. Passthrough is byte for byte — this is the escape hatch
 * that keeps bespoke layout markup and inline styles identical to today.
 */
function takeRawHtml(lines, start, indent) {
  const tag = /^<([A-Za-z][A-Za-z0-9-]*)/.exec(lines[start].slice(indent))[1];
  const block = [];
  let i = start;

  // A void element has no closing tag to wait for: it ends where its own start
  // tag ends, which may be several lines down once prettier has wrapped it.
  if (VOID_ELEMENTS.has(tag.toLowerCase())) {
    do {
      block.push(lines[i].slice(indent));
      i += 1;
    } while (i < lines.length && !block[block.length - 1].includes('>'));

    if (!block[block.length - 1].includes('>')) {
      throw new Error(
        `Unterminated raw HTML block: <${tag}> start tag is never closed.`
      );
    }
    return { block: block.join('\n'), next: i };
  }

  let depth = 0;
  do {
    const text = lines[i].slice(indent);
    block.push(text);
    depth += countTag(text, `<${tag}`) - countTag(text, `</${tag}>`);
    // `<foo />` closes itself, so it never contributes a matching close tag.
    // Only the block's OWN opening line counts: a self-closing child such as
    // `<img … />` must not be read as closing its parent.
    if (i === start && /\/>\s*$/.test(text.trim())) depth = 0;
    i += 1;
  } while (i < lines.length && depth > 0);

  if (depth > 0) {
    throw new Error(`Unterminated raw HTML block: <${tag}> is never closed.`);
  }

  return { block: block.join('\n'), next: i };
}

function countTag(text, needle) {
  let count = 0;
  let from = 0;
  for (;;) {
    const at = text.indexOf(needle, from);
    if (at === -1) return count;
    const after = text[at + needle.length];
    // `<div` must not match `<divider`; `</div>` already carries its own `>`.
    if (needle.endsWith('>') || after === undefined || /[\s/>]/.test(after)) {
      count += 1;
    }
    from = at + needle.length;
  }
}

/**
 * Inline rendering. Code spans are extracted first so their contents are never
 * re-read as Markdown; everything else (raw tags, entities, interpolation) is
 * left exactly as authored.
 */
function renderInline(text) {
  const spans = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    spans.push(`<code>${escapeHtml(code)}</code>`);
    return `${SPAN_MARK}${spans.length - 1}${SPAN_MARK}`;
  });

  // Alt text is attribute content, not inline text. It is parked in a span
  // placeholder like a code span, because the emphasis and code-span passes that
  // run after this one would otherwise rewrite the inside of the attribute and
  // leave `alt="an <em>important</em> image"` as the accessible name.
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => {
    spans.push(`<img src="${src}" alt="${altText(alt, spans)}" />`);
    return `${SPAN_MARK}${spans.length - 1}${SPAN_MARK}`;
  });

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) =>
    renderLink(label, href)
  );

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*(?![*\w])/g, '$1<em>$2</em>');
  out = out.replace(/(^|[^_\w])_([^_\n]+)_(?![_\w])/g, '$1<em>$2</em>');

  // A bare ampersand is not valid HTML, but `&mdash;` and friends are authored
  // deliberately and must survive, so escape only one that does not already open
  // a character reference.
  out = out.replace(/&(?!#?[A-Za-z0-9]+;)/g, '&amp;');

  return out.replace(SPAN_PATTERN, (_, index) => spans[Number(index)]);
}

/**
 * Removes every tag, not just the ones a single pass can see: one pass over
 * `<<a>b>` leaves `<b>` behind, so the strip repeats until the text stops
 * changing.
 *
 * Today's parked spans wrap already escaped text, so nothing can reassemble a
 * tag here. The loop is what keeps that true if a span ever parks raw markup.
 */
function stripTags(text) {
  let out = text;
  let previous;
  do {
    previous = out;
    out = out.replace(/<[^>]*>/g, '');
  } while (out !== previous);
  return out;
}

/**
 * The accessible name for an image: plain text, no markup.
 *
 * Code spans were already parked before this runs, so a placeholder here points
 * at a `<code>` span — resolve it back to its text rather than letting the tag
 * into the attribute. Emphasis markers are dropped for the same reason.
 */
function altText(alt, spans) {
  return alt
    .replace(SPAN_PATTERN, (_, index) =>
      stripTags(String(spans[Number(index)]))
    )
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/&(?!#?[A-Za-z0-9]+;)/g, '&amp;')
    .replace(/"/g, '&quot;');
}

function renderLink(label, href) {
  if (/^(https?:)?\/\//.test(href)) {
    return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
  }
  if (href.startsWith('#') || href.startsWith('mailto:')) {
    return `<a href="${href}">${label}</a>`;
  }
  return `<a routerLink="${href}">${label}</a>`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
