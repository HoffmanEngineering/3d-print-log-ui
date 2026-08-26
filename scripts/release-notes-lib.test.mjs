import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import {
  parseSections,
  htmlToMarkdown,
  extractReleaseNotes,
} from './release-notes-lib.mjs';

const NOTES_PATH =
  'src/app/documentation/docs/docs-release-notes/docs-release-notes.component.html';

// Mirrors the real component: a wrapper, an <h2> that is NOT a release, then
// two releases. The second carries every inline shape the real file uses --
// including the capitalized <Strong> that appears 10 times in the history.
const FIXTURE = `<div class="docs-markdown">
  <h2>Release Notes</h2>
  <hr />

  <h3 id="v1.47.0">1.47.0 - Material Remaining &amp; More Bulk Actions</h3>
  <p>
    Saved materials now tell you what is
    left on the spool.
  </p>

  <h3 id="v1.46.0">1.46.0 - The New Print Page</h3>
  <p>The print page has been <em>rebuilt</em>.</p>
  <h4>Full List of Changes:</h4>
  <ul>
    <li>
      <strong>Rebuilt print page</strong> - Now an image hero. (<a
        href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/81"
        rel="noreferrer noopener"
        >#81</a
      >)
    </li>
    <li><Strong>Bulk editing</Strong> - Select rows and act on them.</li>
  </ul>
</div>`;

test('parseSections returns one entry per release heading', () => {
  const sections = parseSections(FIXTURE);

  assert.equal(sections.length, 2);
  assert.equal(sections[0].version, '1.47.0');
  assert.equal(sections[1].version, '1.46.0');
});

test('parseSections keeps the heading text as the release title', () => {
  const [first] = parseSections(FIXTURE);

  assert.equal(first.title, '1.47.0 - Material Remaining & More Bulk Actions');
});

test('parseSections ignores the page <h2>, taking only <h3> releases', () => {
  const versions = parseSections(FIXTURE).map((s) => s.version);

  assert.deepEqual(versions, ['1.47.0', '1.46.0']);
});

test('parseSections stops a section at the next heading', () => {
  const [first] = parseSections(FIXTURE);

  assert.match(first.bodyHtml, /left on the spool/);
  assert.doesNotMatch(first.bodyHtml, /print page has been/);
});

test('parseSections bounds sections correctly with uppercase <H3> tags', () => {
  // The heading match is case-insensitive, so the boundary lookup must be too,
  // or the first section swallows the second.
  const sections = parseSections(
    '<H3 id="v1.2.0">First</H3><p>A</p><H3 id="v1.1.0">Second</H3><p>B</p>'
  );

  assert.equal(sections.length, 2);
  assert.match(sections[0].bodyHtml, /A/);
  assert.doesNotMatch(sections[0].bodyHtml, /Second/);
});

test('parseSections normalizes a two-part id like v1.6 to 1.6.0', () => {
  const sections = parseSections(
    '<h3 id="v1.6">1.6 - Old release</h3><p>x</p>'
  );

  assert.equal(sections[0].version, '1.6.0');
});

test('htmlToMarkdown renders paragraphs as single collapsed lines', () => {
  const md = htmlToMarkdown(
    '<p>\n  Saved materials\n  tell you what is left.\n</p>'
  );

  assert.equal(md, 'Saved materials tell you what is left.');
});

test('htmlToMarkdown renders list items as dashes', () => {
  const md = htmlToMarkdown(
    '<ul><li>First thing</li><li>Second thing</li></ul>'
  );

  assert.equal(md, '- First thing\n- Second thing');
});

test('htmlToMarkdown renders <strong> as bold regardless of tag case', () => {
  const md = htmlToMarkdown(
    '<p><strong>One</strong> and <Strong>Two</Strong></p>'
  );

  assert.equal(md, '**One** and **Two**');
});

test('htmlToMarkdown renders links as markdown links', () => {
  const md = htmlToMarkdown(
    '<p>See (<a\n href="https://example.com/pull/81"\n rel="noreferrer"\n >#81</a\n >)</p>'
  );

  assert.equal(md, 'See ([#81](https://example.com/pull/81))');
});

test('htmlToMarkdown absolutizes routerLink into a site URL', () => {
  // A GitHub Release body is read off-site, so an Angular routerLink has to
  // become a real URL or it renders as a dead relative link on github.com.
  const md = htmlToMarkdown(
    '<p>the <a routerLink="/settings">settings page</a></p>'
  );

  assert.equal(md, 'the [settings page](https://www.3dprintlog.com/settings)');
});

test('htmlToMarkdown absolutizes the [routerLink]="[\'/x\']" binding form', () => {
  // Older sections use Angular property-binding syntax rather than a plain
  // routerLink attribute.
  const md = htmlToMarkdown(
    '<p>the <a [routerLink]="[\'/prints\']">print list</a></p>'
  );

  assert.equal(md, 'the [print list](https://www.3dprintlog.com/prints)');
});

