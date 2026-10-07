import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { AchievementCategory } from '../../core/types/achievement';
import {
  ACHIEVEMENT_GLYPHS,
  GlyphPaint,
  GlyphShape,
  INITIALS_PREFIX,
} from './achievement-glyphs';
import {
  BADGE_PALETTE,
  SHIELD_PATH,
  badgeFillId,
} from './achievement-badge-art';

// Re-exported for existing importers; the definitions live in the framework-free art module.
export { SHIELD_PATH, badgeFillId };

const SIZES = { sm: 30, md: 50, lg: 96 } as const;

/**
 * A layer-line shield badge. Pure SVG with no element ids: every gradient and pattern comes from
 * the one shared `<app-achievement-badge-defs>` sprite, so any number of badges can share a page.
 * Renders in prerender (no browser globals).
 */
@Component({
  selector: 'app-achievement-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'achievement-badge',
    '[class.locked]': 'locked()',
    '[class.tier-6]': 'fillId() === "ach-fill-t6"',
    '[style.width.px]': 'width()',
    '[style.height.px]': 'height()',
  },
  template: `
    <svg
      viewBox="0 0 50 56"
      [attr.width]="width()"
      [attr.height]="height()"
      role="img"
      [attr.aria-label]="ariaLabel()"
    >
      <path
        class="shield"
        [attr.d]="shield"
        [attr.fill]="'url(#' + fillId() + ')'"
      />
      <path class="layers" [attr.d]="shield" fill="url(#ach-layers)" />
      <svg
        class="glyph"
        x="10.5"
        y="11"
        width="29"
        height="29"
        viewBox="0 0 48 48"
      >
        @for (s of shapes(); track $index) {
          @switch (s.kind) {
            @case ('path') {
              <path
                [attr.d]="s.d"
                [attr.fill]="paint(s.fill)"
                [attr.stroke]="paint(s.stroke)"
                [attr.stroke-width]="s.strokeWidth ?? null"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            }
            @case ('rect') {
              <rect
                [attr.x]="s.x"
                [attr.y]="s.y"
                [attr.width]="s.width"
                [attr.height]="s.height"
                [attr.rx]="s.rx ?? null"
                [attr.fill]="paint(s.fill)"
                [attr.stroke]="paint(s.stroke)"
                [attr.stroke-width]="s.strokeWidth ?? null"
              />
            }
            @case ('circle') {
              <circle
                [attr.cx]="s.cx"
                [attr.cy]="s.cy"
                [attr.r]="s.r"
                [attr.fill]="paint(s.fill)"
                [attr.stroke]="paint(s.stroke)"
                [attr.stroke-width]="s.strokeWidth ?? null"
              />
            }
            @case ('line') {
              <line
                [attr.x1]="s.x1"
                [attr.y1]="s.y1"
                [attr.x2]="s.x2"
                [attr.y2]="s.y2"
                [attr.stroke]="paint(s.stroke)"
                [attr.stroke-width]="s.strokeWidth ?? null"
                stroke-linecap="round"
              />
            }
          }
        }
        @if (text(); as t) {
          <text
            x="24"
            y="25"
            text-anchor="middle"
            dominant-baseline="central"
            font-weight="800"
            [attr.font-size]="t.length > 2 ? 17 : 24"
            [attr.fill]="paint('fg')"
          >
            {{ t }}
          </text>
        }
      </svg>
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      line-height: 0;
      flex: none;
    }
    svg {
      overflow: visible;
    }
    .glyph {
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35));
    }
    :host(.locked) {
      filter: grayscale(1);
      opacity: 0.3;
    }
    @media (prefers-reduced-motion: no-preference) {
      :host-context(html.dark-theme):host(.tier-6:not(.locked)) {
        animation: ach-glow 2.6s ease-in-out infinite;
      }
    }
    :host-context(html.dark-theme):host(.tier-6:not(.locked)) {
      filter: drop-shadow(0 0 6px rgba(111, 220, 140, 0.6));
    }
    @keyframes ach-glow {
      0%,
      100% {
        filter: drop-shadow(0 0 4px rgba(111, 220, 140, 0.45));
      }
      50% {
        filter: drop-shadow(0 0 10px rgba(111, 220, 140, 0.85));
      }
    }
  `,
})
export class AchievementBadgeComponent {
  readonly glyph = input.required<string>();
  readonly category = input.required<AchievementCategory>();
  /** 1–6. Ignored for one-time badges, which use their category color. */
  readonly tier = input<number>(1);
  readonly oneTime = input<boolean>(false);
  readonly locked = input<boolean>(false);
  /** An unearned hidden badge: a "?" and no title, so nothing gives the secret away. */
  readonly hidden = input<boolean>(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** The badge's accessible name. */
  readonly label = input<string>('');
  /** The number the `numeral` glyph shows (the tier threshold). */
  readonly numeral = input<number | undefined>();

  protected readonly shield = SHIELD_PATH;

  protected readonly width = computed(() => SIZES[this.size()]);
  protected readonly height = computed(() =>
    Math.round((SIZES[this.size()] * 56) / 50)
  );

  protected readonly fillId = computed(() =>
    this.hidden()
      ? 'ach-fill-hi'
      : badgeFillId(this.category(), this.tier(), this.oneTime())
  );

  private readonly colors = computed(() => BADGE_PALETTE[this.fillId()]);

  protected readonly shapes = computed<readonly GlyphShape[]>(() => {
    const glyph = this.hidden() ? 'question' : this.glyph();
    return (
      ACHIEVEMENT_GLYPHS[glyph] ??
      (this.text() ? [] : ACHIEVEMENT_GLYPHS['question'])
    );
  });

  protected readonly text = computed<string | null>(() => {
    if (this.hidden()) return null;
    const glyph = this.glyph();
    if (glyph.startsWith(INITIALS_PREFIX))
      return glyph.slice(INITIALS_PREFIX.length);
    if (glyph === 'numeral') return this.numeral()?.toString() ?? null;
    return null;
  });

  protected readonly ariaLabel = computed(() =>
    this.hidden() ? 'Hidden achievement' : this.label()
  );

  protected paint(p: GlyphPaint | undefined): string | null {
    if (p === undefined) return null;
    if (p === 'none') return 'none';
    return this.colors()[p];
  }
}
