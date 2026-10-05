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
import { environment } from '../../../environments/environment';
import { AchievementRefreshInterceptor } from './achievement-refresh.interceptor';

const api = environment.printLogApiUrl;

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
    http.post(`${api}/api/Prints`, {}).subscribe();
    controller
      .expectOne(`${api}/api/Prints`)
      .flush({}, { status: 201, statusText: 'Created' });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes after PUT to printers and maintenance, case-insensitively', () => {
    http.put(`${api}/api/printers/4`, {}).subscribe();
    http.post(`${api}/api/PrinterMaintenance`, {}).subscribe();
    controller.expectOne(`${api}/api/printers/4`).flush({});
    controller.expectOne(`${api}/api/PrinterMaintenance`).flush({});

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('ignores GET and failed responses', () => {
    http.get(`${api}/api/Prints`).subscribe();
    http.post(`${api}/api/Prints`, {}).subscribe({ error: () => undefined });
    controller.expectOne((r) => r.method === 'GET').flush([]);
    controller
      .expectOne((r) => r.method === 'POST')
      .flush('bad', { status: 400, statusText: 'Bad Request' });

    expect(refresh).not.toHaveBeenCalled();
  });

  it('ignores another origin even on a matching path', () => {
    http.post('https://elsewhere.example/api/Prints', {}).subscribe();
    controller.expectOne('https://elsewhere.example/api/Prints').flush({});

    expect(refresh).not.toHaveBeenCalled();
  });

  it('ignores unrelated writes', () => {
    http.put(`${api}/api/notifications/read`, {}).subscribe();
    controller.expectOne(`${api}/api/notifications/read`).flush(null);

    expect(refresh).not.toHaveBeenCalled();
  });
});
