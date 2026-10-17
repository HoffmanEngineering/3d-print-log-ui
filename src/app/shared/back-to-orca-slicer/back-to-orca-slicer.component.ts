import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

/** The parts of `window` the OrcaSlicer integration uses. */
export interface OrcaSlicerHost {
  history: Pick<History, 'back'>;
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
 * "Back to OrcaSlicer": the plugin's own page is the previous history entry,
 * and that webview has no back button of its own. Renders nothing outside
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
        Back to OrcaSlicer
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackToOrcaSlicerComponent {
  readonly host = inject(ORCA_SLICER_HOST);

  back(): void {
    this.host?.history.back();
  }
}
