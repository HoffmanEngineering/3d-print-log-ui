import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { lastValueFrom, of, timer } from 'rxjs';
import { catchError, concatMap, map, takeWhile } from 'rxjs/operators';
import { AchievementService } from '../../../core/services/achievement.service';
import { MyAchievements } from '../../../core/types/achievement';
import { GettingStartedChecklistComponent } from '../../../onboarding/getting-started-checklist/getting-started-checklist.component';
import { GETTING_STARTED_KEYS } from '../../../onboarding/onboarding-api.service';
import { OnboardingService } from '../../../onboarding/onboarding.service';
import { NextAchievementHintComponent } from '../next-achievement-hint/next-achievement-hint.component';

type SlotCard = 'none' | 'checklist' | 'hint';

/** Badges are granted after the printer's commit, so one late re-read covers the gap. */
const PRINTER_BADGE_RETRY_MS = 2000;

/**
 * The one card above the prints list: the getting-started checklist while a new user is
 * onboarding, otherwise the next-achievement hint. It fetches the user's achievements once and
 * hands them to whichever card shows. Renders nothing until it knows which.
 */
@Component({
  selector: 'app-print-list-hint-slot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GettingStartedChecklistComponent, NextAchievementHintComponent],
  template: `
    @switch (card()) {
      @case ('checklist') {
        <app-getting-started-checklist
          [me]="me()!"
          (dismissed)="onDismissed()"
          (printerAdded)="onPrinterAdded()"
        />
      }
      @case ('hint') {
        <app-next-achievement-hint [me]="me() ?? undefined" />
      }
    }
  `,
})
export class PrintListHintSlotComponent implements OnInit {
  private readonly achievements = inject(AchievementService);
  private readonly onboarding = inject(OnboardingService);
  private readonly destroyRef = inject(DestroyRef);

  /** True while the checklist shows; the list holds its no-printer toast back meanwhile. */
  readonly checklistActive = output<boolean>();
  /** The checklist's quick-add saved a printer without leaving the list. */
  readonly printerAdded = output<void>();

  protected readonly card = signal<SlotCard>('none');
  /** Null when the lookup failed; the hint then makes its own request and handles the error. */
  protected readonly me = signal<MyAchievements | null>(null);

  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => (this.destroyed = true));
  }

  ngOnInit(): void {
    void this.decide();
  }

  protected onDismissed(): void {
    this.card.set('hint');
    this.checklistActive.emit(false);
  }

  protected onPrinterAdded(): void {
    this.printerAdded.emit();
    const read = () => this.achievements.me().pipe(catchError(() => of(null)));
    read()
      .pipe(
        concatMap((first) =>
          first && this.hasPrinterBadge(first)
            ? of(first)
            : timer(PRINTER_BADGE_RETRY_MS).pipe(
                concatMap(() => read()),
                map((second) => second ?? first)
              )
        ),
        takeWhile(() => this.card() === 'checklist'),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((me) => {
        if (me) {
          this.me.set(me);
        }
      });
  }

  private async decide(): Promise<void> {
    let me: MyAchievements | null;
    try {
      me = await lastValueFrom(this.achievements.me());
    } catch {
      me = null;
    }
    const visible = await this.onboarding.checklistVisible(me);
    if (this.destroyed) {
      return;
    }
    this.me.set(me);
    this.card.set(visible ? 'checklist' : 'hint');
    this.checklistActive.emit(visible);
  }

  private hasPrinterBadge(me: MyAchievements): boolean {
    return OnboardingService.hasEarned(me, GETTING_STARTED_KEYS.printer);
  }
}
