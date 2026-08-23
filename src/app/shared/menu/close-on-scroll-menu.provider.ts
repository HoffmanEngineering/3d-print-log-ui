import { Provider } from '@angular/core';
import { Overlay, ScrollStrategy } from '@angular/cdk/overlay';
import { MAT_MENU_SCROLL_STRATEGY } from '@angular/material/menu';

/**
 * Makes every `mat-menu` under the component close when the page scrolls.
 *
 * Material's default is `reposition`, which keeps an open menu glued to its trigger
 * as the page scrolls. Menus live in the CDK overlay container, whose z-index sits
 * well above the app's fixed navbar, so a repositioned menu rides up the page and
 * draws straight over the navbar. Closing is the standard escape: the trigger is
 * scrolling out of view anyway, so there is nothing left for the menu to point at.
 */
export const CLOSE_MENU_ON_SCROLL_PROVIDER: Provider = {
  provide: MAT_MENU_SCROLL_STRATEGY,
  useFactory:
    (overlay: Overlay): (() => ScrollStrategy) =>
    () =>
      overlay.scrollStrategies.close(),
  deps: [Overlay],
};
