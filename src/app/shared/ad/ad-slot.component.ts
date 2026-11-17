import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { AdsenseLoaderService } from '../../core/services/adsense-loader.service';
import { AD_CLIENT } from './ad-slots';

type AdWindow = Window & { adsbygoogle?: unknown[] };

/**
 * One AdSense `<ins>`, pushed at most once and only when AdSense can fill it.
 *
 * Replaces ng2-adsense, which pushed unconditionally in ngAfterViewInit. That pushed into
 * slots inside `display: none` rails on phones ("No slot size for availableWidth=0") and,
 * with the script deferred to the first interaction, queued pushes for pages the user had
 * already left ("All 'ins' elements ... already have ads in them"). Here a push needs all of:
 * the script has run, the `<ins>` is still in the document with a width, AdSense has not
 * claimed it (`data-adsbygoogle-status`), and this slot has not pushed before.
 */
@Component({
  selector: 'app-ad-slot',
  template: `<ins
    #ins
    class="adsbygoogle"
    style="display: block"
    [attr.data-ad-client]="adClient()"
    [attr.data-ad-slot]="adSlot()"
    [attr.data-ad-format]="adFormat()"
    [attr.data-full-width-responsive]="fullWidthResponsive()"
  ></ins>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdSlotComponent {
  private readonly loader = inject(AdsenseLoaderService);
  readonly adSlot = input.required<number>();
  readonly adClient = input<string>(AD_CLIENT);
  readonly adFormat = input<string>('auto');
  readonly fullWidthResponsive = input<boolean>(true);

  private readonly ins = viewChild<ElementRef<HTMLElement>>('ins');
  private observer: ResizeObserver | null = null;
  private pushed = false;
  private destroyed = false;

  constructor() {
    // Browser only: afterNextRender never runs during prerender.
    afterNextRender(() => {
      if (typeof ResizeObserver !== 'undefined') {
        this.observer = new ResizeObserver(() => this.tryPush());
        const el = this.ins()?.nativeElement;
        if (el) this.observer.observe(el);
      }
      this.tryPush();
    });

    effect(() => {
      if (this.loader.ready()) untracked(() => this.tryPush());
    });

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.stopObserving();
    });
  }

  private tryPush(): void {
    if (this.pushed || this.destroyed || !this.loader.ready()) return;
    const el = this.ins()?.nativeElement;
    if (!el || !el.isConnected || el.offsetWidth === 0) return;
    if (el.hasAttribute('data-adsbygoogle-status')) {
      // AdSense already filled it (page-level ads, say); nothing left to do.
      this.pushed = true;
      this.stopObserving();
      return;
    }
    this.pushed = true;
    this.stopObserving();
    try {
      const w = window as AdWindow;
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle throws for a slot it can't fill; the page carries on without the ad.
    }
  }

  private stopObserving(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