test('htmlToMarkdown indents a nested list under its parent item', () => {
  const md = htmlToMarkdown(
    '<ul><li>Parent<ul><li>Child one</li><li>Child two</li></ul></li><li>Sibling</li></ul>'
  );

  assert.equal(md, '- Parent\n  - Child one\n  - Child two\n- Sibling');
});

test('htmlToMarkdown renders <h4> as a markdown heading', () => {
  const md = htmlToMarkdown('<h4>Full List of Changes:</h4>');

  assert.equal(md, '### Full List of Changes:');
});

test('htmlToMarkdown decodes named entities', () => {
  const md = htmlToMarkdown('<p>Remaining &amp; more &quot;stuff&quot;</p>');

  assert.equal(md, 'Remaining & more "stuff"');
});

test('htmlToMarkdown decodes decimal and hex numeric entities', () => {
  const md = htmlToMarkdown('<p>It&#8217;s ready &#x1F680;</p>');

  assert.equal(md, 'It’s ready \u{1F680}');
});

test('htmlToMarkdown keeps &lt; and &gt; escaped so literal markup survives', () => {
  // Prose that deliberately shows a tag must stay escaped: GitHub renders raw
  // HTML in Markdown, so decoding these would make the tag disappear.
  const md = htmlToMarkdown('<p>Use &lt;button&gt; literally</p>');

  assert.equal(md, 'Use &lt;button&gt; literally');
});

test('htmlToMarkdown renders every sibling list nested under one item', () => {
  const md = htmlToMarkdown(
    '<ul><li>Parent<ul><li>A</li></ul><ul><li>B</li></ul></li></ul>'
  );

  assert.equal(md, '- Parent\n  - A\n  - B');
});

test('htmlToMarkdown throws on an unclosed list rather than dropping content', () => {
  // Silently publishing a fragment of the notes is worse than a failed deploy.
  assert.throws(
    () =>
      htmlToMarkdown('<p>Before</p><ul><li>Outer<ul><li>Inner</li></ul></li>'),
    /unbalanced <ul>/i
  );
});

test('htmlToMarkdown renders <em> as italic', () => {
  assert.equal(
    htmlToMarkdown('<p>has been <em>rebuilt</em></p>'),
    'has been _rebuilt_'
  );
});

test('extractReleaseNotes returns the title and markdown body for a version', () => {
  const release = extractReleaseNotes(FIXTURE, '1.46.0');

  assert.equal(release.version, '1.46.0');
  assert.equal(release.title, '1.46.0 - The New Print Page');
  assert.match(release.markdown, /^The print page has been _rebuilt_\./);
  assert.match(
    release.markdown,
    /^- \*\*Rebuilt print page\*\* - Now an image hero/m
  );
});

test('extractReleaseNotes accepts a leading v on the version', () => {
  assert.equal(extractReleaseNotes(FIXTURE, 'v1.46.0').version, '1.46.0');
});

test('extractReleaseNotes throws for a version with no section', () => {
  assert.throws(
    () => extractReleaseNotes(FIXTURE, '1.32.1'),
    /no release notes section for 1\.32\.1/i
  );
});

// -- Against the real component, which is the corpus this ships against. --

const REAL_HTML = readFileSync(NOTES_PATH, 'utf8');

test('every release section in the real file yields non-empty markdown', () => {
  const sections = parseSections(REAL_HTML);
  assert.ok(
    sections.length >= 95,
    `expected >=95 sections, got ${sections.length}`
  );

  const empty = sections
    .filter((s) => htmlToMarkdown(s.bodyHtml).trim().length === 0)
    .map((s) => s.version);

  assert.deepEqual(empty, []);
});

test('the real file leaves no unrendered HTML tags in its markdown', () => {
  const leftovers = parseSections(REAL_HTML)
    .map((s) => ({ v: s.version, md: htmlToMarkdown(s.bodyHtml) }))
    .filter((s) => /<\/?[a-zA-Z]/.test(s.md))
    .map((s) => s.v);

  assert.deepEqual(leftovers, []);
});

test('every git tag except the known-missing v1.32.1 resolves to a section', (t) => {
  const tags = execFileSync('git', ['tag'], { encoding: 'utf8' })
    .split('\n')
    .map((tag) => tag.trim())
    .filter(Boolean);

  // actions/checkout is shallow by default and fetches no tags, so this
  // assertion is only meaningful on a clone that has them.
  if (tags.length === 0) {
    t.skip('no git tags available (shallow clone)');
    return;
  }

  // Which tags are present depends on the checkout: a full clone has all of
  // them, while a tag-triggered build has only the tag it was pushed for. So
  // assert that nothing beyond the known gap is unresolved, rather than that
  // the gap itself is always present to be found.

  const missing = tags.filter((tag) => {
    try {
      extractReleaseNotes(REAL_HTML, tag);
      return false;
    } catch {
      return true;
    }
  });

  assert.deepEqual(
    missing.filter((tag) => tag !== 'v1.32.1'),
    [],
  );
});
