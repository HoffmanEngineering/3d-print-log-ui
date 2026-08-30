import { DOC_PAGES, DocManifestPage } from './generated/docs-manifest';

/** A page as the prev/next and related links present it. */
export interface DocLink {
  readonly path: string;
  readonly navLabel: string;
  readonly description: string;
}

/**
 * The pages a reader can actually reach, in sidebar order.
 *
 * `DOC_PAGES` is already ordered by group and then by `order` — the sidebar
 * walks it verbatim — so "the next page" is simply the next entry. A dormant
 * page has no route, so it is skipped rather than offered as a dead end.
 */
const ROUTED = DOC_PAGES.filter((page) => !page.dormant);

const toLink = (page: DocManifestPage): DocLink => ({
  path: page.path,
  navLabel: page.navLabel,
  description: page.description,
});

/**
 * The pages either side of `path` in reading order.
 *
 * Both ends are open: the first page has no previous and the last has no next,
 * and the docs deliberately do not wrap around. A "next" on the last page that
 * lands back on Getting Started tells the reader they are in a loop, not that
 * they have finished.
 */
export function neighborsOf(path: string): {
  previous: DocLink | null;
  next: DocLink | null;
} {
  const at = ROUTED.findIndex((page) => page.path === path);
  if (at < 0) {
    return { previous: null, next: null };
  }

  return {
    previous: at > 0 ? toLink(ROUTED[at - 1]) : null,
    next: at < ROUTED.length - 1 ? toLink(ROUTED[at + 1]) : null,
  };
}

/**
 * The pages named by this page's `related` frontmatter, in the order authored.
 *
 * A slug that names nothing routable is dropped rather than rendered as a dead
 * link — `validate-docs` already fails the build on an unknown slug, so this
 * only covers a page going dormant.
 */
export function relatedTo(path: string): readonly DocLink[] {
  const page = ROUTED.find((entry) => entry.path === path);
  if (!page) return [];

  return page.related
    .map((slug) => ROUTED.find((entry) => entry.slug === slug))
    .filter((entry): entry is DocManifestPage => entry !== undefined)
    .map(toLink);
}
