import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  MatBottomSheet,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
import {
  AchievementDetailComponent,
  AchievementDetailSheetComponent,
  AchievementDetailSheetData,
} from '../achievement-detail/achievement-detail.component';
import { AchievementGridComponent } from '../achievement-grid/achievement-grid.component';

type PageState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; catalog: AchievementCatalog; me: MyAchievements };

const IDLE: PageState = { phase: 'idle' };
const LOADING: PageState = { phase: 'loading' };

/** The signed-in user's trophy shelf at /achievements, with a deep-linkable detail panel. */
@Component({
  selector: 'app-my-achievements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AchievementGridComponent,
    AchievementDetailComponent,
    SkeletonComponent,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
  ],
  template: `
    <div class="page" [class.with-panel]="wide() && !!selection()">
      <main>
        <header>
          <h1>Achievements</h1>
          @if (state(); as s) {
            @if (s.phase === 'ready') {
              <p class="count">
                {{ s.me.earnedTierCount }} / {{ s.me.totalTierCount }} tiers
              </p>
              <mat-progress-bar mode="determinate" [value]="overallPercent()" />
              @if (nextTitle(); as next) {
                <p class="next">Next: {{ next }}</p>
              }
              @if (s.me.earnedTierCount === 0) {
                <p class="empty">
                  Nothing earned yet. Log a print, add a printer, or connect
                  your slicer to start your collection.
                </p>
              }
            }
          }
          <a class="docs" routerLink="/docs/achievements"
            >How achievements work</a
          >
        </header>

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
          @case ('ready') {
            <app-achievement-grid
              data-cy="capture-achievements-grid"
              [catalog]="ready()!.catalog"
              [earned]="earned()"
              [progress]="progress()"
              [revealedHidden]="ready()!.me.revealedHidden"
              (selected)="select($event)"
            />
          }
        }
      </main>

      @if (wide() && selection(); as sel) {
        <aside>
          <button
            mat-icon-button
            class="close"
            aria-label="Close details"
            (click)="select(null)"
          >
            <mat-icon>close</mat-icon>
          </button>
          <app-achievement-detail
            [family]="sel.family"
            [earned]="sel.earned"
            [progress]="sel.progress"
          />
        </aside>
      }
    </div>
  `,
  styles: `
    .page {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
    }
    .page.with-panel {
      grid-template-columns: 1fr 340px;
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
    aside {
      position: sticky;
      top: 16px;
      align-self: start;
      border-radius: 16px;
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
      background: var(--mat-sys-surface-container-low, transparent);
    }
    .close {
      float: right;
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
  private readonly bottomSheet = inject(MatBottomSheet);

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

  protected readonly wide = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 960px)')
      .pipe(map((r) => r.matches)),
    { initialValue: true }
  );

  private readonly badgeParam = toSignal(
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

  protected readonly selection = computed<AchievementDetailSheetData | null>(
    () => {
      const key = this.badgeParam();
      const family = key
        ? this.allFamilies().find((f) => f.key === key)
        : undefined;
      if (!family) return null;
      return {
        family,
        earned: this.earned().get(family.key) ?? [],
        progress: this.progress().get(family.key) ?? null,
      };
    }
  );

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

  private sheet: MatBottomSheetRef<AchievementDetailSheetComponent> | null =
    null;
  private opened = false;
  private loggedDetail: string | null = null;

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

    effect(() => {
      const sel = this.selection();
      const wide = this.wide();
      untracked(() => {
        // Logged per badge opened, not per layout change: the sheet/panel swap on a resize
        // or rotation re-runs this effect without the user opening anything.
        const key = sel?.family.key ?? null;
        if (sel && key !== this.loggedDetail) {
          this.logging.logEvent('AchievementDetail_Opened', {
            key,
            earned: sel.earned.length > 0,
          });
        }
        this.loggedDetail = key;
        this.syncSheet(sel, wide);
      });
    });
  }

  protected select(key: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { badge: key },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Narrow screens show the detail as a bottom sheet instead of the side panel. */
  private syncSheet(
    sel: AchievementDetailSheetData | null,
    wide: boolean
  ): void {
    this.sheet?.dismiss();
    this.sheet = null;
    if (!sel || wide) return;

    const sheet = this.bottomSheet.open(AchievementDetailSheetComponent, {
      data: sel,
    });
    this.sheet = sheet;
    sheet.afterDismissed().subscribe(() => {
      if (this.sheet === sheet) {
        this.sheet = null;
        this.select(null);
      }
    });
  }
}
