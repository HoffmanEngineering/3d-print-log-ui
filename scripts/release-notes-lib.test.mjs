import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  anchorFor,
  compareVersionsDesc,
  extractReleaseNotes,
  headingFor,
  htmlToMarkdown,
  isVersion,
  normalizeVersion,
  readReleaseSources,
} from './release-notes-lib.mjs';
import { renderMarkdown } from './docs-markdown.mjs';
import { RELEASE_NOTES_DIR } from './docs-paths.mjs';

/** A throwaway release-notes directory, so the reader can be tested on shapes
 *  the real corpus does not (yet) contain. */
function withReleases(files, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-notes-'));
  try {
    for (const [name, contents] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), contents);
    }
    return run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const RELEASE = (version, title, body) =>
  `---\nversion: ${version}\ndate: 2026-01-02\ntitle: '${title}'\n---\n\n${body}\n`;

// -- versions and anchors ----------------------------------------------------

test('normalizeVersion pads a two-part version to three parts', () => {
  assert.equal(normalizeVersion('1.6'), '1.6.0');
  assert.equal(normalizeVersion('v1.6'), '1.6.0');
  assert.equal(normalizeVersion('1.49.1'), '1.49.1');
});

test('compareVersionsDesc sorts newest first, numerically per segment', () => {
  const sorted = ['1.9.0', '1.43.9', '1.43.10', '1.6'].sort(
    compareVersionsDesc
  );

  // 1.43.10 above 1.43.9 is the case a string sort gets wrong.
  assert.deepEqual(sorted, ['1.43.10', '1.43.9', '1.9.0', '1.6']);
});

test('anchorFor derives the id from the version, not from heading text', () => {
  // The dots are the point: a Markdown slugger would mint `v1-38-0`.
  assert.equal(anchorFor('1.38.0'), 'v1.38.0');
  assert.equal(anchorFor('1.6'), 'v1.6');
});

test('headingFor omits the separator when a release has no title', () => {
  assert.equal(headingFor('1.49.1', 'Push Fixes'), '1.49.1 - Push Fixes');
  assert.equal(headingFor('1.29.0', ''), '1.29.0');
});

test('isVersion accepts two- and three-part versions and nothing else', () => {
  assert.ok(isVersion('1.6'));
  assert.ok(isVersion('1.49.1'));
  assert.ok(!isVersion('v1.49.1'));
  assert.ok(!isVersion('next'));
});

// -- reading sources ---------------------------------------------------------

test('readReleaseSources returns releases newest first', () => {
  const versions = withReleases(
    {
      '1.9.0.md': RELEASE('1.9.0', 'Older', 'Body.'),
      '1.43.9.md': RELEASE('1.43.9', 'Middle', 'Body.'),
      '1.43.10.md': RELEASE('1.43.10', 'Newest', 'Body.'),
    },
    (dir) => readReleaseSources(dir).map((r) => r.version)
  );

  assert.deepEqual(versions, ['1.43.10', '1.43.9', '1.9.0']);
});

test('readReleaseSources rejects a version that disagrees with its filename', () => {
  assert.throws(
    () =>
      withReleases({ '1.9.0.md': RELEASE('1.9.1', 'Typo', 'Body.') }, (dir) =>
        readReleaseSources(dir)
      ),
    /must match its filename/
  );
});

test('readReleaseSources defaults highlights to an empty list', () => {
  const [release] = withReleases(
    { '1.9.0.md': RELEASE('1.9.0', 'No highlights', 'Body.') },
    (dir) => readReleaseSources(dir)
  );

  assert.deepEqual(release.highlights, []);
});

test('readReleaseSources reads a highlights sequence', () => {
  const [release] = withReleases(
    {
      '1.9.0.md': `---\nversion: 1.9.0\ndate: 2026-01-02\ntitle: 'X'\nhighlights: [labels, analytics]\n---\n\nBody.\n`,
    },
    (dir) => readReleaseSources(dir)
  );

  assert.deepEqual(release.highlights, ['labels', 'analytics']);
});

test('readReleaseSources preserves frontmatter types rather than coercing them', () => {
  // Coercing here (`String(...)`) would make the validator's type rules dead
  // code: `title: 141` would arrive as "141" and pass the check written to
  // catch it.
  const [release] = withReleases(
    {
      '1.9.0.md': `---
version: 1.9.0
date: 2026-01-02
title: 141
---

Body.
`,
    },
    (dir) => readReleaseSources(dir)
  );

  assert.equal(typeof release.title, 'number');
});

test('readReleaseSources returns nothing when the directory is absent', () => {
  assert.deepEqual(readReleaseSources('does-not-exist'), []);
});

// -- html -> markdown --------------------------------------------------------

const html = (markdown) => renderMarkdown(markdown);

test('htmlToMarkdown renders paragraphs as single collapsed lines', () => {
  assert.equal(
    htmlToMarkdown(html('Saved materials now tell you\nwhat is left.')),
    'Saved materials now tell you what is left.'
  );
});

test('htmlToMarkdown renders list items as dashes', () => {
  assert.equal(
    htmlToMarkdown(html('- First thing\n- Second thing')),
    '- First thing\n- Second thing'
  );
});

test('htmlToMarkdown renders <strong> as bold regardless of tag case', () => {
  assert.equal(
    htmlToMarkdown('<p><Strong>Bulk editing</Strong> - Select rows.</p>'),
    '**Bulk editing** - Select rows.'
  );
});

