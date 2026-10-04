import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';

import { AchievementDetailComponent } from '../../achievements/achievement-detail/achievement-detail.component';
import { AchievementGridComponent } from '../../achievements/achievement-grid/achievement-grid.component';
import { AchievementService } from '../../core/services/achievement.service';
import {
  AchievementCatalog,
  AchievementFamily,
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
  imports: [AchievementGridComponent, AchievementDetailComponent, RouterLink],
  template: `
    <div class="page">
      <h1>Achievements</h1>
      @if (view(); as v) {
        @if (v.dto.earnedTierCount === 0) {
          <p class="empty">
            No achievements to show yet.
            <a routerLink="/docs/achievements">How achievements work</a>
          </p>
        } @else {
          <p class="count">{{ v.dto.earnedTierCount }} tiers earned</p>
          <app-achievement-grid
            [catalog]="v.catalog"
            [earned]="earned()"
            [progress]="noProgress"
            [revealedHidden]="v.dto.revealedHidden"
            (selected)="selectedKey.set($event)"
          />
          @if (selection(); as sel) {
            <aside>
              <app-achievement-detail
                [family]="sel.family"
                [earned]="sel.earned"
              />
            </aside>
          }
        }
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
    aside {
      margin-top: 24px;
      border-radius: 16px;
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
    }
  `,
})
export class UserAchievementsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly achievements = inject(AchievementService);

  protected readonly noProgress = new Map<string, AchievementProgress | null>();
  protected readonly selectedKey = signal<string | null>(null);

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

  protected readonly selection = computed(() => {
    const key = this.selectedKey();
    const v = this.view();
    if (!key || !v) return null;
    const families: AchievementFamily[] = [
      ...v.catalog.families,
      ...v.dto.revealedHidden,
    ];
    const family = families.find((f) => f.key === key);
    return family ? { family, earned: this.earned().get(key) ?? [] } : null;
  });
}
