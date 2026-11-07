import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { AD_SLOTS } from './ad-slots';
import { AdComponent } from './ad.component';

/**
 * The sidebar unit. Every page that shows it puts it in a rail that is `display: none`
 * below some width, and a slot there was pushed into zero width ("No slot size for
 * availableWidth=0"). So it is not rendered at all below `minWidth`, which must match the
 * page's own rail breakpoint.
 */
@Component({
  selector: 'app-sidebar-ad',
  template: `@if (isWide()) {
    <app-ad [adSlot]="AD_SLOTS.SIDEBAR" [fullWidthResponsive]="false"></app-ad>
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdComponent],
})
export class SidebarAdComponent {
  readonly AD_SLOTS = AD_SLOTS;
  private readonly breakpoints = inject(BreakpointObserver);
  /** The width, in px, from which the page shows its ad rail. */
  readonly minWidth = input<number>(1280);
  private readonly wide = signal(false);
  /** BreakpointObserver reports no match during prerender, so nothing renders there. */
  readonly isWide = this.wide.asReadonly();

  constructor() {
    // An effect rather than toSignal: it runs before this view is checked, and the
    // observer replays the current match synchronously, so the first paint is already right.
    effect((onCleanup) => {
      const sub = this.breakpoints
        .observe(`(min-width: ${this.minWidth()}px)`)
        .subscribe((state) => this.wide.set(state.matches));
      onCleanup(() => sub.unsubscribe());
    });
  }
}
