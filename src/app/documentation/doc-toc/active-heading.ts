/**
 * Which entry the table of contents should mark as the one you are reading.
 *
 * Pulled out of the component because the interesting behavior is a decision
 * about a set of intersection records, and testing that through a real
 * `IntersectionObserver` means scrolling a real viewport and waiting on
 * callbacks that fire on the browser's schedule, not the test's.
 */

/** One heading's visibility, as reported by the observer. */
export interface HeadingVisibility {
  readonly id: string;
  readonly isIntersecting: boolean;
}

/**
 * The next active heading, given what the observer just reported.
 *
 * Two rules, both of which exist because the observer only speaks about
 * headings that CHANGED state:
 *
 * 1. When several headings sit in the band at once — a run of short
 *    subsections — the topmost one wins, because that is the section heading
 *    the reader has most recently passed under.
 * 2. When nothing is in the band the previous answer stands. A section longer
 *    than the band scrolls its own heading out the top, and clearing the mark
 *    for the length of that section is worse than keeping it: the rail would
 *    go blank exactly while the reader is deepest inside a section.
 * 3. Except above the first heading, where `aboveFirstHeading` overrides rule 2
 *    and the mark clears. The reader has not reached any section yet, and a
 *    page can open with prose — or with a title the outline does not list —
 *    between the top and the first entry, so "nothing in the band" there is not
 *    the same situation as rule 2's. Without this, jumping to the top of the
 *    page (the Home key, or the back-to-top button) leaves the rail marking
 *    whatever section the reader jumped away from.
 */
export function nextActiveHeading(
  current: string | null,
  reported: readonly HeadingVisibility[],
  order: readonly string[],
  aboveFirstHeading = false
): string | null {
  let best: string | null = null;
  let bestIndex = Number.POSITIVE_INFINITY;

  for (const { id, isIntersecting } of reported) {
    if (!isIntersecting) {
      continue;
    }
    const index = order.indexOf(id);
    if (index !== -1 && index < bestIndex) {
      best = id;
      bestIndex = index;
    }
  }

  if (best !== null) {
    return best;
  }
  return aboveFirstHeading ? null : current;
}

/**
 * How far below the top of the viewport a heading counts as reached, in rem.
 *
 * Matches the rail's `top: 8rem` and the headings' `scroll-margin-top: 8rem`:
 * a heading is "reached" once it clears the app navbar and the Documentation
 * toolbar, which is exactly where a deep link parks it.
 */
const BAND_TOP_REM = 8;

/**
 * How much of the viewport below the band is excluded.
 *
 * Keeps the band near the top of the screen, so arriving at a section marks it
 * rather than the section still filling most of the viewport.
 */
const BAND_BOTTOM = '-55%';

/**
 * The observer's `rootMargin` for a given root font size.
 *
 * Built rather than written as a constant because `rootMargin` accepts ONLY px
 * and %: a `rem` value makes the IntersectionObserver constructor throw
 * `SyntaxError`, and since the observer is constructed in a render callback
 * that throw surfaces as a console error and a silently dead rail rather than
 * as anything that looks like a layout bug. The rem-to-px conversion is done
 * here so the band stays tied to the `8rem` in the stylesheets.
 */
export function activeBandRootMargin(rootFontSizePx: number): string {
  return `-${activeBandTopPx(rootFontSizePx)}px 0px ${BAND_BOTTOM} 0px`;
}

/**
 * Where the band starts, in px from the top of the viewport. Used to ask
 * whether the reader is above the first heading, which the observer cannot say
 * on its own: it only reports the headings it watches, and a page can open with
 * prose or with a title that the outline does not list.
 */
export function activeBandTopPx(rootFontSizePx: number): number {
  return BAND_TOP_REM * rootFontSizePx;
}
