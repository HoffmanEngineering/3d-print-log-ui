import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { NGX_LOADING_BAR_IGNORED } from '@ngx-loading-bar/http-client';
import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  concat,
  interval,
  last,
  Observable,
  of,
  Subject,
  Subscription,
} from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { PagedList } from '../types/paging';
import {
  NotificationSummaryDto,
  NotificationType,
  UnreadCountResponse,
} from '../types/notification';

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
  /** The API's MaxNotificationIds for PUT api/notifications/read. */
  private readonly MARK_READ_CHUNK = 100;

  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  private readonly _unreadCount = signal<number>(0);
  public readonly unreadCount = this._unreadCount.asReadonly();
  public readonly hasUnread = computed(() => this._unreadCount() > 0);

  private readonly _unreadAchievementCount = signal<number>(0);
  /** Unread achievement notifications: while above 0 there is a celebration to play. */
  public readonly unreadAchievementCount =
    this._unreadAchievementCount.asReadonly();

  private readonly _pollTick = signal<number>(0);
  /**
   * Bumped after every unread-count response, whether or not the counts changed. A signal set
   * to its current value does not notify, so anything that must retry while a count stays
   * positive (the celebration's tab lock) keys off this.
   */
  public readonly pollTick = this._pollTick.asReadonly();

  private polling: Subscription | null = null;
  private refreshTrigger$ = new Subject<void>();

  /**
   * Start polling for unread count every 30 seconds.
   * Should be called when the user logs in.
   */
  startPolling(): void {
    if (this.polling) {
      return;
    }

    this.polling = this.refreshTrigger$
      .pipe(
        startWith(undefined),
        switchMap(() => interval(this.POLLING_INTERVAL_MS).pipe(startWith(0))),
        switchMap(() => this.fetchUnreadCount()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => this.applyCounts(response),
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
      next: (response) => this.applyCounts(response),
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
    unreadOnly: boolean = false,
    type?: NotificationType
  ): Observable<PagedList<NotificationSummaryDto>> {
    let params = new HttpParams()
      .set('pageNumber', page.toString())
      .set('pageSize', size.toString());

    if (unreadOnly) {
      params = params.set('unreadOnly', 'true');
    }

    if (type !== undefined) {
      params = params.set('type', type.toString());
    }

    return this.http
      .get<PagedList<NotificationSummaryDto>>(this.baseApiUrl, { params })
      .pipe(
        map((response) => ({
          ...response,
          // Map dates from strings to Date objects
          items: response.items.map((notification) => ({
            ...notification,
            createdDate: new Date(notification.createdDate),
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
   * Mark several notifications as read, in sequential requests of at most 100 ids (the API's
   * limit). Both unread counts drop optimistically once all have succeeded.
   */
  markMultipleAsRead(ids: string[]): Observable<void> {
    if (ids.length === 0) {
      return of(undefined);
    }

    const url = `${this.baseApiUrl}/read`;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += this.MARK_READ_CHUNK) {
      chunks.push(ids.slice(i, i + this.MARK_READ_CHUNK));
    }

    return concat(
      ...chunks.map((notificationIds) =>
        this.http.put<void>(url, { notificationIds })
      )
    ).pipe(
      last(),
      tap(() => {
        this._unreadCount.update((c) => Math.max(0, c - ids.length));
        this._unreadAchievementCount.update((c) => Math.max(0, c - ids.length));
      }),
      map(() => undefined)
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
        this._unreadAchievementCount.set(0);
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
    // Unsubscribe, or every logout/login in one session would stack another poller.
    this.polling?.unsubscribe();
    this.polling = null;
    this._unreadCount.set(0);
    this._unreadAchievementCount.set(0);
  }

  private applyCounts(response: UnreadCountResponse): void {
    this._unreadCount.set(response.unreadCount);
    this._unreadAchievementCount.set(response.unreadAchievementCount ?? 0);
    this._pollTick.update((t) => t + 1);
  }
}
