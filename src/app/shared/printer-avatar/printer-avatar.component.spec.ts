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

  const PRINTER_ID = 7;

  const img = () => fixture.debugElement.query(By.css('img'));

  beforeEach(async () => {
    store = jasmine.createSpyObj<PrinterThumbnailStore>(
      'PrinterThumbnailStore',
      ['thumbnailFor', 'invalidate', 'noteLoadFailure']
    );
    thumbnail = signal<string | null>(null);
    store.thumbnailFor.and.callFake(() => thumbnail());

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

    thumbnail.set('https://blob/fresh.webp?sig=y');
    fixture.detectChanges();

    expect(img()).toBeTruthy();
  });
});
