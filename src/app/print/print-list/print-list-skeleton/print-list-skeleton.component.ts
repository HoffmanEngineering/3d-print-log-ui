import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';

/**
 * Loading placeholder for a list of prints.
 *
 * Both the print list and the grouped-by-project view show the same two
 * shapes — a stack of cards on a phone, a grid of rows on a desktop table — so
 * they share one component rather than each hand-rolling a pile of grey boxes.
 *
 * The whole block is one live region: the individual blocks are aria-hidden, so
 * a screen reader gets a single "Loading prints" instead of one announcement per
 * placeholder.
 */
@Component({
  selector: 'app-print-list-skeleton',
  templateUrl: './print-list-skeleton.component.html',
  styleUrl: './print-list-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent],
})
export class PrintListSkeletonComponent {
  readonly variant = input<'card' | 'row'>('card');

  /** How many placeholder cards or rows to draw. */
  readonly count = input(5);

  /** Row variant only: how many cells each row is split into. */
  readonly columns = input(6);

  /** What the region announces while it is busy. */
  readonly label = input('Loading prints');

  protected readonly items = computed(() =>
    Array.from({ length: Math.max(this.count(), 1) }, (_, index) => index)
  );

  protected readonly cells = computed(() =>
    Array.from({ length: Math.max(this.columns(), 1) }, (_, index) => index)
  );

  protected readonly gridTemplate = computed(
    () => `repeat(${Math.max(this.columns(), 1)}, minmax(0, 1fr))`
  );
}
