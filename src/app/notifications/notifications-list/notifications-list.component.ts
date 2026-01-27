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
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';

@Component({
  selector: 'app-notifications-list',
  templateUrl: './notifications-list.component.html',
  styleUrls: ['./notifications-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  host: {
    '(window:scroll)': 'onScroll()',
  },
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

  deleteNotification(
    notification: NotificationSummaryDto,
    event: Event
  ): void {
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
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '350px',
    });
    dialogRef.componentInstance.title = 'Delete All Notifications?';
    dialogRef.componentInstance.body =
      'Are you sure you want to delete all notifications? This action cannot be undone.';
    dialogRef.componentInstance.yesText = 'Delete All';
    dialogRef.componentInstance.yesColor = 'warn';
    dialogRef.componentInstance.noText = 'Cancel';

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
