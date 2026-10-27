import { isPlatformBrowser } from '@angular/common';
import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';

/**
 * Whether this browser can open a camera at all (it may still be denied). False during
 * prerender, where there is no navigator.
 */
export const CAMERA_AVAILABLE = new InjectionToken<boolean>(
  'CAMERA_AVAILABLE',
  {
    providedIn: 'root',
    factory: () =>
      isPlatformBrowser(inject(PLATFORM_ID)) &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function',
  }
);
