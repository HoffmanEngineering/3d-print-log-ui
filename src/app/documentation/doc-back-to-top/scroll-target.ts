/**
 * When the "back to top" button is worth showing.
 *
 * Two screens down is far enough that the reader can no longer flick back with
 * one gesture, and far enough that the button does not appear and vanish while
 * someone is nudging around near the top of a page.
 */
const SCREENS_BEFORE_SHOWING = 2;

export function shouldShowBackToTop(
  scrollTop: number,
  viewportHeight: number
): boolean {
  return scrollTop > viewportHeight * SCREENS_BEFORE_SHOWING;
}
