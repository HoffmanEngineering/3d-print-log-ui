// This file is required by karma.conf.js and loads recursively all the .spec and framework files
import 'zone.js/testing'; // zone-testing needs to come before any other import

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// Polyfill TouchEvent to accept plain objects in touches/changedTouches arrays.
// Chrome's strict TouchEvent constructor rejects plain objects; this wrapper
// converts them to real Touch instances so tests can use `{ clientX: n } as Touch`.
(function patchTouchEvent() {
  const OriginalTouchEvent = window.TouchEvent;
  if (!OriginalTouchEvent) return;

  function toRealTouch(t: Partial<Touch>): Touch {
    if (t instanceof Touch) return t;
    return new Touch({
      identifier: t.identifier ?? 0,
      target: t.target ?? document.body,
      clientX: t.clientX ?? 0,
      clientY: t.clientY ?? 0,
      screenX: t.screenX ?? 0,
      screenY: t.screenY ?? 0,
      pageX: t.pageX ?? 0,
      pageY: t.pageY ?? 0,
      radiusX: t.radiusX ?? 0,
      radiusY: t.radiusY ?? 0,
      rotationAngle: t.rotationAngle ?? 0,
      force: t.force ?? 0,
    });
  }

  const PatchedTouchEvent = function (type: string, init?: TouchEventInit) {
    const patchedInit: TouchEventInit = { ...init };
    if (init?.touches) {
      patchedInit.touches = Array.from(init.touches).map(toRealTouch);
    }
    if (init?.changedTouches) {
      patchedInit.changedTouches = Array.from(init.changedTouches).map(
        toRealTouch
      );
    }
    if (init?.targetTouches) {
      patchedInit.targetTouches = Array.from(init.targetTouches).map(
        toRealTouch
      );
    }
    return new OriginalTouchEvent(type, patchedInit);
  };
  PatchedTouchEvent.prototype = OriginalTouchEvent.prototype;
  Object.defineProperty(window, 'TouchEvent', { value: PatchedTouchEvent });
})();

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  [BrowserDynamicTestingModule, NoopAnimationsModule],
  platformBrowserDynamicTesting(),
  { teardown: { destroyAfterEach: true } }
);
