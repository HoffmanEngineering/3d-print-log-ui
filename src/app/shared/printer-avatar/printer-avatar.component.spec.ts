import type { MockedObject } from 'vitest';
import { WritableSignal, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AuthService } from 'src/app/core/services/auth.service';
import { PrinterThumbnailStore } from 'src/app/core/stores/printer-thumbnail-store.service';
import { environment } from 'src/environments/environment';
import { PrinterAvatarComponent } from './printer-avatar.component';

describe('PrinterAvatarComponent', () => {
  let component: PrinterAvatarComponent;
  let fixture: ComponentFixture<PrinterAvatarComponent>;
  let store: MockedObject<PrinterThumbnailStore>;
  /** The real store reads a signal, so the stub does too - otherwise nothing would ever
   * mark the component's computed dirty and the recovery case could not be exercised. */
  let thumbnail: WritableSignal<string | null>;
  /** Mirrors the real store: bumped by every completed fetch. */
  let generation: WritableSignal<number>;

  const PRINTER_ID = 7;

  const img = () => fixture.debugElement.query(By.css('img'));

  beforeEach(async () => {
    store = {
      thumbnailFor: vi.fn().mockName('PrinterThumbnailStore.thumbnailFor'),
      invalidate: vi.fn().mockName('PrinterThumbnailStore.invalidate'),
      noteLoadFailure: vi
        .fn()
        .mockName('PrinterThumbnailStore.noteLoadFailure'),
    } as unknown as MockedObject<PrinterThumbnailStore>;
    thumbnail = signal<string | null>(null);
    generation = signal(0);
    store.thumbnailFor.mockImplementation(() => thumbnail());
    (
      store as {
        generation: WritableSignal<number>;
      }
    ).generation = generation;

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

    expect(store.noteLoadFailure).toHaveBeenCalledWith(
      PRINTER_ID,
      'https://blob/gone.webp?sig=x'
    );
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

/**
 * The stubbed-store tests above cannot see the one failure that mattered most: reading the
 * REAL store from inside the component's computed used to write a signal during that
 * computed, which Angular rejects with NG0600. The error propagated out of the cell
 * template that rendered the avatar, so the print list came up with no rows at all.
 */
describe('PrinterAvatarComponent with the real store', () => {
  let fixture: ComponentFixture<PrinterAvatarComponent>;
  let httpMock: HttpTestingController;

  const url = `${environment.printLogApiUrl}/api/Printers/thumbnails`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrinterAvatarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { loggedIn: true } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PrinterAvatarComponent);
    fixture.componentRef.setInput('printerId', 101);
    fixture.componentRef.setInput('printerName', 'Living Room');
  });

  it('renders without throwing and shows the photo once the map arrives', async () => {
    expect(() => fixture.detectChanges()).not.toThrow();

    // The fetch is scheduled, not inline, so let the microtask run.
    await Promise.resolve();
    httpMock
      .expectOne(url)
      .flush([{ printerId: 101, thumbnailUrl: 'https://blob/101.webp?sig=x' }]);
    fixture.detectChanges();

    const img = fixture.debugElement.query(By.css('img'));
    expect(img).toBeTruthy();
    expect((img.nativeElement as HTMLImageElement).alt).toBe(
      'Living Room photo'
    );
    httpMock.verify();
  });

  it('issues one request no matter how many avatars render', async () => {
    const second = TestBed.createComponent(PrinterAvatarComponent);
    second.componentRef.setInput('printerId', 102);

    fixture.detectChanges();
    second.detectChanges();
    await Promise.resolve();

    httpMock.expectOne(url).flush([]);
    httpMock.verify();
  });

  describe('when an image fails to load', () => {
    /**
     * A real, loadable 1x1 GIF, so the browser never fires an error event of its own: the
     * only failures in these tests are the ones a test triggers. The fragment makes it a
     * distinct url without changing what loads.
     */
    const PHOTO =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

    const img = () => fixture.debugElement.query(By.css('img'));

    /** Lets every scheduled microtask and render pass run, several times over. */
    const settle = async () => {
      for (let i = 0; i < 3; i++) {
        fixture.detectChanges();
        await new Promise((resolve) => setTimeout(resolve));
      }
      fixture.detectChanges();
    };

    /** Answers every pending thumbnails request with `entries`; returns how many there were. */
    const answerPending = (entries: unknown[]) => {
      const pending = httpMock.match(url);
      pending.forEach((req) => req.flush(entries));
      return pending.length;
    };

    const loadFirstMap = async (thumbnailUrl: string) => {
      await settle();
      httpMock.expectOne(url).flush([{ printerId: 101, thumbnailUrl }]);
      await settle();
      expect(img(), 'first paint').toBeTruthy();
    };

    // The production bug: a deleted blob's url 404s, and every failure queued a refetch
    // that came back with the same bucketed url, which failed again - one request a
    // second, until the API's per-user rate limiter started returning 429s to the bridge
    // as well. A dead url gets exactly one refresh, then stays hidden.
    it('refetches once for a dead url, not once per failure', async () => {
      const dead = `${PHOTO}#dead`;
      await loadFirstMap(dead);

      let refetches = 0;
      // Play the browser: every time the avatar renders the dead url, it fails again.
      for (let round = 0; round < 6; round++) {
        if (img()) img().triggerEventHandler('error', {});
        await settle();
        refetches += answerPending([{ printerId: 101, thumbnailUrl: dead }]);
        await settle();
      }

      expect(refetches).toBe(1);
      expect(img(), 'a dead url stays hidden').toBeNull();
      httpMock.verify();
    });

    it('shows the photo again when the url loads after the one refresh', async () => {
      const flaky = `${PHOTO}#flaky`;
      await loadFirstMap(flaky);

      img().triggerEventHandler('error', {});
      await settle();
      expect(answerPending([{ printerId: 101, thumbnailUrl: flaky }])).toBe(1);
      await settle();

      // The same bucketed url, and this time it loads: no error event.
      expect(img(), 'retried after the refresh').toBeTruthy();
      expect((img().nativeElement as HTMLImageElement).src).toBe(flaky);
      httpMock.verify();
    });

    // A printer-image mutation calls invalidate(). That has to fetch and show the new
    // photo even after the old url used up its failure refresh.
    it('still refetches on invalidate after a dead url was given up on', async () => {
      const dead = `${PHOTO}#dead`;
      await loadFirstMap(dead);
      img().triggerEventHandler('error', {});
      await settle();
      answerPending([{ printerId: 101, thumbnailUrl: dead }]);
      await settle();
      img().triggerEventHandler('error', {});
      await settle();
      expect(answerPending([])).toBe(0);
      expect(img()).toBeNull();

      TestBed.inject(PrinterThumbnailStore).invalidate();
      await settle();

      const uploaded = `${PHOTO}#uploaded`;
      httpMock
        .expectOne(url)
        .flush([{ printerId: 101, thumbnailUrl: uploaded }]);
      await settle();

      expect(img(), 'the new photo').toBeTruthy();
      expect((img().nativeElement as HTMLImageElement).src).toBe(uploaded);
      httpMock.verify();
    });
  });
});
