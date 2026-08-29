import { Injectable } from '@angular/core';
import { isCordovaPlatform } from '../utils/platform';
import {
  PendingTap,
  PrintLogNativeBridge,
  PushPermissionState,
} from '../types/native-bridge';

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
}
