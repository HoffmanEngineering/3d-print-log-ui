import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of } from 'rxjs';

import { AchievementService } from '../../../core/services/achievement.service';
import { LoggingService } from '../../../core/services/logging.service';
import { AchievementFamily, NextHint } from '../../../core/types/achievement';
import { AchievementBadgeComponent } from '../../../shared/achievements/achievement-badge.component';

interface Hint {
  hint: NextHint;
  family: AchievementFamily;
}

/**
 * A nudge above the prints list: the one badge closest to hand, with a button that goes where it
 * is earned. Renders nothing while loading, on any error, when there is no hint, or once
 * dismissed.
 */
@Component({
  selector: 'app-next-achievement-hint',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AchievementBadgeComponent,
    MatButtonModule,
    MatIconModule,
    RouterLink,
  ],
  template: `
    @if (visible(); as h) {
      <div class="hint">
        <app-achievement-badge
          [glyph]="h.family.glyph"
          [category]="h.family.category"
          [tier]="h.hint.tier"
          [oneTime]="h.family.tiers.length === 1"
          [numeral]="h.family.tiers[h.hint.tier - 1]?.threshold"
          [locked]="true"
          [label]="h.family.title"
          size="md"
        />
        <div class="text">
          <strong>Next achievement: {{ h.family.title }}</strong>
          <span>{{ h.family.tiers[h.hint.tier - 1]?.description }}</span>
        </div>
        <a
          mat-stroked-button
          class="cta"
          [routerLink]="h.hint.ctaRoute"
          (click)="clicked(h.hint)"
        >
          Let's go
        </a>
        <button
          mat-icon-button
          type="button"
          class="dismiss"
          aria-label="Dismiss achievement hint"
          (click)="dismiss(h.hint)"
        >
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }
  `,
  styles: `
    .hint {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 8px 0 12px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
      background: var(--mat-sys-surface-container-low, transparent);
    }
    .text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      font-size: 14px;
    }
  `,
})
export class NextAchievementHintComponent {
  private readonly achievements = inject(AchievementService);
  private readonly logging = inject(LoggingService);

  private readonly dismissed = signal(false);

  private readonly loaded = toSignal(
    combineLatest([this.achievements.me(), this.achievements.catalog()]).pipe(
      map(([me, catalog]): Hint | null => {
        const hint = me.nextHint;
        if (!hint) return null;
        const family = [...catalog.families, ...me.revealedHidden].find(
          (f) => f.key === hint.key
        );
        return family ? { hint, family } : null;
      }),
      catchError(() => of(null))
    ),
    { initialValue: null }
  );

  protected readonly visible = computed(() =>
    this.dismissed() ? null : this.loaded()
  );

  protected clicked(hint: NextHint): void {
    this.logging.logEvent('AchievementHint_Clicked', {
      key: hint.key,
      tier: hint.tier,
    });
  }

  protected dismiss(hint: NextHint): void {
    this.dismissed.set(true);
    this.logging.logEvent('AchievementHint_Dismissed', {
      key: hint.key,
      tier: hint.tier,
    });
    this.achievements
      .dismissHint(hint.key, hint.tier)
      .subscribe({ error: () => undefined });
  }
}
