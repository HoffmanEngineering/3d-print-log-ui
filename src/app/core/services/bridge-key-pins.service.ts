import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';

export const BRIDGE_KEY_PINS_STORAGE_KEY = 'bridgeKeyPins';

const FINGERPRINT = /^[0-9a-f]{64}$/;

type Pins = Readonly<Record<string, string>>;

/**
 * The last key fingerprint the user confirmed, accepted with "It matches", or sealed to in this
 * browser, per bridge (printlog-bridge#100). The app computes every fingerprint itself; a pin lets
 * it notice when the key the API serves for a bridge changed without going through this browser,
 * which is what a server swapping in its own key would look like. No pin means nothing to compare.
 *
 * Kept in localStorage, so it is per browser and lost with site data. Tabs share it: a pin merges
 * one entry into what is stored now, and a `storage` event from another tab refreshes the pins.
 * Reads and writes never throw.
 */
@Injectable({ providedIn: 'root' })
export class BridgeKeyPinsService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly pins = signal<Pins>(this.read());

  constructor() {
    if (!this.browser) {
      return;
    }
    const onStorage = (event: StorageEvent) => {
      // A null key means another tab cleared storage.
      if (event.key === BRIDGE_KEY_PINS_STORAGE_KEY || event.key === null) {
        this.pins.set(this.read());
      }
    };
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() =>
      window.removeEventListener('storage', onStorage)
    );
  }

  /** The pinned fingerprint for a bridge, or null. Reactive. */
  pinned(bridgeId: number): string | null {
    return this.pins()[String(bridgeId)] ?? null;
  }

  /**
   * Pins a fingerprint the user just confirmed, accepted or sealed to. Re-reads storage first and
   * merges this one entry in, so pins another tab wrote since this one loaded are kept.
   */
  pin(bridgeId: number, fingerprint: string): void {
    if (!FINGERPRINT.test(fingerprint)) {
      return;
    }
    const stored = this.readStorage();
    // Unreadable storage: build on this page's pins, which then last for this page only.
    const merged = {
      ...(stored ?? this.pins()),
      [String(bridgeId)]: fingerprint,
    };
    this.pins.set(merged);
    if (stored === null) {
      return;
    }
    try {
      localStorage.setItem(BRIDGE_KEY_PINS_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Storage full or blocked for writes: the pin lasts for this page only.
    }
  }

  private read(): Pins {
    return this.readStorage() ?? {};
  }

  /** The valid stored pins, or null when there is no storage here or it can't be read. */
  private readStorage(): Pins | null {
    if (!this.browser) {
      return null;
    }
    let raw: string | null;
    try {
      raw = localStorage.getItem(BRIDGE_KEY_PINS_STORAGE_KEY);
    } catch {
      return null;
    }
    try {
      // A corrupt value reads as no pins, and the next pin replaces it.
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      const pins: Record<string, string> = {};
      for (const [id, value] of Object.entries(parsed)) {
        if (
          /^\d+$/.test(id) &&
          typeof value === 'string' &&
          FINGERPRINT.test(value)
        ) {
          pins[id] = value;
        }
      }
      return pins;
    } catch {
      return {};
    }
  }
}
