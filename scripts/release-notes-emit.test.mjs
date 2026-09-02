import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RECENT_RELEASE_COUNT,
  emitArchiveTs,
  formatDate,
  renderArchiveHost,
  renderRecentReleases,
  renderRelease,
  toInjectableHtml,
  toReleaseManifest,
} from './release-notes-emit.mjs';
import { readReleaseSources } from './release-notes-lib.mjs';
import { RELEASE_NOTES_DIR } from './docs-paths.mjs';

const release = (version, extra = {}) => ({
  version,
  date: '2026-08-29',
  title: 'A Release',
  highlights: [],
  body: 'Body text.',
  sourceFile: `${version}.md`,
  ...extra,
});

/** More releases than fit in the page, so the archive is never empty. */
const many = (count) =>
  Array.from({ length: count }, (_, i) => release(`1.${count - i}.0`));

// -- the manifest projection -------------------------------------------------

test('toReleaseManifest carries version, date, title and anchor', () => {
  assert.deepEqual(toReleaseManifest([release('1.49.1')]), [
    {
      version: '1.49.1',
      date: '2026-08-29',
      title: 'A Release',
      anchor: 'v1.49.1',
      highlights: [],
      archived: false,
    },
  ]);
});

test('toReleaseManifest marks the releases the page does not render', () => {
  // The component reads this to answer "is this deep link already on the page?"
  // before anything has rendered, which a DOM query could not do.
  const rows = toReleaseManifest(many(12));

  assert.deepEqual(
    rows.filter((row) => !row.archived).map((row) => row.version),
    [
      '1.12.0',
      '1.11.0',
      '1.10.0',
      '1.9.0',
      '1.8.0',
      '1.7.0',
      '1.6.0',
      '1.5.0',
      '1.4.0',
      '1.3.0',
    ]
  );
  assert.deepEqual(
    rows.filter((row) => row.archived).map((row) => row.version),
    ['1.2.0', '1.1.0']
  );
});

test('renderRelease escapes a title that contains an ampersand', () => {
  // Titles are plain text everywhere else -- the archive prints them through
  // {{ }} and the GitHub Release title is a bare string -- so this is the only
  // place one becomes markup.
  assert.match(
    renderRelease(release('1.47.0', { title: 'Remaining & More' })),
    /<h3 id="v1\.47\.0">1\.47\.0 - Remaining &amp; More<\/h3>/
  );
});

test('emitArchiveTs keeps a title plain so interpolation renders it', () => {
  const source = emitArchiveTs([
    ...many(RECENT_RELEASE_COUNT),
    release('1.0.0', { title: 'Remaining & More' }),
  ]);

  assert.match(source, /heading: '1\.0\.0 - Remaining & More'/);
  assert.ok(!source.includes('&amp;'));
});

test('toReleaseManifest keeps declared highlights', () => {
  const [row] = toReleaseManifest([
    release('1.49.1', { highlights: ['labels'] }),
  ]);

  assert.deepEqual(row.highlights, ['labels']);
});

// -- rendering ---------------------------------------------------------------

test('renderRelease derives the heading id from the version', () => {
  // A heading slugger would mint `1-38-0`; every published deep link says
  // `#v1.38.0`, so the id must come from the frontmatter instead.
  assert.match(renderRelease(release('1.38.0')), /<h3 id="v1\.38\.0">/);
});

test('renderRelease writes the version and title into the heading', () => {
  assert.match(
    renderRelease(release('1.38.0')),
    /<h3 id="v1\.38\.0">1\.38\.0 - A Release<\/h3>/
  );
});

test('renderRelease omits the separator for a release with no title', () => {
  assert.match(
    renderRelease(release('1.29.0', { title: '' })),
    /<h3 id="v1\.29\.0">1\.29\.0<\/h3>/
  );
});

test('renderRelease emits a machine-readable date', () => {
  assert.match(
    renderRelease(release('1.49.1')),
    /<time datetime="2026-08-29">August 29, 2026<\/time>/
  );
});

test('renderRelease omits the date line when there is no date', () => {
  assert.ok(!renderRelease(release('1.6', { date: '' })).includes('<time'));
});

test('formatDate spells out the month and drops the leading zero', () => {
  assert.equal(formatDate('2026-08-29'), 'August 29, 2026');
  assert.equal(formatDate('2020-10-04'), 'October 4, 2020');
});

test('formatDate leaves a value it does not recognise alone', () => {
  assert.equal(formatDate('soon'), 'soon');
});

