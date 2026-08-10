import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A single loading placeholder block.
 *
 * The host element *is* the block, so it drops straight into a flex or grid
 * layout in place of the content it stands in for.
 *
 * Purely decorative: it carries `aria-hidden` and contributes no text. The
 * container that swaps content for skeletons is responsible for announcing the
 * pending state (`aria-busy`, or a visually hidden status message), because a
 * screen reader user needs one announcement for the region rather than one per
 * grey box.
 *
 * The container also owns the TIMING, and it is not optional: rendering these
 * the moment a request starts makes them flash on every fast response. Gate the
 * container with `deferred-skeleton.ts` — `withDeferredSkeleton` for observable
 * state, `DeferredSkeletonController` for an imperative flag — and remember that
 * a refetch with rows already on screen should keep them rather than swap in
 * placeholders at all. See "Loading States" in AGENTS.md.
 */
@Component({
  selector: 'app-skeleton',
  template: '',
  styleUrl: './skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-skeleton',
    'aria-hidden': 'true',
    '[style.inline-size]': 'width()',
    '[style.block-size]': 'height()',
    '[style.border-radius]': 'radius()',
  },
})
export class SkeletonComponent {
  /** Any CSS length or percentage. */
  readonly width = input('100%');
  readonly height = input('1rem');
  readonly radius = input('4px');
}
