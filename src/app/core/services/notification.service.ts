import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { NGX_LOADING_BAR_IGNORED } from '@ngx-loading-bar/http-client';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  concat,
  EMPTY,
  fromEvent,
  interval,
  last,
  merge,
  Observable,
  of,
  Subscription,
} from 'rxjs';
import {
  catchError,
  filter,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
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
  /**
   * 60 s, not 30: the count only drives the bell badge and the achievement celebration, and a
   * visible tab also refreshes the moment it is shown, so the longer gap costs little while
   * halving the load this poll puts on the database.
   */
  private readonly POLLING_INTERVAL_MS = 60000;
  /** The API's MaxNotificationIds for PUT api/notifications/read. */
  private readonly MARK_READ_CHUNK = 100;

  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  private document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

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

  /**
   * Poll the unread count every 60 seconds while the tab is visible and the browser is online.
   * A hidden tab does not poll; showing it again (or coming back online) refreshes at once and
   * restarts the interval. Called when the user signs in; stopPolling() ends it on sign-out.
   */
  startPolling(): void {
    if (this.polling || !this.isBrowser) {
      return;
    }

    const view = this.document.defaultView;
    const reevaluate$ = merge(
      fromEvent(this.document, 'visibilitychange'),
      view ? fromEvent(view, 'online') : EMPTY
    );

    this.polling = reevaluate$
      .pipe(
        startWith(undefined),
        map(() => this.document.visibilityState === 'visible'),
        // Hidden: switch to nothing, so no timer runs and no request is made.
        switchMap((visible) =>
          visible
            ? interval(this.POLLING_INTERVAL_MS).pipe(startWith(0))
            : EMPTY
        ),
        // Offline: skip the tick. A request now would only fail with status 0.
        filter(() => this.isOnline()),
        // Errors are absorbed per request: one failed poll must not end the stream, or
        // achievements earned elsewhere (slicer, printer host, another tab) would never be
        // noticed for the rest of the session.
        switchMap(() => this.fetchUnreadCount().pipe(catchError(() => EMPTY))),
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

  private isOnline(): boolean {
    const nav = this.document.defaultView?.navigator;
    // Treat "unknown" as online: only a definite false skips a poll.
    return nav?.onLine !== false;
  }

  private applyCounts(response: UnreadCountResponse): void {
    this._unreadCount.set(response.unreadCount);
    this._unreadAchievementCount.set(response.unreadAchievementCount ?? 0);
    this._pollTick.update((t) => t + 1);
  }
}
