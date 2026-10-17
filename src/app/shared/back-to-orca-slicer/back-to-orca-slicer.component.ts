import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  PLATFORM_ID,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

/** The parts of `window` the OrcaSlicer integration uses. */
export interface OrcaSlicerHost {
  history: Pick<History, 'back'>;
  /** The webview bridge. Newer plugins open this page in their own window, where `close()` closes it. */
  orca?: { close?: () => void };
}

/**
 * OrcaSlicer's Pages tab opens the site in a webview that injects a global
 * `window.orca` (its postMessage bridge). Ordinary browsers have no such
 * global, so its presence is how the app knows it is inside OrcaSlicer.
 */
export function isInOrcaSlicer(win: unknown): boolean {
  return !!win && typeof (win as { orca?: unknown }).orca !== 'undefined';
}

/**
 * `window` when the app runs inside OrcaSlicer's webview, otherwise `null`
 * (an ordinary browser, or prerendering in Node). Read once: the webview
 * injects `window.orca` before the page loads.
 */
export const ORCA_SLICER_HOST = new InjectionToken<OrcaSlicerHost | null>(
  'ORCA_SLICER_HOST',
  {
    providedIn: 'root',
    factory: () =>
      isPlatformBrowser(inject(PLATFORM_ID)) && isInOrcaSlicer(window)
        ? window
        : null,
  }
);

/**
 * "Back to OrcaSlicer": closes the plugin's window, or (older in-tab webview)
 * goes back to the plugin's page, which has no back button of its own. Renders nothing outside
 * OrcaSlicer.
 */
@Component({
  selector: 'app-back-to-orca-slicer',
  imports: [MatButton, MatIcon],
  template: `
    @if (host) {
      <button
        mat-stroked-button
        type="button"
        data-testid="back-to-orca-slicer"
        (click)="back()"
      >
        <mat-icon aria-hidden="true">arrow_back</mat-icon>
        {{ label() }}
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackToOrcaSlicerComponent {
  readonly host = inject(ORCA_SLICER_HOST);
  readonly label = input('Back to OrcaSlicer');

  /**
   * Closes the plugin's separate window when `window.orca.close()` exists,
   * otherwise goes back in history (the older in-tab webview).
   */
  back(): void {
    const orca = this.host?.orca;
    if (typeof orca?.close === 'function') {
      orca.close();
      return;
    }
    this.host?.history.back();
  }
}
