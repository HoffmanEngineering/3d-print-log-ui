// Turning the per-release sources into what /docs/release-notes renders.
//
// The page is split in two, and the split is the whole point of the file:
//
//   RECENT   The newest RECENT_RELEASE_COUNT releases are rendered straight into
//            the generated page template. They are Angular markup, so routerLink,
//            <mat-icon> and the rest work exactly as they do on any other doc
//            page, and they prerender into the static HTML.
//
//   ARCHIVE  Everything older is emitted as a separate TypeScript module that the
//            component `import()`s on demand. esbuild gives it its own hashed
//            chunk, so ~90 releases of history stop shipping to every visitor who
//            opens the page -- which is the reason this split exists at all.
//
// The archive is injected with [innerHTML], and that has two consequences the
// emitter has to handle, because injected HTML is parsed by the browser and never
// compiled by Angular:
//
//   * `routerLink` is an Angular directive. In injected markup it is an inert
//     attribute, so those links would do nothing at all. They are rewritten to a
//     real `href`, which costs a full navigation instead of a soft one -- the
//     right trade for archived notes, and far better than a dead link.
//   * `<mat-icon>` is an Angular component. Injected, it is an unknown element
//     that renders its ligature name as literal text ("settings"). It is
//     rewritten to the span with the Material Icons class that MatIcon itself
//     produces, which the globally loaded icon font styles identically.
//
// Everything emitted here must also survive Angular's HTML sanitizer, which is
// what [innerHTML] runs it through. That is why nothing carries a `style`
// attribute: the four historical figures are styled from the component's
// stylesheet instead. No sanitizer bypass is used, and none should be added -- the point of
// the sanitizer here is that a mistake in this file cannot become an injection.

import { renderMarkdown } from './docs-markdown.mjs';
import { anchorFor, headingFor } from './release-notes-lib.mjs';
import { BANNER } from './docs-emit.mjs';

/** How many releases render into the page itself. The rest go to the archive. */
export const RECENT_RELEASE_COUNT = 10;

/**
 * The manifest projection: version, date, title and anchor for every release,
 * newest first. This is what Phase 4's what's-new surface reads, and what the
 * anchor contract is checked against.
 *
 * `archived` records which side of the split a release landed on. The component
 * needs that to answer "is this deep link already on the page?", and reading it
 * from here rather than probing the DOM keeps the answer available before the
 * template has rendered.
 *
 * @param {object[]} sources from readReleaseSources
 * @param {number} [recent]
 */
export function toReleaseManifest(sources, recent = RECENT_RELEASE_COUNT) {
  return sources.map((source, index) => ({
    version: source.version,
    date: source.date,
    title: source.title,
    anchor: anchorFor(source.version),
    highlights: source.highlights ?? [],
    archived: index >= recent,
  }));
}

/**
 * One release as an Angular template fragment.
 *
 * The `<h3>` id comes from `anchorFor(version)`, never from the heading text.
 * That is the anchor contract: every published id has to keep resolving, and
 * dotted ids like `v1.38.0` are exactly what a heading slugger would mangle.
 */
export function renderRelease(source) {
  const anchor = anchorFor(source.version);
  const heading = headingFor(source.version, source.title);

  return [
    `<section class="release-note">`,
    // The heading is plain text in the frontmatter, and this is the one place it
    // becomes HTML. Storing an entity instead would read correctly here and
    // wrongly everywhere else the title is data rather than markup: the archive
    // renders it through {{ }}, and the GitHub Release title is a bare string.
    `<h3 id="${anchor}">${escapeText(heading)}</h3>`,
    ...(source.date
      ? [
          `<p class="release-note__date"><time datetime="${source.date}">${formatDate(source.date)}</time></p>`,
        ]
      : []),
    renderMarkdown(source.body),
    `</section>`,
  ].join('\n');
}

/** `2026-08-29` -> `August 29, 2026`. Formatted here so the page needs no pipe. */
export function formatDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * The release sections that render into the page template.
 *
 * @param {object[]} sources newest first
 * @param {number} [recent]
 */
export function renderRecentReleases(sources, recent = RECENT_RELEASE_COUNT) {
  return sources.slice(0, recent).map(renderRelease).join('\n');
}

