import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { NotificationService } from '../services/notification.service';
import { AchievementRefreshInterceptor } from './achievement-refresh.interceptor';

describe('AchievementRefreshInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let refresh: jasmine.Spy;

  beforeEach(() => {
    refresh = jasmine.createSpy('refreshUnreadCount');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AchievementRefreshInterceptor,
          multi: true,
        },
        {
          provide: NotificationService,
          useValue: { refreshUnreadCount: refresh },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('refreshes after successful POST to /api/Prints', () => {
    http.post('https://api.test/api/Prints', {}).subscribe();
    controller
      .expectOne('https://api.test/api/Prints')
      .flush({}, { status: 201, statusText: 'Created' });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes after PUT to printers and maintenance, case-insensitively', () => {
    http.put('https://api.test/api/printers/4', {}).subscribe();
    http.post('https://api.test/api/PrinterMaintenance', {}).subscribe();
    controller.expectOne('https://api.test/api/printers/4').flush({});
    controller.expectOne('https://api.test/api/PrinterMaintenance').flush({});

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('ignores GET and failed responses', () => {
    http.get('https://api.test/api/Prints').subscribe();
    http
      .post('https://api.test/api/Prints', {})
      .subscribe({ error: () => undefined });
    controller.expectOne((r) => r.method === 'GET').flush([]);
    controller
      .expectOne((r) => r.method === 'POST')
      .flush('bad', { status: 400, statusText: 'Bad Request' });

    expect(refresh).not.toHaveBeenCalled();
  });

  it('ignores unrelated writes', () => {
    http.put('https://api.test/api/notifications/read', {}).subscribe();
    controller.expectOne('https://api.test/api/notifications/read').flush(null);

    expect(refresh).not.toHaveBeenCalled();
  });
});
