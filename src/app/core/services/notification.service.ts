import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { NGX_LOADING_BAR_IGNORED } from '@ngx-loading-bar/http-client';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, Observable, Subject } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { PagedList } from '../types/paging';
import {
  NotificationSummaryDto,
  NotificationType,
  UnreadCountResponse,
} from '../types/notification';
import moment from 'moment';

/**
 * Get the Material icon name for a notification type.
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case NotificationType.Comment:
      return 'comment';
    case NotificationType.PrintCompleted:
      return 'check_circle';
    case NotificationType.PrintFailed:
      return 'error';
    case NotificationType.Achievement:
      return 'emoji_events';
    case NotificationType.SystemAnnouncement:
      return 'campaign';
    default:
      return 'notifications';
  }
}

/**
 * Get the CSS class for a notification type icon.
 */
export function getNotificationIconClass(type: NotificationType): string {
  switch (type) {
    case NotificationType.Comment:
      return 'icon-blue';
    case NotificationType.PrintCompleted:
      return 'icon-green';
    case NotificationType.PrintFailed:
      return 'icon-red';
    case NotificationType.Achievement:
      return 'icon-orange';
    case NotificationType.SystemAnnouncement:
      return 'icon-blue';
    default:
      return '';
  }
}

/**
 * Get a human-readable relative time string.
 */
export function getTimeAgo(date: Date, short: boolean = false): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return short
      ? `${diffMins}m ago`
      : `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return short
      ? `${diffHours}h ago`
      : `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return short
      ? `${diffDays}d ago`
      : `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return new Date(date).toLocaleDateString();
  }
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly baseApiUrl = `${environment.printLogApiUrl}/api/notifications`;
  private readonly POLLING_INTERVAL_MS = 30000;

  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  private readonly _unreadCount = signal<number>(0);
  public readonly unreadCount = this._unreadCount.asReadonly();
  public readonly hasUnread = computed(() => this._unreadCount() > 0);

  private pollingStarted = false;
  private refreshTrigger$ = new Subject<void>();

  /**
   * Start polling for unread count every 30 seconds.
   * Should be called when the user logs in.
   */
  startPolling(): void {
    if (this.pollingStarted) {
      return;
    }

    this.pollingStarted = true;

    this.refreshTrigger$
      .pipe(
        startWith(undefined),
        switchMap(() =>
          interval(this.POLLING_INTERVAL_MS).pipe(startWith(0))
        ),
        switchMap(() => this.fetchUnreadCount()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this._unreadCount.set(response.unreadCount);
        },
        error: () => {
          // Silently handle polling errors
        },
      });
  }

  /**
   * Force refresh the unread count immediately.
   */
  refreshUnreadCount(): void {
    this.fetchUnreadCount().subscribe({
      next: (response) => {
        this._unreadCount.set(response.unreadCount);
      },
      error: () => {
        // Silently handle errors
      },
    });
  }

  /**
   * Get paginated list of notifications.
   */
  getNotifications(
    page: number = 1,
    size: number = 10,
    unreadOnly: boolean = false
  ): Observable<PagedList<NotificationSummaryDto>> {
    let params = new HttpParams()
      .set('pageNumber', page.toString())
      .set('pageSize', size.toString());

    if (unreadOnly) {
      params = params.set('unreadOnly', 'true');
    }

    return this.http
      .get<PagedList<NotificationSummaryDto>>(this.baseApiUrl, { params })
      .pipe(
        map((response) => ({
          ...response,
          // Map dates from strings to Date objects
          items: response.items.map((notification) => ({
            ...notification,
            createdDate: moment.utc(notification.createdDate).toDate(),
          })),
        }))
      );
  }

  /**
   * Get the current unread notification count.
   * Uses NGX_LOADING_BAR_IGNORED to prevent the loading bar from showing during polling.
   */
  private fetchUnreadCount(): Observable<UnreadCountResponse> {
    const url = `${this.baseApiUrl}/unread-count`;
    return this.http.get<UnreadCountResponse>(url, {
      context: new HttpContext().set(NGX_LOADING_BAR_IGNORED, true),
    });
  }

  /**
   * Get unread count (public method for one-off calls).
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.fetchUnreadCount();
  }

  /**
   * Mark a single notification as read.
   */
  markAsRead(id: string): Observable<void> {
    const url = `${this.baseApiUrl}/${id}/read`;
    return this.http.put<void>(url, {}).pipe(
      tap(() => {
        // Decrement unread count optimistically
        const current = this._unreadCount();
        if (current > 0) {
          this._unreadCount.set(current - 1);
        }
      })
    );
  }

  /**
   * Mark all notifications as read.
   */
  markAllAsRead(): Observable<void> {
    const url = `${this.baseApiUrl}/read-all`;
    return this.http.put<void>(url, {}).pipe(
      tap(() => {
        this._unreadCount.set(0);
      })
    );
  }

  /**
   * Delete a single notification.
   */
  deleteNotification(id: string): Observable<void> {
    const url = `${this.baseApiUrl}/${id}`;
    return this.http.delete<void>(url);
  }

  /**
   * Delete all notifications.
   */
  deleteAllNotifications(): Observable<void> {
    return this.http.delete<void>(this.baseApiUrl);
  }

  /**
   * Stop polling (resets the polling state).
   * Useful for logout scenarios.
   */
  stopPolling(): void {
    this.pollingStarted = false;
    this._unreadCount.set(0);
  }
}
