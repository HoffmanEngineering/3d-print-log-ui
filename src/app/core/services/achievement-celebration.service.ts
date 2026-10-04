import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  effect,
  EffectRef,
  inject,
  Injectable,
  InjectionToken,
  Injector,
  PLATFORM_ID,
  untracked,
} from '@angular/core';
import { lastValueFrom } from 'rxjs';

import { AchievementNotification, isBigMoment } from '../types/achievement';
import {
  NotificationSummaryDto,
  NotificationType,
} from '../types/notification';
import { LoggingService } from './logging.service';
import { NotificationService } from './notification.service';
import { UserSettingService, UserSettingType } from './user-setting.service';

/** One unread achievement notification, ready to celebrate. */
export interface CelebrationItem {
  id: string;
  achievement: AchievementNotification;
  title: string;
  message: string | null;
}

/**
 * Shows celebrations. The default implementation lazy-loads the toast and dialog, so the eager
 * bundle carries only the queue below.
 */
export abstract class CelebrationPresenter {
  /**
   * Shows one toast for these items; resolves when it closes, so nothing is marked read before
   * the user has had its full display time. `quiet` drops the confetti and motion.
   */
  abstract toast(
    items: CelebrationItem[],
    options: { quiet: boolean }
  ): Promise<void>;
  /** Shows the big-moment dialog; resolves when it closes. */
  abstract dialog(item: CelebrationItem): Promise<void>;
}

/** `navigator.locks`, or null on the server and in browsers without the Web Locks API. */
export const WEB_LOCKS = new InjectionToken<Pick<
  LockManager,
  'request'
> | null>('WEB_LOCKS', {
  providedIn: 'root',
  factory: () =>
    isPlatformBrowser(inject(PLATFORM_ID)) && typeof navigator !== 'undefined'
      ? (navigator.locks ?? null)
      : null,
});

/** Page visibility, behind a seam so the queue can be tested without a real document. */
@Injectable({ providedIn: 'root' })
export class PageVisibility {
  private readonly document = inject(DOCUMENT);

  isVisible(): boolean {
    return this.document.visibilityState === 'visible';
  }

  whenVisible(): Promise<void> {
    return new Promise((resolve) => {
      const listener = () => {
        if (this.isVisible()) {
          this.document.removeEventListener('visibilitychange', listener);
          resolve();
        }
      };
      this.document.addEventListener('visibilitychange', listener);
    });
  }
}

type CelebrationMode = 'on' | 'quiet' | 'off';

const LOCK_NAME = 'achievement-celebration';
const PAGE_SIZE = 20;
/** A safety stop for paging; at 20 per page this is far beyond any real backlog. */
const MAX_PAGES = 50;

/**
 * Plays unread achievement notifications as celebrations, then marks them read: the
 * notification is the queue, and reading it is the receipt (spec §6).
 *
 * The existing 30-second poll reports `unreadAchievementCount`; whenever it is above zero this
 * fetches every unread achievement and plays it. Only the tab holding the `achievement-celebration`
 * Web Lock plays, so two open tabs never celebrate the same badge; a tab that misses the lock tries
 * again on the next poll, which is why it reacts to `pollTick` as well as the count.
 */
@Injectable({ providedIn: 'root' })
export class AchievementCelebrationService {
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly notifications = inject(NotificationService);
  private readonly settings = inject(UserSettingService);
  private readonly presenter = inject(CelebrationPresenter);
  private readonly locks = inject(WEB_LOCKS);
  private readonly visibility = inject(PageVisibility);
  private readonly logging = inject(LoggingService);

  private watcher: EffectRef | null = null;
  private busy = false;
  /** Bumped by stop(): a cycle started under an older generation abandons at its next step. */
  private generation = 0;
  /**
   * Shown, but the read receipt has not gone through yet. A later cycle retries the receipt
   * without playing the celebration a second time.
   */
  private readonly awaitingReceipt = new Set<string>();

  /** Starts watching for achievements. Idempotent, and a no-op outside the browser. */
  start(): void {
    if (!this.isBrowser || this.watcher) {
      return;
    }

    this.watcher = effect(
      () => {
        const count = this.notifications.unreadAchievementCount();
        this.notifications.pollTick();
        if (count > 0) {
          untracked(() => void this.cycle());
        }
      },
      { injector: this.injector }
    );
  }

  /** Stops watching and abandons any cycle in flight (e.g. one waiting for the tab to show). */
  stop(): void {
    this.watcher?.destroy();
    this.watcher = null;
    this.generation++;
    this.busy = false;
    this.awaitingReceipt.clear();
  }

