import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import {
  CelebrationItem,
  CelebrationPresenter,
} from '../../core/services/achievement-celebration.service';
import { AchievementCategory, TIER_NAMES } from '../../core/types/achievement';
import { AchievementBadgeComponent } from '../../shared/achievements/achievement-badge.component';
import { REQUIRED_GLYPHS } from '../../shared/achievements/achievement-glyphs';

/**
 * Every glyph on every fill, at every size: the art review sheet (spec §9). Registered only in
 * non-production builds and linked from nowhere.
 */
@Component({
  selector: 'app-achievement-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AchievementBadgeComponent, MatButtonModule],
  template: `
    <h1>Badge gallery</h1>
    <div class="previews">
      @for (p of previews; track p.label) {
        <button mat-stroked-button type="button" (click)="p.show()">
          {{ p.label }}
        </button>
      }
    </div>
    <table>
      <thead>
        <tr>
          <th>Glyph</th>
          @for (name of tierNames; track name) {
            <th>{{ name }}</th>
          }
          @for (c of oneTime; track c.label) {
            <th>{{ c.label }}</th>
          }
          <th>Sizes</th>
        </tr>
      </thead>
      <tbody>
        @for (glyph of glyphs; track glyph) {
          <tr>
            <th>{{ glyph }}</th>
            @for (name of tierNames; track name; let i = $index) {
              <td>
                <app-achievement-badge
                  [glyph]="glyph"
                  [category]="Milestones"
                  [tier]="i + 1"
                  [numeral]="250"
                  [label]="glyph"
                />
              </td>
            }
            @for (c of oneTime; track c.label) {
              <td>
                <app-achievement-badge
                  [glyph]="glyph"
                  [category]="c.category"
                  [oneTime]="true"
                  [numeral]="10"
                  [label]="glyph"
                />
              </td>
            }
            <td class="sizes">
              <app-achievement-badge
                [glyph]="glyph"
                [category]="Milestones"
                [tier]="3"
                size="sm"
                [label]="glyph"
              />
              <app-achievement-badge
                [glyph]="glyph"
                [category]="Milestones"
                [tier]="3"
                size="lg"
                [label]="glyph"
              />
              <app-achievement-badge
                [glyph]="glyph"
                [category]="Milestones"
                [tier]="3"
                [locked]="true"
                [label]="glyph"
              />
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host {
      display: block;
      padding: 16px;
      overflow-x: auto;
    }
    table {
      border-collapse: collapse;
    }
    th,
    td {
      padding: 6px 8px;
      text-align: center;
      font-size: 12px;
    }
    tbody th {
      text-align: right;
      font-family: monospace;
    }
    .sizes {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `,
})
export class AchievementGalleryComponent {
  private readonly presenter = inject(CelebrationPresenter);

  /** Plays the real celebration UI with sample data, without earning anything. */
  protected readonly previews: { label: string; show: () => void }[] = [
    {
      label: 'Modal: First Layer',
      show: () =>
        void this.presenter.dialog(
          preview('first-print', 1, 'You logged your first print.')
        ),
    },
    {
      label: 'Modal: Marathon, Gold Silk',
      show: () =>
        void this.presenter.dialog(
          preview(
            'longest-print',
            3,
            'Gold Silk · You finished a 48-hour print.'
          )
        ),
    },
    {
      label: 'Toast: two badges',
      show: () =>
        void this.presenter.toast(
          [
            preview('first-printer', 1, 'You added your first printer.'),
            preview(
              'prints-logged',
              2,
              "Silver PLA · You've logged 25 prints."
            ),
          ],
          { quiet: false }
        ),
    },
    {
      label: 'Toast: launch summary',
      show: () =>
        void this.presenter.toast(
          [
            {
              id: 'preview-summary',
              achievement: { key: null, tier: null, summary: true, count: 12 },
              title: "You've earned 12 achievements",
              message: null,
            },
          ],
          { quiet: false }
        ),
    },
  ];

  protected readonly Milestones = AchievementCategory.Milestones;
  protected readonly tierNames = TIER_NAMES;
  protected readonly glyphs = [
    ...REQUIRED_GLYPHS,
    'initials:Cu',
    'initials:Bs',
  ];
  protected readonly oneTime = [
    { label: 'Getting started', category: AchievementCategory.GettingStarted },
    { label: 'Integrations', category: AchievementCategory.Integrations },
    { label: 'Community', category: AchievementCategory.Community },
    { label: 'Hidden', category: AchievementCategory.Hidden },
  ];
}

function preview(key: string, tier: number, message: string): CelebrationItem {
  return {
    id: `preview-${key}-${tier}`,
    achievement: { key, tier, summary: false, count: null },
    title: 'Achievement unlocked',
    message,
  };
}
