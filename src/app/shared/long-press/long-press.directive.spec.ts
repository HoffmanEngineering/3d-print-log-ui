import { Component } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import {
  LongPressDirective,
  LONG_PRESS_DELAY_MS,
} from './long-press.directive';

@Component({
  imports: [LongPressDirective],
  template: `
    <div
      appLongPress
      (longPress)="fired = fired + 1"
      (click)="clicks = clicks + 1"
    ></div>
  `,
})
class HostComponent {
  fired = 0;
  clicks = 0;
}

describe('LongPressDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    element = fixture.nativeElement.querySelector('div');
    fixture.detectChanges();
  });

  function pointerDown(x = 0, y = 0): void {
    element.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: x,
        clientY: y,
        button: 0,
        bubbles: true,
      })
    );
  }

  function pointerMove(x: number, y: number): void {
    element.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: x,
        clientY: y,
        bubbles: true,
      })
    );
  }

  it('emits once the press passes the delay', fakeAsync(() => {
    pointerDown();
    tick(LONG_PRESS_DELAY_MS);

    expect(host.fired).toBe(1);
  }));

  it('does not emit before the delay', fakeAsync(() => {
    pointerDown();
    tick(LONG_PRESS_DELAY_MS - 1);

    expect(host.fired).toBe(0);

    // Release it, or the pending timer outlives the test.
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  }));

  it('does not emit when the pointer is released early', fakeAsync(() => {
    pointerDown();
    tick(100);
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    tick(LONG_PRESS_DELAY_MS);

    expect(host.fired).toBe(0);
  }));

  // Without this, starting a scroll with a finger on a card selects it.
  it('cancels when the pointer moves beyond the slop radius', fakeAsync(() => {
    pointerDown(0, 0);
    pointerMove(0, 40);
    tick(LONG_PRESS_DELAY_MS);

    expect(host.fired).toBe(0);
  }));

  it('tolerates the small movement of a stationary finger', fakeAsync(() => {
    pointerDown(0, 0);
    pointerMove(2, 3);
    tick(LONG_PRESS_DELAY_MS);

    expect(host.fired).toBe(1);
  }));

  it('cancels when the browser takes over the gesture', fakeAsync(() => {
    pointerDown();
    element.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    tick(LONG_PRESS_DELAY_MS);

    expect(host.fired).toBe(0);
  }));

  // The card is a routerLink: without this the release navigates away from the
  // list the moment the long press selects something.
  it('swallows the click that follows a fired long press', fakeAsync(() => {
    pointerDown();
    tick(LONG_PRESS_DELAY_MS);
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(host.clicks).toBe(0);
  }));

  it('lets an ordinary tap through', fakeAsync(() => {
    pointerDown();
    tick(100);
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(host.clicks).toBe(1);
  }));

  it('only swallows the first click after the press', fakeAsync(() => {
    pointerDown();
    tick(LONG_PRESS_DELAY_MS);
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(host.clicks).toBe(1);
  }));

  // A right-click is the desktop context menu, not a long press.
  it('ignores non-primary buttons', fakeAsync(() => {
    element.dispatchEvent(
      new PointerEvent('pointerdown', { button: 2, bubbles: true })
    );
    tick(LONG_PRESS_DELAY_MS);

    expect(host.fired).toBe(0);
  }));

  it('suppresses the native context menu once the press has fired', fakeAsync(() => {
    pointerDown();
    tick(LONG_PRESS_DELAY_MS);

    const contextMenu = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(contextMenu);

    expect(contextMenu.defaultPrevented).toBeTrue();
  }));

  it('drops a pending timer when the element goes away mid-press', fakeAsync(() => {
    pointerDown();
    fixture.destroy();
    tick(LONG_PRESS_DELAY_MS);

    expect(host.fired).toBe(0);
  }));

  // The click after a long press is not guaranteed: the browser drops it if the finger
  // drifts off, and Android frequently sends none. A stale flag would then eat the next
  // real tap on the card.
  it('does not carry a pending swallow into the next press', fakeAsync(() => {
    pointerDown();
    tick(LONG_PRESS_DELAY_MS);
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    // No click arrives.

    pointerDown();
    tick(100);
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(host.clicks).toBe(1);
  }));
});
