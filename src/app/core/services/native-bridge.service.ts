import { Injectable } from '@angular/core';
import { isCordovaPlatform } from '../utils/platform';
import {
  NfcStatus,
  PendingTap,
  PrintLogNativeBridge,
  PushPermissionState,
  TagRead,
  TagReadingMode,
} from '../types/native-bridge';
import { ReaderConfig } from '../types/tag-reading';

/**
 * Thin wrapper over the Cordova app's injected bridge. Every method degrades to a safe
 * no-op in a normal browser, so callers never branch on platform themselves.
 */
@Injectable({ providedIn: 'root' })
export class NativeBridgeService {
  private get bridge(): PrintLogNativeBridge | undefined {
    // Both checks matter: the platform check proves we are in the app shell, and the object
    // check proves the native side actually finished injecting.
    return isCordovaPlatform() ? window.PrintLogNative : undefined;
  }

  isAvailable(): boolean {
    return this.bridge !== undefined;
  }

  get permission(): PushPermissionState {
    return this.bridge?.pushPermission ?? 'default';
  }

  async requestPushPermission(): Promise<PushPermissionState> {
    try {
      return (await this.bridge?.requestPushPermission()) ?? 'default';
    } catch {
      return 'default';
    }
  }

  async registerForPush(bearerToken: string): Promise<boolean> {
    try {
      return (await this.bridge?.registerForPush(bearerToken))?.ok ?? false;
    } catch {
      return false;
    }
  }

  async unregisterForPush(bearerToken: string): Promise<boolean> {
    try {
      return (await this.bridge?.unregisterForPush(bearerToken))?.ok ?? false;
    } catch {
      return false;
    }
  }

  async consumePendingTap(): Promise<PendingTap | null> {
    try {
      return (await this.bridge?.consumePendingTap()) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * @returns true if native will call the listener. False on the web, and on an app shell
   *          predating the callback, so the caller can tell "wired up" from "silently never
   *          fires" — the exact failure the `resume` listener this replaces had.
   */
  onPendingTap(listener: () => void): boolean {
    const bridge = this.bridge;
    if (!bridge?.onPendingTap) {
      return false;
    }

    try {
      bridge.onPendingTap(listener);
      return true;
    } catch {
      return false;
    }
  }

  /** True only in an app shell whose bridge can read NFC tags (app 1.3.0+). */
  canReadTags(): boolean {
    return typeof this.bridge?.startTagReading === 'function';
  }

  async nfcStatus(): Promise<NfcStatus> {
    try {
      return (await this.bridge?.nfcStatus?.()) ?? 'unsupported';
    } catch {
      return 'unsupported';
    }
  }

  async startTagReading(config: ReaderConfig | null): Promise<NfcStatus> {
    try {
      return (await this.bridge?.startTagReading?.(config)) ?? 'unsupported';
    } catch {
      return 'unsupported';
    }
  }

  /** `passive` unless the app shell says otherwise; shells before the iOS app never do. */
  tagReadingMode(): TagReadingMode {
    return this.bridge?.tagReadingMode === 'session' ? 'session' : 'passive';
  }

  async scanTag(): Promise<NfcStatus> {
    try {
      return (await this.bridge?.scanTag?.()) ?? 'unsupported';
    } catch {
      return 'unsupported';
    }
  }

  async stopTagReading(): Promise<void> {
    try {
      await this.bridge?.stopTagReading?.();
    } catch {
      // Nothing to undo: native ends the session on the next page load anyway.
    }
  }

  async consumeTag(): Promise<TagRead | null> {
    try {
      return (await this.bridge?.consumeTag?.()) ?? null;
    } catch {
      return null;
    }
  }

  async openNfcSettings(): Promise<void> {
    try {
      await this.bridge?.openNfcSettings?.();
    } catch {
      // The user can still open Settings themselves.
    }
  }

  /** @returns true if native will call the listener when a tag is read. */
  onTag(listener: () => void): boolean {
    return this.register(this.bridge?.onTag, listener);
  }

  /**
   * @returns true if native will call the listener when a tag is detected, before its read
   *          finishes. False on an app shell predating the callback.
   */
  onTagReading(listener: () => void): boolean {
    return this.register(this.bridge?.onTagReading, listener);
  }

  /** @returns true if native will call the listener when NFC turns on or off. */
  onNfcStatus(listener: () => void): boolean {
    return this.register(this.bridge?.onNfcStatus, listener);
  }

  private register(
    method: ((listener: () => void) => void) | undefined,
    listener: () => void
  ): boolean {
    const bridge = this.bridge;
    if (!bridge || typeof method !== 'function') {
      return false;
    }

    try {
      method.call(bridge, listener);
      return true;
    } catch {
      return false;
    }
  }
}
