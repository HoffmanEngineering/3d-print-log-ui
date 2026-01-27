import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
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

@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
})
export class NotificationBellComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private toastr = inject(ToastrService);

  readonly unreadCount = this.notificationService.unreadCount;
  readonly hasUnread = this.notificationService.hasUnread;

  readonly notifications = signal<NotificationSummaryDto[]>([]);
  readonly loading = signal(false);
  readonly NotificationType = NotificationType;

  ngOnInit(): void {
    this.notificationService.startPolling();
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

  getUrlPath(url: string | null): string | null {
    if (!url) return null;
    const hashIndex = url.indexOf('#');
    return hashIndex >= 0 ? url.substring(0, hashIndex) : url;
  }

  getUrlFragment(url: string | null): string | null {
    if (!url) return null;
    const hashIndex = url.indexOf('#');
    return hashIndex >= 0 ? url.substring(hashIndex + 1) : null;
  }
}
