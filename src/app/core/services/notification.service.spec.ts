import {
  provideHttpClient,
  withInterceptorsFromDi,
  withXhr,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { NotificationType } from '../types/notification';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;
  const base = `${environment.printLogApiUrl}/api/notifications`;
  const countUrl = `${base}/unread-count`;

  let visibility: DocumentVisibilityState;
  let online: boolean;

  const setVisibility = (state: DocumentVisibilityState) => {
    visibility = state;
    document.dispatchEvent(new Event('visibilitychange'));
  };

  beforeEach(() => {
    // Headless Chromium's own answers are not ours to rely on; the test decides.
    visibility = 'visible';
    online = true;
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
      () => visibility
    );
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('startPolling fetches immediately then every 60s', async () => {
    vi.useFakeTimers();
    service.startPolling();
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 1, unreadAchievementCount: 0 });

    await vi.advanceTimersByTimeAsync(60000);
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 2, unreadAchievementCount: 0 });

    expect(service.unreadCount()).toBe(2);
    service.stopPolling();
    vi.clearAllTimers();
  });

  it('poll sets unreadAchievementCount from response', async () => {
    vi.useFakeTimers();
    service.startPolling();
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 3, unreadAchievementCount: 2 });

    expect(service.unreadAchievementCount()).toBe(2);
    service.stopPolling();
    vi.clearAllTimers();
  });

  it('pollTick increments on every response even when counts are unchanged', async () => {
    vi.useFakeTimers();
    service.startPolling();
    const before = service.pollTick();
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 1, unreadAchievementCount: 1 });
    await vi.advanceTimersByTimeAsync(60000);
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 1, unreadAchievementCount: 1 });
    service.refreshUnreadCount();
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 1, unreadAchievementCount: 1 });

    expect(service.pollTick()).toBe(before + 3);
    service.stopPolling();
    vi.clearAllTimers();
  });

  it('getNotifications sends type param', () => {
    service
      .getNotifications(2, 20, true, NotificationType.Achievement)
      .subscribe();

    const req = http.expectOne((r) => r.url === base);
    expect(req.request.params.get('pageNumber')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('20');
    expect(req.request.params.get('unreadOnly')).toBe('true');
    expect(req.request.params.get('type')).toBe('4');
    req.flush({ items: [], paging: {} });
  });

  it('markMultipleAsRead chunks 250 ids into 100/100/50 PUTs', () => {
    const ids = Array.from({ length: 250 }, (_, i) => `id-${i}`);
    let done = false;
    service.markMultipleAsRead(ids).subscribe(() => (done = true));

    for (const size of [100, 100, 50]) {
      const req = http.expectOne(`${base}/read`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.notificationIds.length).toBe(size);
      req.flush(null);
    }
    expect(done).toBe(true);
  });

  it('markMultipleAsRead decrements counts optimistically', async () => {
    vi.useFakeTimers();
    service.startPolling();
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 5, unreadAchievementCount: 2 });

    service.markMultipleAsRead(['a', 'b', 'c']).subscribe();
    http.expectOne(`${base}/read`).flush(null);

    expect(service.unreadCount()).toBe(2);
    expect(service.unreadAchievementCount()).toBe(0);
    service.stopPolling();
    vi.clearAllTimers();
  });

  it('stopPolling then startPolling runs exactly one poller', async () => {
    vi.useFakeTimers();
    service.startPolling();
    http.expectOne(countUrl).flush({ unreadCount: 0 });
    service.stopPolling();
    service.startPolling();
    http.expectOne(countUrl).flush({ unreadCount: 0 });

    await vi.advanceTimersByTimeAsync(60000);
    http.expectOne(countUrl).flush({ unreadCount: 0 });

    service.stopPolling();
    vi.clearAllTimers();
  });

  it('a failed poll does not stop polling', async () => {
    vi.useFakeTimers();
    service.startPolling();
    http
      .expectOne(countUrl)
      .flush('down', { status: 503, statusText: 'Service Unavailable' });

    await vi.advanceTimersByTimeAsync(60000);
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 2, unreadAchievementCount: 1 });

    expect(service.unreadAchievementCount()).toBe(1);
    service.stopPolling();
    vi.clearAllTimers();
  });

  describe('tab visibility and connectivity', () => {
    it('does not poll while the tab is hidden', async () => {
      vi.useFakeTimers();
      setVisibility('hidden');
      service.startPolling();
      http.expectNone(countUrl);

      await vi.advanceTimersByTimeAsync(5 * 60000);
      http.expectNone(countUrl);

      service.stopPolling();
      vi.clearAllTimers();
    });

    it('stops polling when the tab is hidden', async () => {
      vi.useFakeTimers();
      service.startPolling();
      http.expectOne(countUrl).flush({ unreadCount: 1 });

      setVisibility('hidden');
      await vi.advanceTimersByTimeAsync(5 * 60000);
      http.expectNone(countUrl);

      service.stopPolling();
      vi.clearAllTimers();
    });

    it('refreshes at once when the tab becomes visible again, then keeps polling', async () => {
      vi.useFakeTimers();
      service.startPolling();
      http.expectOne(countUrl).flush({ unreadCount: 1 });
      setVisibility('hidden');
      await vi.advanceTimersByTimeAsync(10 * 60000);

      setVisibility('visible');
      http.expectOne(countUrl).flush({ unreadCount: 3 });
      expect(service.unreadCount()).toBe(3);

      await vi.advanceTimersByTimeAsync(60000);
      http.expectOne(countUrl).flush({ unreadCount: 4 });
      expect(service.unreadCount()).toBe(4);

      service.stopPolling();
      vi.clearAllTimers();
    });

    it('skips polls while offline and refreshes when the connection returns', async () => {
      vi.useFakeTimers();
      online = false;
      service.startPolling();
      http.expectNone(countUrl);
      await vi.advanceTimersByTimeAsync(3 * 60000);
      http.expectNone(countUrl);

      online = true;
      window.dispatchEvent(new Event('online'));
      http.expectOne(countUrl).flush({ unreadCount: 2 });
      expect(service.unreadCount()).toBe(2);

      service.stopPolling();
      vi.clearAllTimers();
    });

    it('stopPolling ends polling even when the tab becomes visible afterward', async () => {
      vi.useFakeTimers();
      service.startPolling();
      http.expectOne(countUrl).flush({ unreadCount: 1 });

      service.stopPolling();
      setVisibility('hidden');
      setVisibility('visible');
      await vi.advanceTimersByTimeAsync(5 * 60000);
      http.expectNone(countUrl);
      vi.clearAllTimers();
    });
  });

  it('stopPolling resets both counts', async () => {
    vi.useFakeTimers();
    service.startPolling();
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 4, unreadAchievementCount: 1 });

    service.stopPolling();

    expect(service.unreadCount()).toBe(0);
    expect(service.unreadAchievementCount()).toBe(0);
    vi.clearAllTimers();
  });
});
