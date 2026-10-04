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
  /** Shows one toast for these items; resolves once it is on screen. */
  abstract toast(items: CelebrationItem[]): Promise<void>;
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

  stop(): void {
    this.watcher?.destroy();
    this.watcher = null;
  }

  private async cycle(): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    try {
      const mode = await this.mode();
      if (mode === 'off') {
        return; // nothing plays and the notifications stay unread
      }

      if (!this.visibility.isVisible()) {
        await this.visibility.whenVisible();
      }

      await this.withLock(async () => {
        const items = await this.fetchAll();
        await this.play(items, mode);
      });
    } catch {
      // A failed cycle leaves the notifications unread; the next poll tries again.
    } finally {
      this.busy = false;
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

  private async fetchAll(): Promise<CelebrationItem[]> {
    const items: CelebrationItem[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await lastValueFrom(
        this.notifications.getNotifications(
          page,
          PAGE_SIZE,
          true,
          NotificationType.Achievement
        )
      );
      items.push(...result.items.filter(hasAchievement).map(toItem));
      if (
        page >= (result.paging?.totalPages ?? 1) ||
        result.items.length < PAGE_SIZE
      ) {
        break;
      }
    }
    // Oldest first, so a backlog plays in the order it was earned.
    return items.reverse();
  }

  private async play(
    items: CelebrationItem[],
    mode: CelebrationMode
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }

    const big =
      mode === 'on' ? items.filter((i) => isBigMoment(i.achievement)) : [];
    const small = items.filter((i) => !big.includes(i));

    for (const item of big) {
      this.logShown(item, item.achievement.summary ? 'summary' : 'modal', 1);
      await this.presenter.dialog(item);
      await this.markRead([item]);
    }

    if (small.length > 0) {
      // Everything that arrived together merges into one toast.
      this.logShown(
        small[0],
        small.length > 1 ? 'merged' : 'card',
        small.length
      );
      await this.presenter.toast(small);
      await this.markRead(small);
    }

    this.notifications.refreshUnreadCount();
  }

  private async markRead(items: CelebrationItem[]): Promise<void> {
    await lastValueFrom(
      this.notifications.markMultipleAsRead(items.map((i) => i.id))
    );
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
