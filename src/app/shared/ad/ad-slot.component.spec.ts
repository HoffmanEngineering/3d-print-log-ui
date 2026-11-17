import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { AdSlotComponent } from './ad-slot.component';
import { AdsenseLoaderService } from '../../core/services/adsense-loader.service';
import { AD_CLIENT } from './ad-slots';

type AdWindow = Window & { adsbygoogle?: unknown[] };

/** ResizeObserver delivers after layout, so give it a frame or two to report. */
const nextFrames = async (count = 2) => {
  for (let i = 0; i < count; i++) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
  }
};

describe('AdSlotComponent', () => {
  let fixture: ComponentFixture<AdSlotComponent>;
  let ready: WritableSignal<boolean>;
  let queue: unknown[];
  let previousQueue: unknown[] | undefined;

  const ins = () =>
    fixture.nativeElement.querySelector('ins.adsbygoogle') as HTMLElement;

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await nextFrames();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    previousQueue = (window as AdWindow).adsbygoogle;
    queue = [];
    (window as AdWindow).adsbygoogle = queue;
    ready = signal(true);

    await TestBed.configureTestingModule({
      imports: [AdSlotComponent],
      providers: [{ provide: AdsenseLoaderService, useValue: { ready } }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdSlotComponent);
    fixture.componentRef.setInput('adSlot', 123456789);
    // TestBed leaves the host inline and unsized; give it a real width.
    (fixture.nativeElement as HTMLElement).style.display = 'block';
    (fixture.nativeElement as HTMLElement).style.width = '300px';
  });

  afterEach(() => {
    fixture.destroy();
    (window as AdWindow).adsbygoogle = previousQueue;
  });

  it('renders the ins with the client, slot and format attributes', async () => {
    fixture.componentRef.setInput('fullWidthResponsive', false);
    await settle();

    const el = ins();
    expect(el.getAttribute('data-ad-client')).toBe(AD_CLIENT);
    expect(el.getAttribute('data-ad-slot')).toBe('123456789');
    expect(el.getAttribute('data-ad-format')).toBe('auto');
    expect(el.getAttribute('data-full-width-responsive')).toBe('false');
    expect(el.style.display).toBe('block');
  });

  it('pushes once when the slot has a width', async () => {
    await settle();

    expect(queue.length).toBe(1);
  });

  it('never pushes twice, even when the slot resizes', async () => {
    await settle();
    (fixture.nativeElement as HTMLElement).style.width = '200px';
    await settle();
    (fixture.nativeElement as HTMLElement).style.width = '350px';
    await settle();

    expect(queue.length).toBe(1);
  });

  // "No slot size for availableWidth=0": a hidden slot must wait, not push.
  it('does not push into a zero-width slot', async () => {
    (fixture.nativeElement as HTMLElement).style.display = 'none';
    await settle();

    expect(queue.length).toBe(0);
  });

  it('pushes when a hidden slot gets a width', async () => {
    (fixture.nativeElement as HTMLElement).style.display = 'none';
    await settle();
    (fixture.nativeElement as HTMLElement).style.display = 'block';
    await settle();

    expect(queue.length).toBe(1);
  });

  // A push queued before the script runs outlives the page that made it.
  it('waits for the AdSense script before pushing', async () => {
    ready.set(false);
    await settle();
    expect(queue.length).toBe(0);

    ready.set(true);
    await settle();
    expect(queue.length).toBe(1);
  });

  // "All 'ins' elements ... already have ads in them".
  it('does not push into an ins AdSense has already claimed', async () => {
    ready.set(false);
    await settle();
    ins().setAttribute('data-adsbygoogle-status', 'done');

    ready.set(true);
    await settle();

    expect(queue.length).toBe(0);
  });

  it('does not push after it is destroyed', async () => {
    ready.set(false);
    await settle();
    fixture.destroy();

    ready.set(true);
    await nextFrames();

    expect(queue.length).toBe(0);
  });

  it('disconnects its ResizeObserver on destroy', async () => {
    const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect');
    ready.set(false);
    await settle();

    fixture.destroy();

    expect(disconnect).toHaveBeenCalled();
  });
});
