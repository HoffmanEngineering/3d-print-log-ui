import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of } from 'rxjs';

import { AchievementService } from '../../core/services/achievement.service';
import { LoggingService } from '../../core/services/logging.service';
import {
  AchievementCatalog,
  AchievementFamily,
  AchievementProgress,
  EarnedTier,
  MyAchievements,
} from '../../core/types/achievement';
import { withDeferredSkeleton } from '../../shared/skeleton/deferred-skeleton';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { AchievementBrowserComponent } from '../achievement-browser/achievement-browser.component';

type PageState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; catalog: AchievementCatalog; me: MyAchievements };

const IDLE: PageState = { phase: 'idle' };
const LOADING: PageState = { phase: 'loading' };

/**
 * The signed-in user's trophy shelf at /achievements, with a deep-linkable detail panel. The header
 * is projected into the browser once loaded, so the side panel sits beside it rather than below.
 */
@Component({
  selector: 'app-my-achievements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AchievementBrowserComponent,
    NgTemplateOutlet,
    SkeletonComponent,
    MatProgressBarModule,
    RouterLink,
  ],
  template: `
    <div class="page">
      @if (ready(); as r) {
        <app-achievement-browser
          [catalog]="r.catalog"
          [earned]="earned()"
          [progress]="progress()"
          [revealedHidden]="r.me.revealedHidden"
          [selectedKey]="badgeParam()"
          source="mine"
          (selectedKeyChange)="select($event)"
        >
          <ng-container *ngTemplateOutlet="header" />
        </app-achievement-browser>
      } @else {
        <ng-container *ngTemplateOutlet="header" />
        @switch (state().phase) {
          @case ('loading') {
            <div class="skeleton-grid app-skeleton-immediate">
              @for (i of skeletonCells; track i) {
                <app-skeleton height="140px" radius="12px" />
              }
            </div>
          }
          @case ('error') {
            <p class="error">
              Your achievements couldn't be loaded. Try again in a moment.
            </p>
          }
        }
      }
    </div>

    <ng-template #header>
      <header>
        <h1>Achievements</h1>
        @if (ready(); as r) {
          <p class="count">
            {{ r.me.earnedTierCount }} / {{ r.me.totalTierCount }} tiers
          </p>
          <mat-progress-bar mode="determinate" [value]="overallPercent()" />
          @if (nextTitle(); as next) {
            <p class="next">Next: {{ next }}</p>
          }
          @if (r.me.earnedTierCount === 0) {
            <p class="empty">
              Nothing earned yet. Log a print, add a printer, or connect your
              slicer to start your collection.
            </p>
          }
        }
        <a class="docs" routerLink="/docs/achievements"
          >How achievements work</a
        >
      </header>
    </ng-template>
  `,
  styles: `
    .page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
    }
    header {
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 4px;
    }
    .count {
      font-weight: 600;
      margin: 0 0 8px;
    }
    .next {
      margin: 8px 0 0;
      opacity: 0.8;
    }
    .docs {
      display: inline-block;
      margin-top: 8px;
      font-size: 14px;
    }
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
      gap: 12px;
    }
  `,
})
export class MyAchievementsComponent {
  private readonly achievements = inject(AchievementService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly logging = inject(LoggingService);

  protected readonly skeletonCells = Array.from({ length: 12 }, (_, i) => i);

  protected readonly state = toSignal(
    combineLatest([this.achievements.catalog(), this.achievements.me()]).pipe(
      map(([catalog, me]): PageState => ({ phase: 'ready', catalog, me })),
      catchError(() => of<PageState>({ phase: 'error' })),
      withDeferredSkeleton(LOADING)
    ),
    { initialValue: IDLE }
  );

  protected readonly ready = computed(() => {
    const s = this.state();
    return s.phase === 'ready' ? s : null;
  });

  protected readonly badgeParam = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('badge'))),
    { initialValue: null }
  );

  protected readonly earned = computed(() => {
    const map = new Map<string, EarnedTier[]>();
    for (const f of this.ready()?.me.families ?? []) map.set(f.key, f.tiers);
    return map;
  });

  protected readonly progress = computed(() => {
    const map = new Map<string, AchievementProgress | null>();
    for (const f of this.ready()?.me.families ?? []) map.set(f.key, f.progress);
    return map;
  });

  private readonly allFamilies = computed<AchievementFamily[]>(() => {
    const r = this.ready();
    return r ? [...r.catalog.families, ...r.me.revealedHidden] : [];
  });

  protected readonly overallPercent = computed(() => {
    const me = this.ready()?.me;
    return me && me.totalTierCount > 0
      ? (me.earnedTierCount / me.totalTierCount) * 100
      : 0;
  });

  protected readonly nextTitle = computed(() => {
    const hint = this.ready()?.me.nextHint;
    return hint
      ? (this.allFamilies().find((f) => f.key === hint.key)?.title ?? null)
      : null;
  });

  private opened = false;

  constructor() {
    effect(() => {
      const me = this.ready()?.me;
      if (me && !this.opened) {
        this.opened = true;
        this.logging.logEvent('AchievementsPage_Opened', {
          earnedTierCount: me.earnedTierCount,
        });
      }
    });
  }

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