/**
 * The markup the component drives: the "show older" control, and the host the
 * archive renders into once it has been imported.
 *
 * Generator-owned, like emitPageTemplate's wrapper — it is not authored in any
 * .md file, so it is not subject to the frontmatter contract. It binds to
 * DocsReleaseNotesComponent, which is why the page declares `component:`.
 *
 * @param {object[]} sources newest first
 * @param {number} [recent]
 */
export function renderArchiveHost(sources, recent = RECENT_RELEASE_COUNT) {
  const archived = sources.length - recent;
  if (archived <= 0) return '';

  return [
    '@if (!expanded()) {',
    '<div class="release-archive__actions">',
    '<button type="button" class="release-archive__more" (click)="loadArchive()" [disabled]="loading()">',
    `{{ loading() ? 'Loading…' : 'Show ${archived} older releases' }}`,
    '</button>',
    '</div>',
    '}',
    '@for (release of archive(); track release.version) {',
    '<section class="release-note">',
    '<h3 [id]="release.anchor">{{ release.heading }}</h3>',
    '<p class="release-note__date">',
    '<time [attr.datetime]="release.date">{{ release.formattedDate }}</time>',
    '</p>',
    // Archive HTML is generated by toInjectableHtml above and still passes
    // through Angular's sanitizer on the way in. No bypass, by design.
    '<div class="release-note__body" [innerHTML]="release.html"></div>',
    '</section>',
    '}',
  ].join('\n');
}

/**
 * The archived releases, as a lazily imported TypeScript module.
 *
 * @param {object[]} sources newest first
 * @param {number} [recent]
 */
export function emitArchiveTs(sources, recent = RECENT_RELEASE_COUNT) {
  const archived = sources.slice(recent);

  const entries = archived.map((source) =>
    [
      '  {',
      `    version: '${escapeSingle(source.version)}',`,
      `    date: '${escapeSingle(source.date)}',`,
      `    title: '${escapeSingle(source.title)}',`,
      `    anchor: '${escapeSingle(anchorFor(source.version))}',`,
      `    heading: '${escapeSingle(headingFor(source.version, source.title))}',`,
      `    formattedDate: '${escapeSingle(formatDate(source.date))}',`,
      `    html: '${escapeSingle(toInjectableHtml(renderMarkdown(source.body)))}',`,
      '  },',
    ].join('\n')
  );

  return [
    BANNER,
    '',
    '/** A release old enough to have been split out of the page template. */',
    'export interface ArchivedRelease {',
    '  readonly version: string;',
    '  readonly date: string;',
    '  readonly title: string;',
    '  /** The published id: `v` + version. Deep links depend on it. */',
    '  readonly anchor: string;',
    '  readonly heading: string;',
    '  readonly formattedDate: string;',
    '  /** Sanitizer-safe HTML: no routerLink, no Angular components, no styles. */',
    '  readonly html: string;',
    '}',
    '',
    'export const RELEASE_ARCHIVE: readonly ArchivedRelease[] = [',
    ...entries,
    '];',
    '',
  ].join('\n');
}

/**
 * Rewrites a rendered release into markup that behaves correctly once it is
 * assigned to [innerHTML]. See the note at the top of this file.
 */
export function toInjectableHtml(template) {
  let html = template;

  // `[routerLink]="['/prints']"` and `routerLink="/prints"` both become an href.
  html = html.replace(
    /\s\[routerLink\]="\[([^\]]*)\]"/g,
    (_, inner) => ` href="${routeFromArray(inner)}"`
  );
  html = html.replace(
    /\srouterLink="([^"]*)"/g,
    (_, route) => ` href="${route}"`
  );

  // MatIcon renders a ligature span; injected markup has to be that span already.
  html = html.replace(
    /<mat-icon\b[^>]*>([\s\S]*?)<\/mat-icon\s*>/gi,
    (_, name) =>
      `<span class="material-icons release-note__icon" aria-hidden="true">${name.trim()}</span>`
  );

  // Angular's sanitizer drops `style` outright, so an inline style is not a
  // downgrade here -- it is markup that would silently disappear.
  html = html.replace(/\sstyle="[^"]*"/g, '');

  return html;
}

/** `'/docs', 'prints'` -> `/docs/prints`. */
function routeFromArray(inner) {
  return inner
    .split(',')
    .map((part) => part.trim().replace(/^'|'$/g, ''))
    .filter(Boolean)
    .join('/')
    .replace(/\/{2,}/g, '/');
}

/** Plain text on its way into markup. */
function escapeText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeSingle(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, '\\n');
}
