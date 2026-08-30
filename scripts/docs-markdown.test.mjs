import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractAnchors,
  renderMarkdown,
  slugify,
  withHeadingIds,
} from './docs-markdown.mjs';

const render = (...lines) => renderMarkdown(lines.join('\n'));

test('renders a heading at the level of its hash run', () => {
  assert.equal(render('## Materials'), '<h2>Materials</h2>');
  assert.equal(render('#### Favorite Material'), '<h4>Favorite Material</h4>');
});

test('applies an explicit heading id from a {#id} suffix', () => {
  assert.equal(
    render('### How Remaining Material is Calculated {#remaining}'),
    '<h3 id="remaining">How Remaining Material is Calculated</h3>'
  );
});

test('never invents an id for a heading while rendering', () => {
  // Ids are added afterwards, by withHeadingIds, so that the raw HTML pages get
  // them too. The renderer stays a pure Markdown-to-template pass.
  assert.equal(render('### Materials List'), '<h3>Materials List</h3>');
});

test('derives an id for an h2-h4 that declares none', () => {
  assert.equal(
    withHeadingIds('<h3>How Remaining Material is Calculated</h3>'),
    '<h3 id="how-remaining-material-is-calculated">' +
      'How Remaining Material is Calculated</h3>'
  );
});

test('leaves an explicit id exactly as authored', () => {
  // docs-anchors.json holds the project to these. Re-slugging one would break
  // every link the outside world has already published to it.
  assert.equal(
    withHeadingIds('<h3 id="loaded_filament">Loaded Material</h3>'),
    '<h3 id="loaded_filament">Loaded Material</h3>'
  );
});

test('yields to an explicit id declared later on the page', () => {
  // Explicit ids are all reserved before any derived one is minted, so
  // document order cannot decide which heading keeps the published anchor.
  assert.equal(
    withHeadingIds(['<h3>Add</h3>', '<h4 id="add">Add a Material</h4>'].join('\n')),
    ['<h3 id="add-2">Add</h3>', '<h4 id="add">Add a Material</h4>'].join('\n')
  );
});

test('suffixes a derived id that repeats an earlier heading', () => {
  assert.equal(
    withHeadingIds(['<h3>Setup</h3>', '<h3>Setup</h3>', '<h3>Setup</h3>'].join('\n')),
    [
      '<h3 id="setup">Setup</h3>',
      '<h3 id="setup-2">Setup</h3>',
      '<h3 id="setup-3">Setup</h3>',
    ].join('\n')
  );
});

test('derives ids only for h2 through h4', () => {
  // h1 is the page title, and h5/h6 never reach the outline, so an id on
  // either is a link nothing offers the reader.
  assert.equal(withHeadingIds('<h1>Docs</h1>'), '<h1>Docs</h1>');
  assert.equal(withHeadingIds('<h5>Deep</h5>'), '<h5>Deep</h5>');
});

test('derives an id through the markup and bindings inside a heading', () => {
  assert.equal(
    withHeadingIds('<h3>Use <strong>{{ endpoint }}</strong> Now</h3>'),
    '<h3 id="use-now">Use <strong>{{ endpoint }}</strong> Now</h3>'
  );
});

test('leaves a heading alone when its text slugifies to nothing', () => {
  // An empty id is not a link, and "#" scrolls to the top of the page.
  assert.equal(withHeadingIds('<h3>—</h3>'), '<h3>—</h3>');
});

test('adds ids to raw HTML headings that survived the renderer', () => {
  const template = render(
    '<section>',
    '  <h2>Connect an AI Assistant</h2>',
    '</section>'
  );
  assert.match(withHeadingIds(template), /<h2 id="connect-an-ai-assistant">/);
});

test('is idempotent: a second pass changes nothing', () => {
  const once = withHeadingIds(
    ['<h3>Add a Print</h3>', '<h3>Add a Print</h3>'].join('\n')
  );
  assert.equal(withHeadingIds(once), once);
});

test('slugifies to lowercase ASCII words joined by single hyphens', () => {
  assert.equal(slugify('Print & Material Usage'), 'print-material-usage');
  assert.equal(slugify('  Trailing punctuation!  '), 'trailing-punctuation');
});

test('renders a blank-line separated block as a paragraph', () => {
  assert.equal(
    render('First para.', '', 'Second para.'),
    '<p>First para.</p>\n<p>Second para.</p>'
  );
});

test('joins the lines of one paragraph with a space', () => {
  assert.equal(render('one', 'two'), '<p>one two</p>');
});

