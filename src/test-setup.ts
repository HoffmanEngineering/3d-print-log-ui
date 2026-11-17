// Runs before every spec file, after the TestBed is initialised (angular.json `setupFiles`).

// Specs build touch events from plain objects (`{ clientX: 10 } as Touch`), which
// TouchEvent's constructor rejects: it wants real Touch instances, and jsdom has no
// Touch constructor to make them with. Construct the event without its touch lists
// and attach them afterwards.
(function patchTouchEvent() {
  const OriginalTouchEvent = window.TouchEvent;
  if (!OriginalTouchEvent) return;

  const LISTS = ['touches', 'changedTouches', 'targetTouches'] as const;

  class PatchedTouchEvent extends OriginalTouchEvent {
    constructor(type: string, init: TouchEventInit = {}) {
      const rest: TouchEventInit = { ...init };
      for (const list of LISTS) delete rest[list];
      super(type, rest);
      for (const list of LISTS) {
        const touches = init[list];
        if (touches) {
          Object.defineProperty(this, list, { value: Array.from(touches) });
        }
      }
    }
  }

  Object.defineProperty(window, 'TouchEvent', { value: PatchedTouchEvent });
})();

afterEach(() => {
  // Jasmine removed every spyOn() spy after each spec, and the specs were written
  // for that: a spy that makes localStorage throw is meant for one spec only.
  vi.restoreAllMocks();
  // A spec that fakes timers (vi.useFakeTimers) must not leave them faked for the next.
  vi.useRealTimers();
});
