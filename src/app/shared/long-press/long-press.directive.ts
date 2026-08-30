import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  output,
} from '@angular/core';

/**
 * How long the pointer must be held before the press counts. 500ms is the platform
 * convention on both Android and iOS - shorter starts firing on deliberate taps.
 */
export const LONG_PRESS_DELAY_MS = 500;

/**
 * How far the pointer may drift and still count as stationary. A finger resting on
 * a card is never perfectly still, but a flick to scroll clears this immediately.
 */
export const LONG_PRESS_SLOP_PX = 10;

/**
 * Emits when the pointer is held still on the host element.
 *
 * Pointer events rather than touch events: the same code then covers a mouse held
 * down, which is what makes the behaviour testable and usable with a trackpad.
 *
 * The host is typically also a link. A long press ends in a `pointerup`, which the
 * browser follows with a `click` - so a press that fires has to swallow exactly one
 * following click, or selecting a card immediately navigates away from the list.
 */
@Directive({
  selector: '[appLongPress]',
  host: {
    // The native "select text / share" menu fires on the same gesture and would
    // cover the selection the moment it is made.
    '[style.-webkit-touch-callout]': '"none"',
    '[style.user-select]': '"none"',
  },
})
export class LongPressDirective {
  readonly longPress = output<PointerEvent>();

  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private origin: { x: number; y: number } | null = null;
  /** Set when a press fires, cleared by the click it causes. */
  private swallowNextClick = false;

  constructor() {
    // Listeners are added directly rather than through the `host` object so the
    // move/up/cancel handlers only exist while a press is in flight, and so the
    // click handler can run in the capture phase - the only place it can stop the
    // click before a routerLink on this same element sees it.
    this.element.addEventListener('pointerdown', this.onPointerDown);
    this.element.addEventListener('click', this.onClick, true);
    this.element.addEventListener('contextmenu', this.onContextMenu);

    inject(DestroyRef).onDestroy(() => {
      this.cancel();
      this.element.removeEventListener('pointerdown', this.onPointerDown);
      this.element.removeEventListener('click', this.onClick, true);
      this.element.removeEventListener('contextmenu', this.onContextMenu);
    });
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    // Anything but the primary button is a context menu or a back/forward click.
    if (event.button !== 0) return;

    this.cancel();
    // A fired press expects exactly one click to swallow, but it does not always get
    // one - the browser suppresses the click if the finger drifts off the element, and
    // Android often sends none at all after a long press. The flag would then still be
    // set on the NEXT press, eating a tap the user meant. A new press supersedes the
    // last one either way, so clear it here rather than trusting the click to arrive.
    this.swallowNextClick = false;
    this.origin = { x: event.clientX, y: event.clientY };

    this.element.addEventListener('pointermove', this.onPointerMove);
    this.element.addEventListener('pointerup', this.onPointerUp);
    this.element.addEventListener('pointercancel', this.onPointerUp);

    this.timer = setTimeout(() => {
      this.timer = null;
      this.swallowNextClick = true;
      this.longPress.emit(event);
      this.vibrate();
    }, LONG_PRESS_DELAY_MS);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.origin) return;

    const dx = event.clientX - this.origin.x;
    const dy = event.clientY - this.origin.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_SLOP_PX) {
      this.cancel();
    }
  };

  private readonly onPointerUp = (): void => {
    this.cancel();
  };

  private readonly onClick = (event: MouseEvent): void => {
    if (!this.swallowNextClick) return;

    this.swallowNextClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  private readonly onContextMenu = (event: MouseEvent): void => {
    // Only once the press has actually fired: a plain right-click on desktop should
    // still get its menu.
    if (this.swallowNextClick) {
      event.preventDefault();
    }
  };

  /**
   * Ends the press in flight. Deliberately leaves `swallowNextClick` alone: the
   * `pointerup` that follows a fired press comes through here, and the click it
   * causes has not happened yet.
   */
  private cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.origin = null;
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
  }

  /** Confirms the gesture registered. Android only, and absent under prerender. */
  private vibrate(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
}