  private async cycle(): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    const generation = this.generation;
    const current = () => generation === this.generation;
    try {
      if ((await this.mode()) === 'off' || !current()) {
        return; // nothing plays and the notifications stay unread
      }

      if (!this.visibility.isVisible()) {
        await this.visibility.whenVisible();
        if (!current()) return;
      }

      await this.withLock(async () => {
        // Read again: the setting may have changed while this tab waited.
        const mode = await this.mode();
        if (mode === 'off' || !current()) return;

        const { items, unplayable } = await this.fetchAll();
        if (!current()) return;

        const retries = items.filter((i) => this.awaitingReceipt.has(i.id));
        const fresh = items.filter((i) => !this.awaitingReceipt.has(i.id));
        // Notifications this build cannot read (malformed, or a newer metadata version) are
        // consumed, or the unread count would keep this loop fetching them forever.
        await this.receipt([...retries.map((i) => i.id), ...unplayable]);
        await this.play(fresh, mode, current);
      });
    } catch {
      // A failed cycle leaves the notifications unread; the next poll tries again.
    } finally {
      if (current()) this.busy = false;
    }
  }

  private async mode(): Promise<CelebrationMode> {
    try {
      const setting = await this.settings.getCurrentUsersSettingByType(
        UserSettingType.Achievements_Celebrations
      );
      const value = setting?.value;
      return value === 'quiet' || value === 'off' ? value : 'on';
    } catch {
      return 'on';
    }
  }

  /** Runs `play` only if this tab gets the lock; otherwise skips this cycle. */
  private async withLock(play: () => Promise<void>): Promise<void> {
    if (!this.locks) {
      await play();
      return;
    }

    await this.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
      if (lock) {
        await play();
      }
    });
  }

  private async fetchAll(): Promise<{
    items: CelebrationItem[];
    unplayable: string[];
  }> {
    const items: CelebrationItem[] = [];
    const unplayable: string[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await lastValueFrom(
        this.notifications.getNotifications(
          page,
          PAGE_SIZE,
          true,
          NotificationType.Achievement
        )
      );
      for (const n of result.items) {
        if (hasAchievement(n)) items.push(toItem(n));
        else unplayable.push(n.id);
      }
      if (
        page >= (result.paging?.totalPages ?? 1) ||
        result.items.length < PAGE_SIZE
      ) {
        break;
      }
    }
    // Oldest first, so a backlog plays in the order it was earned.
    return { items: items.reverse(), unplayable };
  }

  private async play(
    items: CelebrationItem[],
    mode: CelebrationMode,
    current: () => boolean
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }

    const big =
      mode === 'on' ? items.filter((i) => isBigMoment(i.achievement)) : [];
    // A summary is its own card: merged with grants it would read as "N achievements unlocked".
    const summaries = items.filter((i) => i.achievement.summary);
    const small = items.filter(
      (i) => !big.includes(i) && !summaries.includes(i)
    );

    for (const summary of summaries) {
      if (!current()) return;
      this.logShown(summary, 'summary', summary.achievement.count ?? 1);
      await this.presenter.toast([summary], { quiet: mode === 'quiet' });
      await this.shown([summary]);
    }

    for (const item of big) {
      if (!current()) return;
      this.logShown(item, 'modal', 1);
      await this.presenter.dialog(item);
      await this.shown([item]);
    }

    if (small.length > 0 && current()) {
      // Everything that arrived together merges into one toast.
      this.logShown(
        small[0],
        small.length > 1 ? 'merged' : 'card',
        small.length
      );
      await this.presenter.toast(small, { quiet: mode === 'quiet' });
      await this.shown(small);
    }

    this.notifications.refreshUnreadCount();
  }

  /** The user has seen these: never play them again, and send the read receipt. */
  private async shown(items: CelebrationItem[]): Promise<void> {
    const ids = items.map((i) => i.id);
    ids.forEach((id) => this.awaitingReceipt.add(id));
    await this.receipt(ids);
  }

  private async receipt(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await lastValueFrom(this.notifications.markMultipleAsRead(ids));
    ids.forEach((id) => this.awaitingReceipt.delete(id));
  }

  private logShown(
    item: CelebrationItem,
    variant: string,
    count: number
  ): void {
    this.logging.logEvent('AchievementCelebration_Shown', {
      key: item.achievement.key,
      tier: item.achievement.tier,
      variant,
      count,
    });
  }
}

function hasAchievement(
  n: NotificationSummaryDto
): n is NotificationSummaryDto & { achievement: AchievementNotification } {
  return !!n.achievement;
}

function toItem(
  n: NotificationSummaryDto & { achievement: AchievementNotification }
): CelebrationItem {
  return {
    id: n.id,
    achievement: n.achievement,
    title: n.title,
    message: n.message,
  };
}
