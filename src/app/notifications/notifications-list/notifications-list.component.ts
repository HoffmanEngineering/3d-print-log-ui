import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
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
import { PageInfo } from 'src/app/core/types/paging';
import { openSimpleDialog } from 'src/app/shared/simple-dialog/simple-dialog.component';
import {
  actionUrlFragment,
  actionUrlPath,
  actionUrlQueryParams,
} from 'src/app/core/utils/action-url';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatCard, MatCardContent } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-notifications-list',
  templateUrl: './notifications-list.component.html',
  styleUrls: ['./notifications-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:scroll)': 'onScroll()',
  },
  imports: [
    MatSlideToggle,
    MatButton,
    MatIcon,
    MatProgressSpinner,
    MatCard,
    RouterLink,
    MatCardContent,
    MatTooltip,
    MatIconButton,
  ],
})
export class NotificationsListComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);

  readonly notifications = signal<NotificationSummaryDto[]>([]);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly unreadOnly = signal(false);
  readonly pageInfo = signal<PageInfo | null>(null);

  readonly NotificationType = NotificationType;

  private readonly PAGE_SIZE = 20;
  private currentPage = 1;

  ngOnInit(): void {
    this.loadNotifications();
  }

  onScroll(): void {
    if (this.loadingMore() || this.loading()) {
      return;
    }

    const paging = this.pageInfo();
    if (!paging || paging.currentPage >= paging.totalPages) {
      return;
    }

    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;

    // Load more when within 200px of bottom
    if (documentHeight - scrollPosition < 200) {
      this.loadMore();
    }
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.currentPage = 1;

    this.notificationService
      .getNotifications(1, this.PAGE_SIZE, this.unreadOnly())
      .subscribe({
        next: (response) => {
          this.notifications.set(response.items);
          this.pageInfo.set(response.paging);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  loadMore(): void {
    const paging = this.pageInfo();
    if (!paging || paging.currentPage >= paging.totalPages) {
      return;
    }

    this.loadingMore.set(true);
    this.currentPage++;

    this.notificationService
      .getNotifications(this.currentPage, this.PAGE_SIZE, this.unreadOnly())
      .subscribe({
        next: (response) => {
          this.notifications.update((current) => [
            ...current,
            ...response.items,
          ]);
          this.pageInfo.set(response.paging);
          this.loadingMore.set(false);
        },
        error: () => {
          this.loadingMore.set(false);
          this.currentPage--;
        },
      });
  }

  toggleUnreadOnly(): void {
    this.unreadOnly.update((value) => !value);
    this.loadNotifications();
  }

  onNotificationClick(notification: NotificationSummaryDto): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
      this.notifications.update((list) =>
        list.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => ({ ...n, isRead: true }))
        );
      },
      error: () => {
        this.toastr.error(
          'Please try again in a few seconds.',
          'Failed to mark notifications as read'
        );
      },
    });
  }

  deleteNotification(notification: NotificationSummaryDto, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.filter((n) => n.id !== notification.id)
        );
        // Refresh unread count
        this.notificationService.refreshUnreadCount();
      },
      error: () => {
        this.toastr.error(
          'Please try again in a few seconds.',
          'Failed to delete notification'
        );
      },
    });
  }

  deleteAllNotifications(): void {
    const dialogRef = openSimpleDialog(
      this.dialog,
      {
        title: 'Delete All Notifications?',
        body: 'Are you sure you want to delete all notifications? This action cannot be undone.',
        yesText: 'Delete All',
        yesColor: 'warn',
        noText: 'Cancel',
      },
      { maxWidth: '350px' }
    );

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.notificationService.deleteAllNotifications().subscribe({
          next: () => {
            this.notifications.set([]);
            this.notificationService.refreshUnreadCount();
            this.toastr.success(
              'All notifications have been deleted.',
              'Success'
            );
          },
          error: () => {
            this.toastr.error(
              'Please try again in a few seconds.',
              'Failed to delete notifications'
            );
          },
        });
      }
    });
  }

  getNotificationIcon(type: NotificationType): string {
    return getNotificationIcon(type);
  }

  getNotificationIconClass(type: NotificationType): string {
    return getNotificationIconClass(type);
  }

  getTimeAgo(date: Date): string {
    return getTimeAgo(date);
  }

  hasUnreadNotifications(): boolean {
    return this.notifications().some((n) => !n.isRead);
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
