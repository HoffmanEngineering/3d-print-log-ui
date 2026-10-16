import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { NfcStatus, TagRead, TagTech } from '../types/native-bridge';
import { LoggingService } from './logging.service';
import { NativeBridgeService } from './native-bridge.service';

/** A phone resting on a spool must not pick it again and again. */
const REPEAT_WINDOW_MS = 2000;

declare global {
  interface Window {
    /** Development builds only: deliver a tag as if the phone had read it. */
    __printlogFakeTag?: (uid: string, tech?: TagTech) => void;
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
      window.__printlogFakeTag = (uid: string, tech: TagTech = 'nfca') => {
        goFake();
        this.accept({ uid: uid.toUpperCase(), tech });
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
    if (!this.wired) {
      this.wired = true;
      this.bridge.onTag(() => void this.drain());
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
    this._status.set(await this.bridge.startTagReading());
  }

  private async stop(): Promise<void> {
    if (this.fake) {
      return;
    }
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
