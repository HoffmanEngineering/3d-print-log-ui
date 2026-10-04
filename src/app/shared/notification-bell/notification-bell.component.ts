import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';

import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { AchievementService } from 'src/app/core/services/achievement.service';
import { AchievementCategory } from 'src/app/core/types/achievement';
import { AchievementBadgeComponent } from '../achievements/achievement-badge.component';
import {
  actionUrlFragment,
  actionUrlPath,
  actionUrlQueryParams,
} from 'src/app/core/utils/action-url';
import { AchievementCelebrationService } from 'src/app/core/services/achievement-celebration.service';
import { TimeZoneSyncService } from 'src/app/core/services/time-zone-sync.service';
import {
  NotificationService,
  getNotificationIcon,
  getNotificationIconClass,
  getTimeAgo,
} from 'src/app/core/services/notification.service';
import {
  NotificationSummaryDto,
  NotificationType,
} from 'src/app/core/types/notification';

interface BellBadge {
  glyph: string;
  category: AchievementCategory;
  tier: number;
  oneTime: boolean;
  numeral?: number;
  title: string;
}

@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    AchievementBadgeComponent,
  ],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  // One cached request per session; a failure just means achievement entries show "?".
  private readonly catalog = toSignal(
    inject(AchievementService)
      .catalog()
      .pipe(catchError(() => of(null))),
    { initialValue: null }
  );
  private celebrations = inject(AchievementCelebrationService);
  private timeZoneSync = inject(TimeZoneSyncService);
  private toastr = inject(ToastrService);

  readonly unreadCount = this.notificationService.unreadCount;
  readonly hasUnread = this.notificationService.hasUnread;

  readonly notifications = signal<NotificationSummaryDto[]>([]);
  readonly loading = signal(false);
  readonly NotificationType = NotificationType;

  ngOnInit(): void {
    this.notificationService.startPolling();
    // The bell exists only for a signed-in user, which is exactly when celebrations apply.
    this.celebrations.start();
    void this.timeZoneSync.syncOnce();
  }

  ngOnDestroy(): void {
    // Abandons any celebration in flight, so nothing from this session plays after sign-out.
    this.celebrations.stop();
  }

  onMenuOpened(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.notificationService.getNotifications(1, 10).subscribe({
      next: (response) => {
        this.notifications.set(response.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onNotificationClick(notification: NotificationSummaryDto): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
      // Update local state
      const updated = this.notifications().map((n) =>
        n.id === notification.id ? { ...n, isRead: true } : n
      );
      this.notifications.set(updated);
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        const updated = this.notifications().map((n) => ({
          ...n,
          isRead: true,
        }));
        this.notifications.set(updated);
      },
      error: () => {
        this.toastr.error(
          'Please try again in a few seconds.',
          'Failed to mark notifications as read'
        );
      },
    });
  }

  getNotificationIcon(type: NotificationType): string {
    return getNotificationIcon(type);
  }

  getNotificationIconClass(type: NotificationType): string {
    return getNotificationIconClass(type);
  }

  getTimeAgo(date: Date): string {
    return getTimeAgo(date, true); // Use short format for dropdown
  }

  /**
   * How an Achievement entry draws its badge, or null for every other type (which keeps its
   * Material icon). A key missing from the public catalog is a hidden badge: shown as "?".
   */
  achievementBadge(notification: NotificationSummaryDto): BellBadge | null {
    const achievement = notification.achievement;
    if (notification.type !== NotificationType.Achievement || !achievement) {
      return null;
    }
    if (achievement.summary) {
      return {
        glyph: 'stack',
        category: AchievementCategory.GettingStarted,
        tier: 1,
        oneTime: true,
        title: notification.title,
      };
    }

    const family = this.catalog()?.families.find(
      (f) => f.key === achievement.key
    );
    if (!family) {
      return {
        glyph: 'question',
        category: AchievementCategory.Hidden,
        tier: 1,
        oneTime: true,
        title: notification.title,
      };
    }
    const tier = achievement.tier ?? 1;
    return {
      glyph: family.glyph,
      category: family.category,
      tier,
      oneTime: family.tiers.length === 1,
      numeral: family.tiers[tier - 1]?.threshold,
      title: family.title,
    };
  }

  getUrlPath(url: string | null): string | null {
    return actionUrlPath(url);
  }

  getUrlQueryParams(url: string | null): Record<string, string> | null {
    return actionUrlQueryParams(url);
  }

  getUrlFragment(url: string | null): string | null {
    return actionUrlFragment(url);
  }
}
