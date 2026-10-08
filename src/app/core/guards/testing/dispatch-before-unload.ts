/**
 * Fires a cancelable `beforeunload` at `window` and returns it, so a spec can read
 * `defaultPrevented` to see whether the page would have asked before unloading.
 *
 * Karma assigns `window.onbeforeunload` to report a test that reloaded the page, and a
 * synthetic event trips it just the same, aborting the run. It is detached for the
 * dispatch and restored afterward.
 */
export function dispatchBeforeUnload(): Event {
  const karmaHandler = window.onbeforeunload;
  window.onbeforeunload = null;
  try {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event;
  } finally {
    window.onbeforeunload = karmaHandler;
  }
}
