import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  AchievementCatalog,
  AchievementCategory,
  AchievementFamily,
  AchievementProgress,
  EarnedTier,
  TIER_NAMES,
} from '../../core/types/achievement';
import { AchievementBadgeComponent } from '../../shared/achievements/achievement-badge.component';

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  [AchievementCategory.GettingStarted]: 'Getting started',
  [AchievementCategory.Milestones]: 'Milestones',
  [AchievementCategory.Streaks]: 'Streaks',
  [AchievementCategory.Integrations]: 'Integrations',
  [AchievementCategory.Community]: 'Community and care',
  [AchievementCategory.Hidden]: 'Hidden',
};

const CATEGORY_ORDER = [
  AchievementCategory.GettingStarted,
  AchievementCategory.Milestones,
  AchievementCategory.Streaks,
  AchievementCategory.Integrations,
  AchievementCategory.Community,
  AchievementCategory.Hidden,
];

interface Cell {
  family: AchievementFamily;
  /** Highest tier held, or 0. */
  held: number;
  /** The tier the badge shows: the highest held, or the first when nothing is. */
  shown: number;
  progress: AchievementProgress | null;
  percent: number;
}

interface Section {
  category: AchievementCategory;
  label: string;
  cells: Cell[];
  secrets: number;
}

/**
 * The trophy shelf: every family grouped by category, earned badges in color and the rest as
 * locked silhouettes. Presentational, so it serves both the user's own collection (with progress)
 * and a public profile (an empty progress map shows no bars).
 */
@Component({
  selector: 'app-achievement-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AchievementBadgeComponent, MatProgressBarModule],
  template: `
    @for (section of sections(); track section.category) {
      <section [class.hidden]="section.category === Hidden">
        <h2>{{ section.label }}</h2>
        <div class="cells">
          @for (cell of section.cells; track cell.family.key) {
            <button
              type="button"
              class="cell"
              [class.earned]="cell.held > 0"
              [attr.data-key]="cell.family.key"
              (click)="selected.emit(cell.family.key)"
            >
              <app-achievement-badge
                [glyph]="cell.family.glyph"
                [category]="cell.family.category"
                [tier]="cell.shown"
                [oneTime]="cell.family.tiers.length === 1"
                [numeral]="cell.family.tiers[cell.shown - 1]?.threshold"
                [locked]="cell.held === 0"
                [label]="cell.family.title"
                size="md"
              />
              <span class="title">{{ cell.family.title }}</span>
              @if (cell.held > 0 && cell.family.tiers.length > 1) {
                <span class="tier">{{ tierName(cell.held) }}</span>
              }
              @if (cell.progress; as p) {
                <mat-progress-bar mode="determinate" [value]="cell.percent" />
                <span class="count">{{ p.best }} / {{ p.nextThreshold }}</span>
              }
            </button>
          }
          @for (s of secretSlots(section.secrets); track $index) {
            <div class="cell secret" aria-label="Hidden achievement">
              <app-achievement-badge
                glyph="question"
                [category]="Hidden"
                [hidden]="true"
                [locked]="true"
                size="md"
              />
              <span class="title">???</span>
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    section + section {
      margin-top: 24px;
    }
    h2 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 12px;
    }
    .cells {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
      gap: 12px;
    }
    .cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 8px;
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low, transparent);
      color: inherit;
      font: inherit;
      text-align: center;
      cursor: pointer;
    }
    .cell.secret {
      cursor: default;
    }
    .cell:focus-visible {
      outline: 2px solid var(--mat-sys-primary, #3f51b5);
      outline-offset: 2px;
    }
    .title {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.2;
    }
    .tier,
    .count {
      font-size: 12px;
      opacity: 0.7;
    }
    mat-progress-bar {
      width: 80%;
    }
  `,
})
export class AchievementGridComponent {
  readonly catalog = input.required<AchievementCatalog>();
  readonly earned = input.required<Map<string, EarnedTier[]>>();
  /** Empty on public pages: no progress bars. */
  readonly progress = input<Map<string, AchievementProgress | null>>(new Map());
  readonly revealedHidden = input<AchievementFamily[]>([]);
  readonly selected = output<string>();

  protected readonly Hidden = AchievementCategory.Hidden;

  protected readonly sections = computed<Section[]>(() => {
    const families = [...this.catalog().families, ...this.revealedHidden()];
    return CATEGORY_ORDER.map((category) => {
      const cells = families
        .filter((f) => f.category === category)
        .map((family) => this.cell(family));
      const secrets =
        category === AchievementCategory.Hidden
          ? Math.max(
              0,
              this.catalog().hiddenCount - this.revealedHidden().length
            )
          : 0;
      return { category, label: CATEGORY_LABELS[category], cells, secrets };
    }).filter((s) => s.cells.length > 0 || s.secrets > 0);
  });

  private cell(family: AchievementFamily): Cell {
    const tiers = this.earned().get(family.key) ?? [];
    const held = tiers.reduce((max, t) => Math.max(max, t.tier), 0);
    const progress = this.progress().get(family.key) ?? null;
    const percent = progress
      ? Math.min(
          100,
          Math.round((progress.best / progress.nextThreshold) * 100)
        )
      : 0;
    return { family, held, shown: Math.max(held, 1), progress, percent };
  }

  protected tierName(tier: number): string {
    return TIER_NAMES[tier - 1] ?? '';
  }

  protected secretSlots(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }
}
