/**
 * Which entry the table of contents should mark as the one you are reading.
 *
 * Pulled out of the component because the interesting behavior is a decision
 * about where the headings currently sit, and testing that through a real
 * viewport means scrolling one and waiting on callbacks that fire on the
 * browser's schedule, not the test's.
 *
 * This reads every heading's position on each sample rather than reacting to
 * IntersectionObserver callbacks. An observer reports only the targets whose
 * state CHANGED, so a callback is a delta, not a picture of the page: when a
 * second heading enters the band while the first is still in it, the callback
 * names only the second, and a reducer over that callback alone cannot know the
 * first is still there. Deltas also mean no callback at all when nothing
 * crosses a boundary — which is what a jump to the top or the bottom of a long
 * page can look like, leaving a stale answer standing. Positions are always a
 * complete, current picture, and rect reads on a throttled scroll cost less
 * than the bugs the delta model brings.
 */

/** Where one heading sits, in px from the top of the viewport. */
export interface HeadingPosition {
  readonly id: string;
  readonly top: number;
}

/**
 * The heading the reader is currently under.
 *
 * `positions` must be in document order — the generated outline already is.
 *
 * - The answer is the LAST heading whose top has passed `bandTop`: the heading
 *   the reader has most recently scrolled under.
 * - Above the first heading the answer is null. The reader has not reached any
 *   section yet, and a page can open with prose, or with a title the outline
 *   does not list, before its first entry.
 * - At the bottom of the page the answer is the last heading, whatever the
 *   geometry says. A final section shorter than the remaining viewport can
 *   never bring its own heading up to the band, so without this the rail marks
 *   the second-to-last section while the reader looks at the last one. Since
 *   this drives `aria-current`, that is a wrong answer handed to assistive
 *   technology, not just a visual smudge.
 */
export function activeHeadingAt(
  positions: readonly HeadingPosition[],
  bandTop: number,
  atBottom: boolean
): string | null {
  if (positions.length === 0) {
    return null;
  }

  if (atBottom) {
    return positions[positions.length - 1].id;
  }

  let active: string | null = null;
  for (const position of positions) {
    if (position.top > bandTop) {
      break;
    }
    active = position.id;
  }
  return active;
}

/**
 * How far below the top of the viewport a heading counts as reached, in rem.
 *
 * Tied to the headings' `scroll-margin-top` in docs-typography.scss, NOT to the
 * rail's sticky offset, which is a different number for a different reason. A
 * deep link parks its heading exactly `scroll-margin-top` below the top of the
 * viewport, and the rail has to call that heading current when it lands — so
 * the band has to reach at least that far down.
 */
const BAND_TOP_REM = 8;

/** Where the band starts, in px, for a given root font size. */
export function activeBandTopPx(rootFontSizePx: number): number {
  return BAND_TOP_REM * rootFontSizePx;
}
