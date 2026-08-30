import assert from 'node:assert/strict';
import test from 'node:test';

import { extractAnchors, renderMarkdown } from './docs-markdown.mjs';

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

test('never invents an id for a heading that does not declare one', () => {
  // Re-slugging would silently mint anchors the docs never published and
  // would not match the ids callers already bookmarked.
  assert.equal(render('### Materials List'), '<h3>Materials List</h3>');
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
