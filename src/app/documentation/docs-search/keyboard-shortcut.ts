/**
 * True for the platforms whose users expect Cmd rather than Ctrl.
 *
 * Takes the platform string rather than reading `navigator` itself, so it stays
 * pure and every caller owns its own SSR guard — `/docs` is prerendered in Node,
 * where there is no navigator to ask.
 */
export function isApplePlatform(platform: string | undefined): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(platform ?? '');
}

/** `⌘K` or `Ctrl K`, for a label the reader has to recognise at a glance. */
export function shortcutLabel(isApple: boolean): string {
  return isApple ? '⌘K' : 'Ctrl K';
}

/**
 * Whether a keydown is the "open search" chord.
 *
 * `/` is deliberately not accepted: readers type slashes into the search box
 * and into the code samples on the integration pages, and stealing it from a
 * text field is the classic version of this bug. Shift and Alt are excluded so
 * the browser keeps its own Ctrl+Shift+K and Alt+K bindings.
 */
export function isSearchShortcut(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  return (
    (event.key === 'k' || event.key === 'K') &&
    (event.metaKey || event.ctrlKey) &&
    !event.shiftKey &&
    !event.altKey
  );
}
