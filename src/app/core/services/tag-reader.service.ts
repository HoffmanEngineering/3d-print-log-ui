import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  Observable,
  Subject,
  TimeoutError,
  catchError,
  firstValueFrom,
  of,
  shareReplay,
  tap,
  timeout,
} from 'rxjs';
import { NfcStatus, TagRead, TagTech } from '../types/native-bridge';
import { ReaderConfig } from '../types/tag-reading';
import { FilamentService } from './filament.service';
import { LoggingService } from './logging.service';
import { NativeBridgeService } from './native-bridge.service';

/** A phone resting on a spool must not pick it again and again. */
const REPEAT_WINDOW_MS = 2000;

/** Reading never waits longer than this for the reader config. */
const CONFIG_WAIT_MS = 5000;

declare global {
  interface Window {
    /** Development builds only: deliver a tag as if the phone had read it. */
    __printlogFakeTag?: (
      uid: string,
      tech?: TagTech,
      memory?: TagRead['memory']
    ) => void;
    /** Development builds only: report an NFC status as if the phone had. */
    __printlogFakeNfc?: (status: NfcStatus) => void;
  }
}

/**
 * Reads spool tags through the Android app's NFC bridge. The only UI code that touches the NFC
 * half of the bridge.
 *
 * Screens call `listen()`; the first subscriber opens native's reading session and the last
 * one to leave closes it, so two screens open at once (a sheet handing over to the picker)
 * never stop each other's reader.
 */
@Injectable({ providedIn: 'root' })
export class TagReaderService {
  private readonly bridge = inject(NativeBridgeService);
  private readonly logging = inject(LoggingService);
  private readonly filaments = inject(FilamentService);

  /** The app shell has the NFC half of the bridge. */
  private readonly bridgeReady = signal(false);
  private readonly _status = signal<NfcStatus>('unsupported');

  /**
   * True only in an app shell that can read tags, on a phone that has NFC (on or off). Every
   * NFC control hides while this is false. It can turn true after startup: native injects the
   * bridge once the page has loaded, which is often after Angular has booted.
   */
  readonly available = computed(
    () => this.bridgeReady() && this._status() !== 'unsupported'
  );

  readonly status = this._status.asReadonly();

