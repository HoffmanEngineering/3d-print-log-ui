import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BADGE_DEFS_SVG } from './achievement-badge-art';

/**
 * The one copy of every gradient and pattern the badges paint with (spec §9). Mounted once in
 * the app shell, logged in or not, because public pages show badges too. Badges reference these
 * ids with `url(#…)` and never define their own, so a page full of badges has no duplicate ids.
 */
@Component({
  selector: 'app-achievement-badge-defs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg width="0" height="0" focusable="false">
      <defs>${BADGE_DEFS_SVG}</defs>
    </svg>
  `,
  styles: `
    :host {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
    }
  `,
})
export class AchievementBadgeDefsComponent {}
