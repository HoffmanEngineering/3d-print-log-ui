import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Read-only summary of how much filament a spool has left.
 *
 * Takes only inputs. It must never reach into the filament form: a false dirty
 * state would trip `PendingChangesGuard` and block navigation off the page.
 */
@Component({
  selector: 'app-filament-remaining-card',
  templateUrl: './filament-remaining-card.component.html',
  styleUrls: ['./filament-remaining-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
})
export class FilamentRemainingCardComponent {
  readonly remainingMg = input<number | null>(null);
  readonly projectedMg = input<number | null>(null);
  readonly isSuppressed = input(false);
  readonly nominalMg = input<number | null>(null);
  readonly lengthRemainingM = input<number | null>(null);
  readonly volumeRemainingMl = input<number | null>(null);
  readonly totalUsedMg = input<number | null>(null);
  readonly printCount = input<number | null>(null);

  /** Asks the parent to focus the nominal-weight input on an untracked spool. */
  readonly focusNominalWeight = output<void>();

  protected readonly isTracked = computed(() => this.remainingMg() !== null);

  /** The projection when one applies, otherwise the server's own figure. */
  protected readonly displayMg = computed(() =>
    this.isSuppressed()
      ? this.remainingMg()
      : (this.projectedMg() ?? this.remainingMg())
  );

  /**
   * Remaining can legitimately be negative: the API does not clamp it, because a
   * negative value means usage was logged past the spool's weight and the user
   * should see that rather than have it hidden.
   */
  protected readonly isOverUsed = computed(() => (this.displayMg() ?? 0) < 0);

  protected readonly hasPendingChange = computed(
    () =>
      !this.isSuppressed() &&
      this.projectedMg() !== null &&
      this.remainingMg() !== null &&
      Math.round(this.projectedMg()!) !== Math.round(this.remainingMg()!)
  );

  /** Clamped for the bar only; the caption still shows the real signed value. */
  protected readonly percentRemaining = computed(() => {
    const nominal = this.nominalMg();
    const remaining = this.displayMg();
    if (!nominal || nominal <= 0 || remaining === null) {
      return 0;
    }
    return Math.min(100, Math.max(0, (remaining / nominal) * 100));
  });
}
