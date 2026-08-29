import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NativeBridgeService } from './native-bridge.service';
import { NotificationService } from './notification.service';

/**
 * Owns when the app registers this device for push.
 *
 * Registration is driven by the COMBINATION of an available native bridge and an
 * authenticated user. Firing on bridge availability alone races Auth0 rehydration at cold
 * start: the POST would 401, and because no token rotation follows, the installation would
 * stay unregistered indefinitely.
 */
@Injectable({ providedIn: 'root' })
export class PushRegistrationService {
  private readonly bridge = inject(NativeBridgeService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  /** The bearer we last registered with, so we do not re-post on every navigation. */
  private registeredWith: string | null = null;

  /** Call whenever authentication is established or the access token changes. */
  async onAuthenticated(bearerToken: string): Promise<void> {
    if (!this.bridge.isAvailable() || this.registeredWith === bearerToken) {
      return;
    }

    if (await this.bridge.registerForPush(bearerToken)) {
      this.registeredWith = bearerToken;
    }

    await this.handlePendingTap();
  }

  /**
   * Call during logout, BEFORE Auth0 teardown — the native side needs a still-valid bearer
   * to delete its registration, and native unregister must finish before the session goes
   * away or a regenerated token could re-register against the user who just logged out.
   */
  async onLogout(bearerToken: string): Promise<void> {
    this.registeredWith = null;
    if (this.bridge.isAvailable()) {
      await this.bridge.unregisterForPush(bearerToken);
    }
  }

  /**
   * A tapped notification routes to its print and is marked read. Without the mark-read the
   * bell keeps a stale unread badge for something the user just looked at — today read
   * state is only set by clicking the bell itself.
   */
  async handlePendingTap(): Promise<void> {
    const tap = await this.bridge.consumePendingTap();
    if (!tap) {
      return;
    }

    // Marking read must not gate navigation. Native claims the tap destructively
    // (getAndSet(null)), so anything that throws after that point loses it permanently —
    // and an offline device or a 5xx would strand the user on whatever page they were on,
    // which is the failure this whole path exists to prevent. A stale unread badge is the
    // cheaper wrong outcome.
    try {
      await firstValueFrom(this.notifications.markAsRead(tap.notificationId));
    } catch {
      // Deliberately swallowed; see above.
    }

    await this.router.navigate(['/prints', tap.printId]);
  }
}
