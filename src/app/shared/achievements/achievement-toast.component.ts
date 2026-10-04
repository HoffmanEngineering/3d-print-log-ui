import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { combineLatest, of, switchMap } from 'rxjs';

import { CelebrationItem } from '../../core/services/achievement-celebration.service';
import { AchievementCategory } from '../../core/types/achievement';
import { LoggingService } from '../../core/services/logging.service';
import { AchievementBadgeComponent } from './achievement-badge.component';
import {
  AchievementVisualsService,
  BadgeVisual,
} from './achievement-visuals.service';

const DISPLAY_MS = 6000;

const SUMMARY_BADGE: BadgeVisual = {
  key: '',
  title: 'Your achievements',
  glyph: 'stack',
  category: AchievementCategory.GettingStarted,
  oneTime: true,
  family: null,
};
const MAX_BADGES = 3;

/**
 * The small celebration: a card at the top right that pops its badge in, bursts a little CSS
 * confetti and leaves after six seconds (paused while hovered). Several achievements that arrive
 * together share one card. Clicking opens the badge in the collection.
 */
@Component({
  selector: 'app-achievement-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AchievementBadgeComponent, MatIconModule],
  template: `
    <div
      class="toast"
      [class.quiet]="quiet()"
      role="status"
      aria-live="polite"
      (mouseenter)="pause()"
      (mouseleave)="resume()"
    >
      @if (!quiet()) {
        <div class="confetti" aria-hidden="true">
          @for (c of confetti; track $index) {
            <i [style.--i]="$index"></i>
          }
        </div>
      }
      <button type="button" class="toast-body" (click)="open()">
        <span class="badges" [class.stacked]="badges().length > 1">
          @for (b of badges(); track $index) {
            <app-achievement-badge
              class="pop"
              [glyph]="b.visual.glyph"
              [category]="b.visual.category"
              [tier]="b.tier"
              [oneTime]="b.visual.oneTime"
              [numeral]="b.numeral"
              [label]="b.visual.title"
              [size]="badges().length > 1 ? 'sm' : 'md'"
            />
          }
        </span>
        <span class="text">
          @if (summary()) {
            <strong>{{ first()?.title }}</strong>
            @if (first()?.message; as message) {
              <span class="message">{{ message }}</span>
            }
          } @else if (items().length > 1) {
            <span class="eyebrow">Achievement unlocked</span>
            <strong>{{ items().length }} achievements unlocked</strong>
          } @else {
            <span class="eyebrow">Achievement unlocked</span>
            <strong>{{ badges()[0]?.visual?.title ?? first()?.title }}</strong>
            @if (first()?.message; as message) {
              <span class="message">{{ message }}</span>
            }
          }
        </span>
      </button>
      <button
        type="button"
        class="close"
        aria-label="Dismiss"
        (click)="close()"
      >
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: min(360px, calc(100vw - 32px));
    }
    .toast {
      position: relative;
      display: flex;
      align-items: flex-start;
      border-radius: 14px;
      background: var(--mat-sys-surface-container-high, #fff);
      color: var(--mat-sys-on-surface, #1b1b1f);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
      overflow: hidden;
    }
    .toast-body {
      flex: 1;
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px 4px 12px 14px;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .badges {
      display: flex;
    }
    .badges.stacked app-achievement-badge + app-achievement-badge {
      margin-left: -8px;
    }
    .text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .eyebrow {
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--mat-sys-primary, #3f51b5);
      font-weight: 600;
    }
    .message {
      font-size: 13px;
      opacity: 0.8;
    }
    .close {
      border: 0;
      background: none;
      color: inherit;
      opacity: 0.6;
      padding: 8px;
      cursor: pointer;
    }
    .confetti {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .confetti i {
      position: absolute;
      top: 50%;
      left: 40px;
      width: 6px;
      height: 10px;
      border-radius: 2px;
      opacity: 0;
      background: hsl(calc(var(--i) * 37deg) 85% 60%);
    }
    @media (prefers-reduced-motion: no-preference) {
      .toast:not(.quiet) .pop {
        animation: ach-pop 600ms cubic-bezier(0.2, 1.6, 0.4, 1) both;
      }
      .toast:not(.quiet)::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          110deg,
          transparent 30%,
          rgba(255, 255, 255, 0.45) 50%,
          transparent 70%
        );
        transform: translateX(-100%);
        animation: ach-shine 1.2s 300ms ease-out forwards;
        pointer-events: none;
      }
      .confetti i {
        animation: ach-burst 900ms ease-out forwards;
        animation-delay: calc(var(--i) * 15ms);
      }
    }
    @keyframes ach-pop {
      from {
        transform: scale(0.2) rotate(-200deg);
      }
      to {
        transform: scale(1) rotate(0);
      }
    }
    @keyframes ach-shine {
      to {
        transform: translateX(100%);
      }
    }
    @keyframes ach-burst {
      0% {
        opacity: 1;
        transform: translate(0, 0) rotate(0);
      }
      100% {
        opacity: 0;
        transform: translate(
            calc(cos(var(--i) * 30deg) * 90px),
            calc(sin(var(--i) * 30deg) * 60px)
          )
          rotate(calc(var(--i) * 70deg));
      }
    }
  `,
})
export class AchievementToastComponent implements OnInit {
  readonly items = input.required<CelebrationItem[]>();
  /** "Quiet" celebrations: the card alone, with no confetti and no motion. */
  readonly quiet = input<boolean>(false);
  readonly closed = output<void>();

  private readonly router = inject(Router);
  private readonly logging = inject(LoggingService);
  private readonly visuals = inject(AchievementVisualsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly confetti = Array.from({ length: 12 });
  protected readonly first = computed(() => this.items()[0] ?? null);
  /** The launch summary: "You've earned N achievements", a stack of badges, no tier. */
  protected readonly summary = computed(
    () => this.items().length === 1 && !!this.first()?.achievement.summary
  );

  protected readonly badges = toSignal(
    toObservable(this.items).pipe(
      switchMap((items) =>
        items.length === 0
          ? of([])
          : combineLatest(
              items.slice(0, MAX_BADGES).map((i) =>
                (i.achievement.summary
                  ? of(SUMMARY_BADGE)
                  : this.visuals.lookup(i.achievement.key)
                ).pipe(
                  switchMap((visual: BadgeVisual) =>
                    of({
                      visual,
                      tier: i.achievement.tier ?? 1,
                      numeral:
                        visual.family?.tiers[(i.achievement.tier ?? 1) - 1]
                          ?.threshold,
                    })
                  )
                )
              )
            )
      )
    ),
    { initialValue: [] }
  );

  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.resume();
    this.destroyRef.onDestroy(() => this.pause());
  }

  protected pause(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  protected resume(): void {
    this.pause();
    this.timer = setTimeout(() => this.close(), DISPLAY_MS);
  }

  protected close(): void {
    this.pause();
    this.closed.emit();
  }

  protected open(): void {
    const first = this.first();
    if (!first) return;
    this.logging.logEvent('AchievementCelebration_Clicked', {
      key: first.achievement.key,
      tier: first.achievement.tier,
      variant: this.summary()
        ? 'summary'
        : this.items().length > 1
          ? 'merged'
          : 'card',
    });
    this.close();
    void this.router.navigate(['/achievements'], {
      queryParams: first.achievement.key
        ? { badge: first.achievement.key }
        : {},
    });
  }
}