  private readonly reads = new Subject<TagRead>();
  private readonly _readingStarted = new Subject<void>();
  /** Native reports a tag under the phone, before its read finishes. */
  readonly readingStarted: Observable<void> =
    this._readingStarted.asObservable();
  /** Fetched once per app session; a failed fetch is not cached, so the next start retries. */
  private config$: Observable<ReaderConfig> | null = null;
  private config: ReaderConfig | null = null;
  /**
   * Set once a start has waited the full CONFIG_WAIT_MS. Later starts don't wait again; the
   * fetch still in flight fills the cache for whichever start comes after it lands.
   */
  private configWaitTimedOut = false;
  /** Bumped by every start and stop, so a start that lost the race to a newer one stands down. */
  private session = 0;
  private listeners = 0;
  private wired = false;
  private fake = false;
  private last: { uid: string; at: number } | null = null;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }

    this.checkBridge();
    window.addEventListener('printlog-native-ready', () => this.checkBridge());

    // Development builds only: lets every flow be exercised and screenshotted in desktop
    // Chrome with __printlogFakeNfc('off'), then __printlogFakeTag('04A23F11').
    // Inline on purpose: the CLI defines ngDevMode as false in production and drops this
    // block, but a method it calls would survive minification. verify-prerender.mjs fails
    // the build if __printlogFakeTag reaches the bundle.
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      const goFake = () => {
        if (!this.fake) {
          this.fake = true;
          this.bridgeReady.set(true);
          this._status.set('ready');
        }
      };
      window.__printlogFakeTag = (
        uid: string,
        tech: TagTech = 'nfca',
        memory?: TagRead['memory']
      ) => {
        goFake();
        this._readingStarted.next();
        this.accept({
          uid: uid.toUpperCase(),
          tech,
          ...(memory ? { memory } : {}),
        });
      };
      window.__printlogFakeNfc = (status: NfcStatus) => {
        goFake();
        this._status.set(status);
      };
    }
  }

  /** Tags held to the phone while subscribed. */
  listen(): Observable<TagRead> {
    return new Observable<TagRead>((subscriber) => {
      const subscription = this.reads.subscribe(subscriber);
      this.listeners++;
      if (this.listeners === 1 && this.bridgeReady()) {
        void this.start();
      }

      return () => {
        subscription.unsubscribe();
        this.listeners--;
        if (this.listeners === 0 && this.bridgeReady()) {
          void this.stop();
        }
      };
    });
  }

  /**
   * Lets the next read of this UID through the repeat filter. For a consumer whose lookup
   * failed, so an immediate retry is not swallowed.
   */
  forget(uid: string): void {
    if (this.last?.uid === uid) {
      this.last = null;
    }
  }

  openSettings(): Promise<void> {
    return this.fake ? Promise.resolve() : this.bridge.openNfcSettings();
  }

  private checkBridge(): void {
    if (this.bridgeReady() || !this.bridge.canReadTags()) {
      return;
    }

    this.bridgeReady.set(true);
    // Fetched now, so the first scan usually finds it already here.
    this.prefetchConfig();
    if (!this.wired) {
      this.wired = true;
      this.bridge.onTag(() => void this.drain());
      this.bridge.onTagReading(() => this._readingStarted.next());
      this.bridge.onNfcStatus(() => void this.refreshStatus());
    }

    if (this.listeners > 0) {
      void this.start();
    } else {
      void this.refreshStatus();
    }
  }

  private async start(): Promise<void> {
    if (this.fake) {
      return;
    }
    const session = ++this.session;
    const config = await this.loadConfig();
    if (session !== this.session || this.listeners === 0) {
      // A stop or a newer start came in while the config loaded; it owns native now.
      return;
    }
    this._status.set(await this.bridge.startTagReading(config));
  }

  private fetchConfig(): Observable<ReaderConfig> {
    this.config$ ??= this.filaments.getReaderConfig().pipe(
      tap((config) => (this.config = config)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.config$;
  }

  /** Starts the fetch without waiting for it. A failure is retried by the next start. */
  private prefetchConfig(): void {
    this.fetchConfig().subscribe({ error: () => undefined });
  }

  /** The reader config, or null when it cannot be had: reading must not depend on it. */
  private loadConfig(): Promise<ReaderConfig | null> {
    if (this.config) {
      return Promise.resolve(this.config);
    }
    if (this.configWaitTimedOut) {
      this.prefetchConfig();
      return Promise.resolve(null);
    }
    return firstValueFrom(
      this.fetchConfig().pipe(
        timeout(CONFIG_WAIT_MS),
        catchError((err: unknown) => {
          if (err instanceof TimeoutError) {
            this.configWaitTimedOut = true;
          }
          return of(null);
        })
      )
    );
  }

  private async stop(): Promise<void> {
    if (this.fake) {
      return;
    }
    this.session++;
    await this.bridge.stopTagReading();
  }

  private async refreshStatus(): Promise<void> {
    this._status.set(await this.bridge.nfcStatus());
  }

  private async drain(): Promise<void> {
    const tag = await this.bridge.consumeTag();
    if (tag) {
      this.accept(tag);
    }
  }

  private accept(tag: TagRead): void {
    const now = Date.now();
    if (this.last?.uid === tag.uid && now - this.last.at < REPEAT_WINDOW_MS) {
      // Slide the window: a spool at the edge of the field drops out and back in.
      this.last.at = now;
      return;
    }
    this.last = { uid: tag.uid, at: now };

    // Never the UID: analytics must not carry it.
    this.logging.logEvent('TagReader_Read', { tech: tag.tech });
    this.reads.next(tag);
  }
}