test('renderRecentReleases renders only the newest N', () => {
  const rendered = renderRecentReleases(many(15));

  const ids = [...rendered.matchAll(/<h3 id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, RECENT_RELEASE_COUNT);
  assert.equal(ids[0], 'v1.15.0');
});

// -- the archive -------------------------------------------------------------

test('emitArchiveTs holds exactly the releases the page does not render', () => {
  const source = emitArchiveTs(many(15));

  const versions = [...source.matchAll(/version: '([^']+)'/g)].map((m) => m[1]);
  assert.equal(versions.length, 5);
  assert.ok(
    !versions.includes('1.15.0'),
    'newest release must stay in the page'
  );
  assert.ok(versions.includes('1.1.0'), 'oldest release must be archived');
});

test('emitArchiveTs emits an empty archive when everything fits in the page', () => {
  const source = emitArchiveTs(many(3));

  assert.match(source, /export const RELEASE_ARCHIVE[^=]*= \[\n\];/);
});

test('emitArchiveTs escapes quotes and newlines into a single-line literal', () => {
  const source = emitArchiveTs([
    ...many(RECENT_RELEASE_COUNT),
    release('1.0.0', { title: "It's here" }),
  ]);

  assert.match(source, /title: 'It\\'s here'/);
  assert.ok(
    !/html: '[^']*\n/.test(source),
    'a raw newline would break the literal'
  );
});

// -- injected markup ---------------------------------------------------------

test('toInjectableHtml turns routerLink into a real href', () => {
  // routerLink is a directive; in [innerHTML] markup it is inert, so the link
  // would do nothing at all.
  assert.equal(
    toInjectableHtml('<a routerLink="/prints">Prints</a>'),
    '<a href="/prints">Prints</a>'
  );
});

test('toInjectableHtml flattens the [routerLink] array binding into a path', () => {
  assert.equal(
    toInjectableHtml(`<a [routerLink]="['/docs', 'prints']">Prints</a>`),
    '<a href="/docs/prints">Prints</a>'
  );
});

test('toInjectableHtml replaces mat-icon with the ligature span it renders', () => {
  // Injected, <mat-icon> is an unknown element that shows "settings" as text.
  assert.equal(
    toInjectableHtml('<mat-icon inline="true">settings</mat-icon>'),
    '<span class="material-icons release-note__icon" aria-hidden="true">settings</span>'
  );
});

test('toInjectableHtml drops style attributes the sanitizer would strip anyway', () => {
  assert.equal(
    toInjectableHtml('<img src="a.png" style="max-width: 90%" alt="" />'),
    '<img src="a.png" alt="" />'
  );
});

test('toInjectableHtml leaves ordinary markup untouched', () => {
  const html = '<p><strong>Bulk editing</strong> - Select rows.</p>';
  assert.equal(toInjectableHtml(html), html);
});

// -- the archive host --------------------------------------------------------

test('renderArchiveHost counts the releases the button will reveal', () => {
  assert.match(renderArchiveHost(many(15)), /Show 5 older releases/);
});

test('renderArchiveHost emits nothing when there is nothing to archive', () => {
  assert.equal(renderArchiveHost(many(3)), '');
});

test('renderArchiveHost binds the archived id rather than hard-coding one', () => {
  // A literal `id="…"` here would be a second element claiming an anchor the
  // page template already declares.
  const host = renderArchiveHost(many(15));

  assert.match(host, /<h3 \[id\]="release\.anchor">/);
  assert.ok(!/\sid="/.test(host));
});

// -- Against the real corpus -------------------------------------------------

const REAL = readReleaseSources(RELEASE_NOTES_DIR);

test('the real corpus has no entity-encoded title', () => {
  // An `&amp;` here reaches the reader literally in the archive and in the
  // GitHub Release title.
  const encoded = REAL.filter((r) => /&#?[a-zA-Z0-9]+;/.test(r.title)).map(
    (r) => r.version
  );

  assert.deepEqual(encoded, []);
});

test('every published anchor appears exactly once across page and archive', () => {
  const page = [
    ...renderRecentReleases(REAL).matchAll(/<h3 id="([^"]+)"/g),
  ].map((m) => m[1]);
  const archived = [...emitArchiveTs(REAL).matchAll(/anchor: '([^']+)'/g)].map(
    (m) => m[1]
  );

  const all = [...page, ...archived];
  assert.equal(all.length, REAL.length);
  assert.equal(new Set(all).size, REAL.length, 'anchors must be unique');
});

test('no archived release carries markup that is inert once injected', () => {
  const source = emitArchiveTs(REAL);

  assert.ok(
    !/<mat-icon/i.test(source),
    'mat-icon cannot render from innerHTML'
  );
  assert.ok(
    !/routerLink=/.test(source),
    'routerLink cannot navigate from innerHTML'
  );
  assert.ok(!/style=/.test(source), 'the sanitizer strips style attributes');
});
