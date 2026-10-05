import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  MatBottomSheet,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { map } from 'rxjs';

import { LoggingService } from '../../core/services/logging.service';
import {
  AchievementCatalog,
  AchievementFamily,
  AchievementProgress,
  EarnedTier,
} from '../../core/types/achievement';
import {
  AchievementDetailComponent,
  AchievementDetailSheetComponent,
  AchievementDetailSheetData,
} from '../achievement-detail/achievement-detail.component';
import { AchievementGridComponent } from '../achievement-grid/achievement-grid.component';

/**
 * The grid plus its detail view, shared by /achievements and /users/:id/achievements. On wide
 * screens the detail is a side panel that stays in view while the grid scrolls; on narrow ones it
 * is a bottom sheet. The page owns the selection (it lives in the `?badge` query param) and
 * projects its own header above the grid.
 */
@Component({
  selector: 'app-achievement-browser',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AchievementGridComponent,
    AchievementDetailComponent,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="layout" [class.with-panel]="wide() && !!selection()">
      <main>
        <ng-content />
        <app-achievement-grid
          data-cy="capture-achievements-grid"
          [catalog]="catalog()"
          [earned]="earned()"
          [progress]="progress()"
          [revealedHidden]="revealedHidden()"
          (selected)="selectedKeyChange.emit($event)"
        />
      </main>

      @if (wide() && selection(); as sel) {
        <aside>
          <button
            mat-icon-button
            class="close"
            aria-label="Close details"
            (click)="selectedKeyChange.emit(null)"
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
    :host {
      display: block;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 24px;
    }
    .layout.with-panel {
      grid-template-columns: minmax(0, 1fr) 340px;
    }
    main {
      min-width: 0;
    }
    /* Sticky below the fixed navbar (see app-navbar in styles.scss), and scrollable on its own
       when a long tier ladder is taller than the viewport. */
    aside {
      position: sticky;
      top: 80px;
      align-self: start;
      max-height: calc(100vh - 96px);
      overflow-y: auto;
      border-radius: 16px;
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
      background: var(--mat-sys-surface-container-low, transparent);
    }
    .close {
      float: right;
    }
  `,
})
export class AchievementBrowserComponent {
  readonly catalog = input.required<AchievementCatalog>();
  readonly earned = input.required<Map<string, EarnedTier[]>>();
  /** Empty on public pages: no progress bars. */
  readonly progress = input<Map<string, AchievementProgress | null>>(new Map());
  readonly revealedHidden = input<AchievementFamily[]>([]);
  readonly selectedKey = input<string | null>(null);
  /** Which page the browser is on, for analytics. */
  readonly source = input.required<'mine' | 'profile'>();
  /** A badge was picked, or (null) the detail was closed. */
  readonly selectedKeyChange = output<string | null>();

  private readonly logging = inject(LoggingService);
  private readonly bottomSheet = inject(MatBottomSheet);

  protected readonly wide = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 960px)')
      .pipe(map((r) => r.matches)),
    { initialValue: true }
  );

  protected readonly selection = computed<AchievementDetailSheetData | null>(
    () => {
      const key = this.selectedKey();
      if (!key) return null;
      const family = [
        ...this.catalog().families,
        ...this.revealedHidden(),
      ].find((f) => f.key === key);
      if (!family) return null;
      return {
        family,
        earned: this.earned().get(family.key) ?? [],
        progress: this.progress().get(family.key) ?? null,
      };
    }
  );

  private sheet: MatBottomSheetRef<AchievementDetailSheetComponent> | null =
    null;
  private loggedDetail: string | null = null;

  constructor() {
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
            source: this.source(),
          });
        }
        this.loggedDetail = key;
        this.syncSheet(sel, wide);
      });
    });

    inject(DestroyRef).onDestroy(() => {
      const sheet = this.sheet;
      this.sheet = null;
      sheet?.dismiss();
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
        this.selectedKeyChange.emit(null);
      }
    });
  }
}