test('htmlToMarkdown renders links as markdown links', () => {
  assert.match(
    htmlToMarkdown(html('See [PR #81](https://github.com/x/y/pull/81).')),
    /\[PR #81\]\(https:\/\/github\.com\/x\/y\/pull\/81\)/
  );
});

test('htmlToMarkdown absolutizes routerLink into a site URL', () => {
  assert.equal(
    htmlToMarkdown(html('Open [Settings](/settings).')),
    'Open [Settings](https://www.3dprintlog.com/settings).'
  );
});

test('htmlToMarkdown absolutizes the [routerLink]="[\'/x\']" binding form', () => {
  assert.equal(
    htmlToMarkdown(`<p>Open <a [routerLink]="['/prints']">Prints</a>.</p>`),
    'Open [Prints](https://www.3dprintlog.com/prints).'
  );
});

test('htmlToMarkdown indents a nested list under its parent item', () => {
  assert.equal(
    htmlToMarkdown('<ul><li>Parent<ul><li>Child</li></ul></li></ul>'),
    '- Parent\n  - Child'
  );
});

test('htmlToMarkdown renders <h4> as a markdown heading', () => {
  assert.equal(
    htmlToMarkdown(html('#### Full List of Changes:')),
    '### Full List of Changes:'
  );
});

test('htmlToMarkdown decodes named entities', () => {
  assert.equal(
    htmlToMarkdown('<p>Remaining &amp; More</p>'),
    'Remaining & More'
  );
});

test('htmlToMarkdown decodes decimal and hex numeric entities', () => {
  assert.equal(htmlToMarkdown('<p>&#64; and &#x40;</p>'), '@ and @');
});

test('htmlToMarkdown keeps &lt; and &gt; escaped so literal markup survives', () => {
  assert.equal(
    htmlToMarkdown('<p>supports &lt;button&gt;</p>'),
    'supports &lt;button&gt;'
  );
});

test('htmlToMarkdown renders every sibling list nested under one item', () => {
  assert.equal(
    htmlToMarkdown(
      '<ul><li>Parent<ul><li>A</li></ul><ul><li>B</li></ul></li></ul>'
    ),
    '- Parent\n  - A\n  - B'
  );
});

test('htmlToMarkdown throws on an unclosed list rather than dropping content', () => {
  assert.throws(
    () => htmlToMarkdown('<ul><li>Only item</li>'),
    /unbalanced <ul>/
  );
});

test('htmlToMarkdown renders <em> as italic', () => {
  assert.equal(
    htmlToMarkdown(html('The print page has been _rebuilt_.')),
    'The print page has been _rebuilt_.'
  );
});

test('htmlToMarkdown drops the section wrapper a rendered release carries', () => {
  assert.equal(
    htmlToMarkdown('<section class="release-note"><p>Body.</p></section>'),
    'Body.'
  );
});

// -- extraction --------------------------------------------------------------

test('extractReleaseNotes returns the heading and markdown body for a version', () => {
  const release = withReleases(
    {
      '1.46.0.md': RELEASE(
        '1.46.0',
        'The New Print Page',
        'The print page has been _rebuilt_.\n\n#### Full List of Changes:\n\n- **Rebuilt print page** - Now an image hero.'
      ),
    },
    (dir) => extractReleaseNotes('1.46.0', dir)
  );

  assert.equal(release.version, '1.46.0');
  assert.equal(release.title, '1.46.0 - The New Print Page');
  assert.match(release.markdown, /^The print page has been _rebuilt_\./);
  assert.match(
    release.markdown,
    /^- \*\*Rebuilt print page\*\* - Now an image hero\./m
  );
});

test('extractReleaseNotes accepts a leading v on the version', () => {
  const version = withReleases(
    { '1.46.0.md': RELEASE('1.46.0', 'X', 'Body.') },
    (dir) => extractReleaseNotes('v1.46.0', dir).version
  );

  assert.equal(version, '1.46.0');
});

test('extractReleaseNotes matches a v1.6 tag against the 1.6 file', () => {
  const version = withReleases(
    { '1.6.md': RELEASE('1.6', 'X', 'Body.') },
    (dir) => extractReleaseNotes('v1.6.0', dir).version
  );

  assert.equal(version, '1.6');
});

test('extractReleaseNotes throws for a version with no file', () => {
  assert.throws(
    () =>
      withReleases({ '1.46.0.md': RELEASE('1.46.0', 'X', 'Body.') }, (dir) =>
        extractReleaseNotes('1.32.1', dir)
      ),
    /no release notes for 1\.32\.1/i
  );
});

// -- Against the real corpus, which is what this ships against. --------------

const REAL = readReleaseSources(RELEASE_NOTES_DIR);

test('the real corpus holds every published release', () => {
  assert.ok(REAL.length >= 97, `expected >=97 releases, got ${REAL.length}`);
});

test('every real release yields non-empty markdown', () => {
  const empty = REAL.filter(
    (release) =>
      htmlToMarkdown(renderMarkdown(release.body)).trim().length === 0
  ).map((release) => release.version);

  assert.deepEqual(empty, []);
});

test('no real release leaves unrendered HTML tags in its markdown', () => {
  const leftovers = REAL.filter((release) =>
    /<\/?[a-zA-Z]/.test(htmlToMarkdown(renderMarkdown(release.body)))
  ).map((release) => release.version);

  assert.deepEqual(leftovers, []);
});

test('every real release declares an ISO date', () => {
  const bad = REAL.filter((r) => !/^\d{4}-\d{2}-\d{2}$/.test(r.date)).map(
    (r) => r.version
  );

  assert.deepEqual(bad, []);
});

test('every git tag except the known-missing v1.32.1 resolves to a release', (t) => {
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
      extractReleaseNotes(tag);
      return false;
    } catch {
      return true;
    }
  });

  assert.deepEqual(
    missing.filter((tag) => tag !== 'v1.32.1'),
    []
  );
});
