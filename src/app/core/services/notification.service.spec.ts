import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { NotificationType } from '../types/notification';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;
  const base = `${environment.printLogApiUrl}/api/notifications`;
  const countUrl = `${base}/unread-count`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('startPolling fetches immediately then every 30s', fakeAsync(() => {
    service.startPolling();
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 1, unreadAchievementCount: 0 });

    tick(30000);
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 2, unreadAchievementCount: 0 });

    expect(service.unreadCount()).toBe(2);
    service.stopPolling();
    discardPeriodicTasks();
  }));

  it('poll sets unreadAchievementCount from response', fakeAsync(() => {
    service.startPolling();
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 3, unreadAchievementCount: 2 });

    expect(service.unreadAchievementCount()).toBe(2);
    service.stopPolling();
    discardPeriodicTasks();
  }));

  it('pollTick increments on every response even when counts are unchanged', fakeAsync(() => {
    service.startPolling();
    const before = service.pollTick();
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 1, unreadAchievementCount: 1 });
    tick(30000);
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 1, unreadAchievementCount: 1 });
    service.refreshUnreadCount();
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 1, unreadAchievementCount: 1 });

    expect(service.pollTick()).toBe(before + 3);
    service.stopPolling();
    discardPeriodicTasks();
  }));

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
    expect(done).toBeTrue();
  });

  it('markMultipleAsRead decrements counts optimistically', fakeAsync(() => {
    service.startPolling();
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 5, unreadAchievementCount: 2 });

    service.markMultipleAsRead(['a', 'b', 'c']).subscribe();
    http.expectOne(`${base}/read`).flush(null);

    expect(service.unreadCount()).toBe(2);
    expect(service.unreadAchievementCount()).toBe(0);
    service.stopPolling();
    discardPeriodicTasks();
  }));

  it('stopPolling then startPolling runs exactly one poller', fakeAsync(() => {
    service.startPolling();
    http.expectOne(countUrl).flush({ unreadCount: 0 });
    service.stopPolling();
    service.startPolling();
    http.expectOne(countUrl).flush({ unreadCount: 0 });

    tick(30000);
    http.expectOne(countUrl).flush({ unreadCount: 0 });

    service.stopPolling();
    discardPeriodicTasks();
  }));

  it('a failed poll does not stop polling', fakeAsync(() => {
    service.startPolling();
    http
      .expectOne(countUrl)
      .flush('down', { status: 503, statusText: 'Service Unavailable' });

    tick(30000);
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 2, unreadAchievementCount: 1 });

    expect(service.unreadAchievementCount()).toBe(1);
    service.stopPolling();
    discardPeriodicTasks();
  }));

  it('stopPolling resets both counts', fakeAsync(() => {
    service.startPolling();
    http
      .expectOne(countUrl)
      .flush({ unreadCount: 4, unreadAchievementCount: 1 });

    service.stopPolling();

    expect(service.unreadCount()).toBe(0);
    expect(service.unreadAchievementCount()).toBe(0);
    discardPeriodicTasks();
  }));
});
