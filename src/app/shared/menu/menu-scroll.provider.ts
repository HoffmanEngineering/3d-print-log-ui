import { Provider } from '@angular/core';
import { Overlay, ScrollStrategy } from '@angular/cdk/overlay';
import { MAT_MENU_SCROLL_STRATEGY } from '@angular/material/menu';

/**
 * Stops the page scrolling while a `mat-menu` under the component is open.
 *
 * Material's default is `reposition`, which keeps an open menu glued to its trigger
 * as the page scrolls. Menus live in the CDK overlay container, whose z-index sits
 * well above the app's fixed navbar, so a repositioned menu rides up the page and
 * draws straight over the navbar.
 *
 * Blocking rather than closing on scroll. `close()` fixes the overlap too, but it
 * dismisses the menu on ANY scroll event - including ones the user did not ask for,
 * like a mobile address bar collapsing or the browser scrolling a focused element
 * into view - and a menu that vanishes on its own is worse than one that is briefly
 * in the wrong place. With scrolling blocked the overlap cannot happen at all.
 */
export const BLOCK_SCROLL_WHILE_MENU_OPEN: Provider = {
  provide: MAT_MENU_SCROLL_STRATEGY,
  useFactory:
    (overlay: Overlay): (() => ScrollStrategy) =>
    () =>
      overlay.scrollStrategies.block(),
  deps: [Overlay],
};