test('renders a thematic break as a void hr', () => {
  assert.equal(
    render('Text.', '', '---', '', 'More.'),
    '<p>Text.</p>\n<hr />\n<p>More.</p>'
  );
});

test('renders emphasis, strong emphasis and code spans', () => {
  assert.equal(
    render('A **bold** and *italic* and `code` run.'),
    '<p>A <strong>bold</strong> and <em>italic</em> and <code>code</code> run.</p>'
  );
});

test('leaves markdown syntax inside a code span alone', () => {
  assert.equal(render('`**not bold**`'), '<p><code>**not bold**</code></p>');
});

test('escapes HTML-significant characters inside a code span', () => {
  assert.equal(
    render('`<mat-icon>` & co'),
    '<p><code>&lt;mat-icon&gt;</code> &amp; co</p>'
  );
});

test('renders a root-relative link as a routerLink so in-app navigation survives', () => {
  assert.equal(
    render('See [Prints](/docs/prints) for details.'),
    '<p>See <a routerLink="/docs/prints">Prints</a> for details.</p>'
  );
});

test('renders an absolute link as an external href', () => {
  assert.equal(
    render('[Cura](https://ultimaker.com)'),
    '<p><a href="https://ultimaker.com" target="_blank" rel="noopener">Cura</a></p>'
  );
});

test('renders a fragment link as a plain href', () => {
  assert.equal(render('[Setup](#Setup)'), '<p><a href="#Setup">Setup</a></p>');
});

test('renders an image with its alt text', () => {
  assert.equal(
    render('![A print list](/assets/img/docs/prints.png)'),
    '<p><img src="/assets/img/docs/prints.png" alt="A print list" /></p>'
  );
});

test('renders a bullet list', () => {
  assert.equal(
    render('- one', '- two'),
    '<ul>\n<li>one</li>\n<li>two</li>\n</ul>'
  );
});

test('renders an ordered list', () => {
  assert.equal(
    render('1. one', '2. two'),
    '<ol>\n<li>one</li>\n<li>two</li>\n</ol>'
  );
});

test('nests a list indented under its parent item', () => {
  assert.equal(
    render('- outer', '  - inner'),
    '<ul>\n<li>outer\n<ul>\n<li>inner</li>\n</ul>\n</li>\n</ul>'
  );
});

test('renders a fenced code block as escaped pre/code', () => {
  assert.equal(
    render('```', '<script>alert(1)</script>', '```'),
    '<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>'
  );
});

test('passes an angular-html fence through untouched so directives keep working', () => {
  assert.equal(
    render(
      '```angular-html',
      '<button mat-raised-button color="primary">Go</button>',
      '```'
    ),
    '<button mat-raised-button color="primary">Go</button>'
  );
});

test('passes a raw HTML block through untouched', () => {
  assert.equal(
    render('<div class="hero-section">', '  <h1>Hi</h1>', '</div>'),
    '<div class="hero-section">\n  <h1>Hi</h1>\n</div>'
  );
});

test('does not treat markdown inside a raw HTML block as markdown', () => {
  assert.equal(
    render('<div>', '  - not a list', '</div>'),
    '<div>\n  - not a list\n</div>'
  );
});

test('passes inline Angular markup inside a paragraph through untouched', () => {
  assert.equal(
    render('Click the <mat-icon inline>star_border</mat-icon> icon.'),
    '<p>Click the <mat-icon inline>star_border</mat-icon> icon.</p>'
  );
});

test('passes an HTML entity and an interpolation through untouched', () => {
  assert.equal(
    render('Endpoint {{ mcpEndpoint }} &mdash; ready.'),
    '<p>Endpoint {{ mcpEndpoint }} &mdash; ready.</p>'
  );
});

test('emits nothing for an empty document', () => {
  assert.equal(render(''), '');
});

test('extractAnchors reports every id in the rendered template', () => {
  const template = render(
    '### Remaining {#remaining}',
    '',
    '<div id="loaded_filament">x</div>'
  );

  assert.deepEqual(extractAnchors(template), ['remaining', 'loaded_filament']);
});

test('extractAnchors returns no duplicates', () => {
  assert.deepEqual(extractAnchors('<p id="a"></p><p id="a"></p>'), ['a']);
});

test('passes an HTML comment through as its own block', () => {
  assert.equal(
    render('<!-- Hero Section -->', '', 'Text.'),
    '<!-- Hero Section -->\n<p>Text.</p>'
  );
});

