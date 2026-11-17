/**
 * Fires a cancelable `beforeunload` at `window` and returns it, so a spec can read
 * `defaultPrevented` to see whether the page would have asked before unloading.
 */
export function dispatchBeforeUnload(): Event {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}
