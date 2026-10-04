import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { Router } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';

import { AchievementService } from '../../core/services/achievement.service';
import { CelebrationItem } from '../../core/services/achievement-celebration.service';
import { TIER_NAMES } from '../../core/types/achievement';
import { AchievementBadgeComponent } from './achievement-badge.component';
import {
  AchievementVisualsService,
  BadgeVisual,
} from './achievement-visuals.service';

const SUMMARY_BADGES = 8;

/** "Earned by 9% of makers", or "fewer than 1%" below that. */
export function rarityText(percent: number | null | undefined): string | null {
  if (percent === null || percent === undefined) return null;
  if (percent < 1) return 'Earned by fewer than 1% of makers';
  return `Earned by ${Math.round(percent)}% of makers`;
}

interface SummaryBadge {
  visual: BadgeVisual;
  tier: number;
}

/**
 * The big moment: the badge flips in over slowly turning rays. For the launch summary it shows
 * the badges the user's history already earned instead.
 */
@Component({
  selector: 'app-achievement-celebration-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, AchievementBadgeComponent],
  template: `
    <div class="celebration">
      @if (data.achievement.summary) {
        <h2 mat-dialog-title>{{ data.title }}</h2>
        <mat-dialog-content>
          <p>
            Your print history already earned these. They're waiting in your
            collection.
          </p>
          <div class="summary-grid">
            @for (b of summary().shown; track $index) {
              <app-achievement-badge
                [glyph]="b.visual.glyph"
                [category]="b.visual.category"
                [tier]="b.tier"
                [oneTime]="b.visual.oneTime"
                [numeral]="b.visual.family?.tiers?.[b.tier - 1]?.threshold"
                [label]="b.visual.title"
                size="md"
              />
            }
          </div>
          @if (summary().more > 0) {
            <p class="more">+{{ summary().more }} more</p>
          }
        </mat-dialog-content>
      } @else {
        <div class="stage" aria-hidden="true"><span class="rays"></span></div>
        @if (visual(); as v) {
          <app-achievement-badge
            class="flip"
            [glyph]="v.glyph"
            [category]="v.category"
            [tier]="tier()"
            [oneTime]="v.oneTime"
            [numeral]="v.family?.tiers?.[tier() - 1]?.threshold"
            [label]="v.title"
            size="lg"
          />
          @if (!v.oneTime) {
            <p class="tier">{{ tierName() }}</p>
          }
          <h2 mat-dialog-title>{{ v.title }}</h2>
        }
        <mat-dialog-content>
          <p class="description">{{ description() }}</p>
          @if (rarity(); as r) {
            <p class="rarity">{{ r }}</p>
          }
        </mat-dialog-content>
      }
      <mat-dialog-actions align="center">
        <button
          mat-stroked-button
          type="button"
          class="view"
          (click)="viewCollection()"
        >
          View collection
        </button>
        <button mat-flat-button type="button" class="nice" (click)="close()">
          Nice!
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .celebration {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding-top: 16px;
      overflow: hidden;
    }
    .stage {
      position: absolute;
      top: 0;
      left: 50%;
      width: 320px;
      height: 320px;
      margin-left: -160px;
      margin-top: -100px;
      pointer-events: none;
    }
    .rays {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: repeating-conic-gradient(
        rgba(255, 193, 7, 0.22) 0 10deg,
        transparent 10deg 20deg
      );
      mask-image: radial-gradient(circle, #000 25%, transparent 70%);
    }
    app-achievement-badge {
      position: relative;
    }
    .tier {
      margin: 8px 0 0;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity: 0.75;
    }
    .rarity {
      font-size: 13px;
      opacity: 0.7;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, auto);
      justify-content: center;
      gap: 12px;
      margin: 8px 0;
    }
    .more {
      font-weight: 600;
    }
    @media (prefers-reduced-motion: no-preference) {
      .rays {
        animation: ach-spin 18s linear infinite;
      }
      .flip {
        animation: ach-flip 900ms cubic-bezier(0.2, 1.4, 0.4, 1) both;
      }
    }
    @keyframes ach-spin {
      to {
        transform: rotate(360deg);
      }
    }
    @keyframes ach-flip {
      from {
        transform: perspective(400px) rotateY(-540deg) scale(0.3);
        opacity: 0;
      }
      to {
        transform: perspective(400px) rotateY(0) scale(1);
        opacity: 1;
      }
    }
  `,
})
export class AchievementCelebrationDialogComponent {
  protected readonly data = inject<CelebrationItem>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef);
  private readonly router = inject(Router);
  private readonly achievements = inject(AchievementService);
  private readonly visuals = inject(AchievementVisualsService);

  protected readonly tier = computed(() => this.data.achievement.tier ?? 1);
  protected readonly tierName = computed(
    () => TIER_NAMES[this.tier() - 1] ?? ''
  );

  protected readonly visual = toSignal(
    this.visuals.lookup(this.data.achievement.key),
    {
      initialValue: null,
    }
  );

  /** The message without its "Gold Silk · " prefix, which the tier label already shows. */
  protected readonly description = computed(() => {
    const message = this.data.message ?? '';
    const prefix = `${this.tierName()} · `;
    return message.startsWith(prefix) ? message.slice(prefix.length) : message;
  });

  protected readonly rarity = computed(() =>
    rarityText(this.visual()?.family?.tiers[this.tier() - 1]?.rarityPercent)
  );

  protected readonly summary = toSignal(
    this.data.achievement.summary
      ? this.achievements.me().pipe(
          switchMap((me) => {
            const earned = me.families.filter((f) => f.tiers.length > 0);
            const shown = earned.slice(0, SUMMARY_BADGES);
            const more = Math.max(
              0,
              (this.data.achievement.count ?? earned.length) - shown.length
            );
            if (shown.length === 0)
              return of({ shown: [] as SummaryBadge[], more });
            return combineLatest(
              shown.map((f) =>
                this.visuals.lookup(f.key).pipe(
                  map((visual) => ({
                    visual,
                    tier: f.tiers[f.tiers.length - 1].tier,
                  }))
                )
              )
            ).pipe(map((badges) => ({ shown: badges, more })));
          })
        )
      : of({ shown: [] as SummaryBadge[], more: 0 }),
    { initialValue: { shown: [] as SummaryBadge[], more: 0 } }
  );

  protected viewCollection(): void {
    this.dialogRef.close();
    const key = this.data.achievement.key;
    void this.router.navigate(['/achievements'], {
      queryParams: key ? { badge: key } : {},
    });
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
