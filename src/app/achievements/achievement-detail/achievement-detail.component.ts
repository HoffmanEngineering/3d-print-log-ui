import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';

import {
  AchievementCategory,
  AchievementFamily,
  AchievementProgress,
  EarnedTier,
  rarityText,
  TIER_NAMES,
} from '../../core/types/achievement';
import { AchievementBadgeComponent } from '../../shared/achievements/achievement-badge.component';

interface Rung {
  tier: number;
  name: string;
  description: string;
  rarity: string | null;
  earned: EarnedTier | null;
}

/**
 * One family in depth: the tier ladder with unlock dates and rarity, the running and best streak
 * for streak families, and a note on badges granted at launch.
 */
@Component({
  selector: 'app-achievement-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AchievementBadgeComponent, DatePipe],
  template: `
    <header>
      <app-achievement-badge
        [glyph]="family().glyph"
        [category]="family().category"
        [tier]="highest() || 1"
        [oneTime]="oneTime()"
        [numeral]="family().tiers[(highest() || 1) - 1]?.threshold"
        [locked]="highest() === 0"
        [label]="family().title"
        size="lg"
      />
      <h2>{{ family().title }}</h2>
    </header>

    @if (isStreak() && progress(); as p) {
      <p class="streak">Current streak: {{ p.current }} · Best: {{ p.best }}</p>
    }

    <ol class="ladder">
      @for (rung of rungs(); track rung.tier) {
        <li class="rung" [class.earned]="!!rung.earned">
          @if (!oneTime()) {
            <span class="name">{{ rung.name }}</span>
          }
          <span class="description">{{ rung.description }}</span>
          @if (rung.earned; as e) {
            <span class="date"
              >Earned {{ e.unlockedAt | date: 'mediumDate' }}</span
            >
            @if (e.retroactive) {
              <span class="note">Earned before achievements existed</span>
            }
          }
          @if (rung.rarity; as r) {
            <span class="rarity">{{ r }}</span>
          }
        </li>
      }
    </ol>
  `,
  styles: `
    :host {
      display: block;
      padding: 16px;
    }
    header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    h2 {
      margin: 0;
      font-size: 20px;
    }
    .streak {
      text-align: center;
      font-weight: 600;
    }
    .ladder {
      list-style: none;
      padding: 0;
      margin: 16px 0 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .rung {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
      opacity: 0.6;
    }
    .rung.earned {
      opacity: 1;
      border-color: var(--mat-sys-primary, #3f51b5);
    }
    .name {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .date,
    .rarity,
    .note {
      font-size: 12px;
      opacity: 0.75;
    }
    .note {
      font-style: italic;
    }
  `,
})
export class AchievementDetailComponent {
  readonly family = input.required<AchievementFamily>();
  readonly earned = input<EarnedTier[]>([]);
  readonly progress = input<AchievementProgress | null>(null);

  protected readonly oneTime = computed(() => this.family().tiers.length === 1);
  protected readonly isStreak = computed(
    () =>
      this.family().category === AchievementCategory.Streaks &&
      this.family().key !== 'busy-day'
  );
  protected readonly highest = computed(() =>
    this.earned().reduce((max, t) => Math.max(max, t.tier), 0)
  );

  protected readonly rungs = computed<Rung[]>(() =>
    this.family().tiers.map((t) => ({
      tier: t.tier,
      name: TIER_NAMES[t.tier - 1] ?? '',
      description: t.description,
      rarity: rarityText(t.rarityPercent),
      earned: this.earned().find((e) => e.tier === t.tier) ?? null,
    }))
  );
}

export interface AchievementDetailSheetData {
  family: AchievementFamily;
  earned: EarnedTier[];
  progress: AchievementProgress | null;
}

/** The same detail, as a bottom sheet on narrow screens. */
@Component({
  selector: 'app-achievement-detail-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AchievementDetailComponent],
  template: `
    <app-achievement-detail
      [family]="data.family"
      [earned]="data.earned"
      [progress]="data.progress"
    />
  `,
})
export class AchievementDetailSheetComponent {
  protected readonly data = inject<AchievementDetailSheetData>(
    MAT_BOTTOM_SHEET_DATA
  );
}