test('does not let an HTML comment swallow the block that follows it', () => {
  assert.equal(
    render('<!-- Hero -->', '<h1 class="hero-title">Hi</h1>'),
    '<!-- Hero -->\n<h1 class="hero-title">Hi</h1>'
  );
});

test('passes a raw element whose attributes start on the next line', () => {
  assert.equal(
    render('<img', '  src="/a.png"', '  alt="A" />'),
    '<img\n  src="/a.png"\n  alt="A" />'
  );
});

test('a self-closing child does not end its parent raw HTML block', () => {
  assert.equal(
    render(
      '<div class="hero">',
      '  <img src="/a.png" />',
      '  <h1>Hi</h1>',
      '</div>'
    ),
    '<div class="hero">\n  <img src="/a.png" />\n  <h1>Hi</h1>\n</div>'
  );
});

test('a raw HTML block survives a blank line inside it', () => {
  assert.equal(
    render('<div>', '  <p>One</p>', '', '  <p>Two</p>', '</div>'),
    '<div>\n  <p>One</p>\n\n  <p>Two</p>\n</div>'
  );
});

// Alt text lands inside an attribute, so a quote in it used to close the
// attribute early and let whatever followed become markup of its own.
test('escapes a double quote in image alt text', () => {
  const html = renderMarkdown('![a "quoted" caption](/x.png)');

  assert.match(html, /alt="a &quot;quoted&quot; caption"/);
});

// Raw HTML passes through verbatim, so an id may arrive single-quoted. Anchors
// are contractual, and one the extractor cannot see is one the gate cannot
// protect -- a link to it is reported missing instead.
test('extracts a single-quoted id', () => {
  assert.deepEqual(extractAnchors("<div id='setup'></div>"), ['setup']);
});

test('extracts ids of both quote styles in document order', () => {
  assert.deepEqual(extractAnchors(`<h2 id="one"></h2><div id='two'></div>`), [
    'one',
    'two',
  ]);
});

// The <img> was built before emphasis and code spans were restored, so those
// passes rewrote the inside of the alt attribute and the accessible name became
// literal markup.
test('keeps inline formatting out of image alt text', () => {
  const html = renderMarkdown('![an *important* image](pic.png)');

  assert.match(html, /alt="an important image"/);
  assert.doesNotMatch(html, /alt="[^"]*<em>/);
});

test('keeps a code span out of image alt text', () => {
  const html = renderMarkdown('![a `code` caption](p.png)');

  assert.match(html, /alt="a code caption"/);
});

// The span a placeholder resolves to is a `<code>` wrapper around already
// escaped text, so the angle brackets an author typed stay escaped and only the
// wrapper is stripped.
test('angle brackets inside a code span stay escaped in image alt text', () => {
  const html = renderMarkdown('![a `<b>` caption](p.png)');

  assert.match(html, /alt="a &lt;b&gt; caption"/);
  assert.doesNotMatch(html, /alt="[^"]*<code>/);
});

// -- backslash escapes -------------------------------------------------------
//
// `prettier --write` rewrites a literal `*` or `_` in prose to `\*` / `\_`, so
// these are not an exotic authoring choice -- they are what the repo's own
// formatter produces, and the renderer has to read them the same way.

test('renders an escaped asterisk as a literal, not as emphasis', () => {
  const html = renderMarkdown(
    'Show the **Estimated Time\\***, with an \\* to indicate.'
  );

  assert.match(
    html,
    /<strong>Estimated Time\*<\/strong>, with an \* to indicate\./
  );
  assert.doesNotMatch(html, /<em>/);
});

test('renders an escaped underscore as a literal', () => {
  assert.match(renderMarkdown('a \\_b\\_ c'), /<p>a _b_ c<\/p>/);
});

test('escapes a backslash-escaped ampersand into a character reference', () => {
  assert.match(renderMarkdown('AT\\&T'), /<p>AT&amp;T<\/p>/);
});

test('escapes backslash-escaped angle brackets rather than minting a tag', () => {
  assert.match(renderMarkdown('\\<b\\>'), /<p>&lt;b&gt;<\/p>/);
});

test('leaves a backslash escape inside a code span untouched', () => {
  // Escapes do not apply inside code spans, so the backslash is content.
  assert.match(renderMarkdown('`a \\* b`'), /<code>a \\\* b<\/code>/);
});

test('leaves a backslash before a non-punctuation character alone', () => {
  assert.match(renderMarkdown('C:\\path'), /<p>C:\\path<\/p>/);
});
