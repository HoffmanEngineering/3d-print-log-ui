import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export const BRIDGE_KEY_PINS_STORAGE_KEY = 'bridgeKeyPins';

const FINGERPRINT = /^[0-9a-f]{64}$/;

/**
 * The last key fingerprint the user confirmed, compared or sealed to in this browser, per bridge
 * (printlog-bridge#100). The app computes every fingerprint itself; a pin lets it notice when the
 * key the API serves for a bridge changed without going through this browser's confirmation, which
 * is what a server swapping in its own key would look like. No pin means nothing to compare.
 *
 * Kept in localStorage, so it is per browser and lost with site data; reads and writes never throw.
 */
@Injectable({ providedIn: 'root' })
export class BridgeKeyPinsService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly pins = signal<Readonly<Record<string, string>>>(this.load());

  /** The pinned fingerprint for a bridge, or null. Reactive. */
  pinned(bridgeId: number): string | null {
    return this.pins()[String(bridgeId)] ?? null;
  }

  /** Pins a fingerprint the user just confirmed, compared or sealed to. */
  pin(bridgeId: number, fingerprint: string): void {
    if (!FINGERPRINT.test(fingerprint)) {
      return;
    }
    this.pins.update((all) => ({ ...all, [String(bridgeId)]: fingerprint }));
    if (!this.browser) {
      return;
    }
    try {
      localStorage.setItem(
        BRIDGE_KEY_PINS_STORAGE_KEY,
        JSON.stringify(this.pins())
      );
    } catch {
      // Storage blocked or full: the pin lasts for this page only.
    }
  }

  private load(): Readonly<Record<string, string>> {
    if (!this.browser) {
      return {};
    }
    try {
      const raw = localStorage.getItem(BRIDGE_KEY_PINS_STORAGE_KEY);
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
