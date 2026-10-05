import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';

import { AchievementService } from '../../core/services/achievement.service';
import { AchievementFamily, TIER_NAMES } from '../../core/types/achievement';
import { AchievementBadgeComponent } from '../../shared/achievements/achievement-badge.component';
import {
  BadgeVisual,
  toVisual,
} from '../../shared/achievements/achievement-visuals.service';

interface Featured {
  visual: BadgeVisual;
  tier: number;
  /** What the badge is, for a tooltip: "Prolific Printer · Silver PLA: Log 25 prints". */
  tooltip: string;
}

function tooltipFor(family: AchievementFamily, tier: number): string {
  const name =
    family.tiers.length > 1
      ? `${family.title} · ${TIER_NAMES[tier - 1] ?? ''}`
      : family.title;
  const description = family.tiers[tier - 1]?.description;
  return description ? `${name}: ${description}` : name;
}

/**
 * A maker's four best badges on their profile, linking to the full public grid. Each badge names
 * itself in a tooltip and opens its own detail there (a tap target for touch, where hover is not
 * available). Renders nothing
 * until there is something to show, and nothing at all for a profile with no visible badges.
 */
@Component({
  selector: 'app-achievement-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AchievementBadgeComponent, MatTooltipModule, RouterLink],
  template: `
    @if (strip(); as s) {
      @if (s.count > 0) {
        <div class="strip">
          <div class="badges">
            @for (f of s.featured; track f.visual.key) {
              <a
                class="badge"
                [routerLink]="['/users', userId(), 'achievements']"
                [queryParams]="{ badge: f.visual.key }"
                [matTooltip]="f.tooltip"
                [attr.aria-label]="f.tooltip"
              >
                <app-achievement-badge
                  [glyph]="f.visual.glyph"
                  [category]="f.visual.category"
                  [tier]="f.tier"
                  [oneTime]="f.visual.oneTime"
                  [numeral]="f.visual.family?.tiers?.[f.tier - 1]?.threshold"
                  [label]="f.visual.title"
                  size="md"
                />
              </a>
            }
          </div>
          <a class="all" [routerLink]="['/users', userId(), 'achievements']">
            {{ s.count }} achievements →
          </a>
        </div>
      }
    }
  `,
  styles: `
    .strip {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin: 12px 0;
    }
    .badges {
      display: flex;
      gap: 8px;
    }
    .badge {
      display: inline-flex;
      border-radius: 8px;
    }
    .badge:focus-visible {
      outline: 2px solid var(--mat-sys-primary, #3f51b5);
      outline-offset: 2px;
    }
    .all {
      font-weight: 600;
    }
  `,
})
export class AchievementStripComponent {
  readonly userId = input.required<number>();

  private readonly achievements = inject(AchievementService);

  protected readonly strip = toSignal(
    toObservable(this.userId).pipe(
      switchMap((id) =>
        combineLatest([
          this.achievements.catalog(),
          this.achievements.forUser(id),
        ])
      ),
      map(([catalog, dto]) => {
        const families: AchievementFamily[] = [
          ...catalog.families,
          ...dto.revealedHidden,
        ];
        const featured: Featured[] = dto.featured.flatMap((f) => {
          const family = families.find((c) => c.key === f.key);
          return family
            ? [
                {
                  visual: toVisual(family),
                  tier: f.highestTier,
                  tooltip: tooltipFor(family, f.highestTier),
                },
              ]
            : [];
        });
        return { count: dto.earnedTierCount, featured };
      }),
      // A public profile must never break over its badges: show nothing instead.
      catchError(() => of(null))
    ),
    { initialValue: null }
  );
}
