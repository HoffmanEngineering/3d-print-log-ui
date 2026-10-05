import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';

import { AchievementBrowserComponent } from '../../achievements/achievement-browser/achievement-browser.component';
import { AchievementService } from '../../core/services/achievement.service';
import {
  AchievementCatalog,
  AchievementProgress,
  EarnedTier,
  EMPTY_PUBLIC_ACHIEVEMENTS,
  PublicAchievements,
} from '../../core/types/achievement';

interface View {
  catalog: AchievementCatalog;
  dto: PublicAchievements;
}

/**
 * Another maker's badges at /users/:id/achievements. Public: it must render for a logged-out
 * visitor, so every failure (an unknown user, a private profile, a network error) becomes the
 * empty state rather than an error that would bounce them off the route.
 */
@Component({
  selector: 'app-user-achievements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AchievementBrowserComponent, RouterLink],
  template: `
    <div class="page">
      @if (view(); as v) {
        @if (v.dto.earnedTierCount === 0) {
          <h1>Achievements</h1>
          <p class="empty">
            No achievements to show yet.
            <a routerLink="/docs/achievements">How achievements work</a>
          </p>
        } @else {
          <app-achievement-browser
            [catalog]="v.catalog"
            [earned]="earned()"
            [progress]="noProgress"
            [revealedHidden]="v.dto.revealedHidden"
            [selectedKey]="badgeParam()"
            source="profile"
            (selectedKeyChange)="select($event)"
          >
            <h1>Achievements</h1>
            <p class="count">{{ v.dto.earnedTierCount }} tiers earned</p>
          </app-achievement-browser>
        }
      } @else {
        <h1>Achievements</h1>
      }
    </div>
  `,
  styles: `
    .page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
    }
    .count {
      font-weight: 600;
    }
  `,
})
export class UserAchievementsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly achievements = inject(AchievementService);

  protected readonly noProgress = new Map<string, AchievementProgress | null>();

  protected readonly badgeParam = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('badge'))),
    { initialValue: null }
  );

  protected readonly view = toSignal(
    this.route.paramMap.pipe(
      map((p) => Number(p.get('id'))),
      switchMap((id) =>
        combineLatest([
          this.achievements.catalog(),
          Number.isFinite(id) && id > 0
            ? this.achievements.forUser(id)
            : of(EMPTY_PUBLIC_ACHIEVEMENTS),
        ])
      ),
      map(([catalog, dto]): View => ({ catalog, dto })),
      catchError(() =>
        of<View>({
          catalog: { version: 0, hiddenCount: 0, families: [] },
          dto: EMPTY_PUBLIC_ACHIEVEMENTS,
        })
      )
    ),
    { initialValue: null }
  );

  protected readonly earned = computed(() => {
    const map = new Map<string, EarnedTier[]>();
    for (const f of this.view()?.dto.families ?? []) map.set(f.key, f.tiers);
    return map;
  });

  protected select(key: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { badge: key },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      // Opening a badge is not a page change: keep the reader's place in the grid.
      scroll: 'manual',
    });
  }
}
