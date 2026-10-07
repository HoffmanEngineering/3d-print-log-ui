import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  decodeEntities,
  docBodyProblems,
  expectedPhrase,
  firstParagraph,
  plainInline,
  routedPageHtml,
  textOf,
} from './prerender-body-lib.mjs';

const TWIN = `# Tracking Prints

> Log every 3D print with photos, filament usage, print time, and settings.

HTML version: https://www.3dprintlog.com/docs/prints. Last updated 2026-09-14.

![A screenshot](https://www.3dprintlog.com/a.webp)

Navigate to the [Prints](https://www.3dprintlog.com/prints) section to manage your list of 3D prints.
`;

const layout = (page) =>
  `<app-root><router-outlet></router-outlet><app-documentation><div>` +
  `<app-doc-toc></app-doc-toc><router-outlet></router-outlet>${page}` +
  `<app-doc-related></app-doc-related></div></app-documentation></app-root>`;

test('the first paragraph skips the twin preamble, images and short lines', () => {
  assert.equal(
    firstParagraph(TWIN),
    'Navigate to the Prints section to manage your list of 3D prints.'
  );
  assert.equal(
    firstParagraph(
      '# T\n\nOctober 5, 2026\n\nThis release adds a lot of new things here.'
    ),
    'This release adds a lot of new things here.'
  );
  assert.equal(firstParagraph('# T\n\n- just\n- a list'), null);
});

test('inline Markdown is reduced to what a reader sees', () => {
  assert.equal(
    plainInline('Use **Search** or `--flag` on [the page](https://x.test/a).'),
    'Use Search or --flag on the page.'
  );
  assert.equal(
    plainInline('missing\\_refresh\\_token'),
    'missing_refresh_token'
  );
});

test('entities are decoded once, not twice', () => {
  assert.equal(
    decodeEntities('a &amp;lt; b &#39;c&#x27; &nbsp;'),
    `a &lt; b 'c' ${String.fromCharCode(0xa0)}`
  );
});

test('text is taken from outside tags only', () => {
  assert.equal(
    textOf('<p class="x">Hi <a href="/a">there</a></p>'),
    'Hi there'
  );
});

test('an empty router outlet fails, and names the missing phrase', () => {
  const problems = docBodyProblems(layout(''), TWIN);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /Navigatetothe/);
});

test('the rendered page passes, whatever the inline markup and spacing', () => {
  const page =
    '<app-docs-prints><p>Navigate to the <a href="/prints">Prints</a>\n' +
    '  section to manage your list of 3D&nbsp;prints.</p></app-docs-prints>';
  assert.deepEqual(docBodyProblems(layout(page), TWIN), []);
});

test('text outside the routed page does not count', () => {
  // The same sentence in the layout chrome is not the page rendering.
  const html = layout('').replace(
    '<app-doc-toc></app-doc-toc>',
    '<app-doc-toc>Navigate to the Prints section to manage your list of 3D prints.</app-doc-toc>'
  );
  assert.equal(docBodyProblems(html, TWIN).length, 1);
});

test('a page without the docs layout is reported, not silently passed', () => {
  assert.equal(routedPageHtml('<app-root></app-root>'), null);
  assert.equal(docBodyProblems('<app-root></app-root>', TWIN).length, 1);
});

test('the phrase is capped so a long paragraph is not brittle', () => {
  const twin = `# T\n\n${'word '.repeat(50)}`;
  assert.equal(expectedPhrase(twin).length, 60);
});
