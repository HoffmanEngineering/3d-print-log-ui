/**
 * Which element the docs shell actually scrolls.
 *
 * There is no single answer, which is why this is a function and not a
 * selector. `mat-sidenav-content` scrolls only when the sidenav container is
 * height-constrained; when it is not, the container is as tall as the article
 * and the document scrolls instead. The shell has been through both shapes, so
 * asking which element overflows is the only reading that stays true — an
 * out-of-date assumption here is invisible, because both candidates exist in
 * the DOM either way and neither one throws.
 *
 * That invisibility has already cost something. The scroll-depth telemetry
 * assumed `mat-sidenav-content` and got an element whose `scrollHeight` equals
 * its `clientHeight`, which `scrollPercentOf` reads as "nothing to scroll,
 * therefore fully read" — so every desktop docs visit reported 100%.
 */
export function resolveScrollContainer(doc: Document): HTMLElement {
  const content = doc.querySelector?.<HTMLElement>('mat-sidenav-content');
  if (content && scrolls(content)) {
    return content;
  }
  return doc.documentElement;
}

/**
 * Whether an element has anywhere to scroll. The one-pixel slack absorbs the
 * sub-pixel difference a fractional layout can leave between the two.
 */
export function scrolls(element: HTMLElement): boolean {
  return element.scrollHeight > element.clientHeight + 1;
}

/**
 * Selector for the navigation drawer itself, as opposed to the content beside
 * it. `mat-sidenav-content` is a SIBLING of `mat-sidenav`, not a descendant, so
 * this cleanly separates the two.
 */
const DRAWER = 'mat-sidenav, mat-drawer';

/**
 * Whether a scroller belongs to the navigation drawer rather than the article.
 *
 * Material registers the drawer's own `.mat-drawer-inner-container` as a
 * `cdkScrollable` (see sidenav.mjs), so the CDK's scroll dispatcher reports the
 * SIDEBAR moving exactly as it reports the article moving. On a phone the
 * drawer is `mode="over"` with a navigation list longer than the screen, so
 * this is not hypothetical: without the distinction, scrolling the menu to its
 * end files a "read the whole article" measurement.
 */
export function isDrawerScroller(element: HTMLElement): boolean {
  return element.closest?.(DRAWER) != null;
}
