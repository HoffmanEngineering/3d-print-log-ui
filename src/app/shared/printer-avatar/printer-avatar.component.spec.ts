import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { PrinterThumbnailStore } from 'src/app/core/stores/printer-thumbnail-store.service';
import { PrinterAvatarComponent } from './printer-avatar.component';

describe('PrinterAvatarComponent', () => {
  let component: PrinterAvatarComponent;
  let fixture: ComponentFixture<PrinterAvatarComponent>;
  let store: jasmine.SpyObj<PrinterThumbnailStore>;
  /** The real store reads a signal, so the stub does too - otherwise nothing would ever
   * mark the component's computed dirty and the recovery case could not be exercised. */
  let thumbnail: WritableSignal<string | null>;
  /** Mirrors the real store: bumped by every completed fetch. */
  let generation: WritableSignal<number>;

  const PRINTER_ID = 7;

  const img = () => fixture.debugElement.query(By.css('img'));

  beforeEach(async () => {
    store = jasmine.createSpyObj<PrinterThumbnailStore>(
      'PrinterThumbnailStore',
      ['thumbnailFor', 'invalidate', 'noteLoadFailure']
    );
    thumbnail = signal<string | null>(null);
    generation = signal(0);
    store.thumbnailFor.and.callFake(() => thumbnail());
    (store as { generation: WritableSignal<number> }).generation = generation;

    await TestBed.configureTestingModule({
      imports: [PrinterAvatarComponent],
      providers: [{ provide: PrinterThumbnailStore, useValue: store }],
    }).compileComponents();

    fixture = TestBed.createComponent(PrinterAvatarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('printerId', PRINTER_ID);
    fixture.componentRef.setInput('printerName', 'Voron 2.4');
  });

  it('renders nothing when the store has no thumbnail', () => {
    thumbnail.set(null);
    fixture.detectChanges();

    expect(img()).toBeNull();
  });

  it('renders the thumbnail when the store has one', () => {
    thumbnail.set('https://blob/thumb.webp?sig=x');
    fixture.detectChanges();

    expect(img()).toBeTruthy();
  });

  it('names the printer in the alt text', () => {
    thumbnail.set('https://blob/thumb.webp?sig=x');
    fixture.detectChanges();

    expect((img().nativeElement as HTMLImageElement).alt).toBe(
      'Voron 2.4 photo'
    );
  });

  it('tells the store when an image fails to load', () => {
    thumbnail.set('https://blob/gone.webp?sig=x');
    fixture.detectChanges();

    img().triggerEventHandler('error', {});

    expect(store.noteLoadFailure).toHaveBeenCalledWith(PRINTER_ID);
  });

  it('stops rendering the url that failed', () => {
    thumbnail.set('https://blob/gone.webp?sig=x');
    fixture.detectChanges();

    img().triggerEventHandler('error', {});
    fixture.detectChanges();

    expect(img()).toBeNull();
  });

  // A latched boolean would make `noteLoadFailure` pointless: the store refreshes the
  // map and the component would never read the new URL.
  it('recovers when the store supplies a fresh url after a failure', () => {
    thumbnail.set('https://blob/gone.webp?sig=x');
    fixture.detectChanges();
    img().triggerEventHandler('error', {});
    fixture.detectChanges();

    generation.update((n) => n + 1);
    thumbnail.set('https://blob/fresh.webp?sig=y');
    fixture.detectChanges();

    expect(img()).toBeTruthy();
  });

  // The real case, and the one a URL-only guard got wrong: signing is bucketed to six
  // hours server-side, so a refetch inside the bucket hands back the SAME url. Matching
  // on the url alone kept a transiently-failed photo hidden until the bucket rolled.
  it('retries the same url once the store has refetched it', () => {
    const sameUrl = 'https://blob/printer.webp?sig=bucketed';
    thumbnail.set(sameUrl);
    fixture.detectChanges();
    img().triggerEventHandler('error', {});
    fixture.detectChanges();
    expect(img()).toBeNull();

    // A completed refetch returning the identical url.
    generation.update((n) => n + 1);
    fixture.detectChanges();

    expect(img()).toBeTruthy();
  });

  // ...but only one attempt per refetch, or a genuinely dead blob becomes a render loop.
  it('suppresses the url again when the retry also fails', () => {
    const sameUrl = 'https://blob/dead.webp?sig=bucketed';
    thumbnail.set(sameUrl);
    fixture.detectChanges();
    img().triggerEventHandler('error', {});
    generation.update((n) => n + 1);
    fixture.detectChanges();

    img().triggerEventHandler('error', {});
    fixture.detectChanges();

    expect(img()).toBeNull();
  });
});
