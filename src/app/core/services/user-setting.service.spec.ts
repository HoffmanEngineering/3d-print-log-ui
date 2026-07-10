import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { lastValueFrom, throwError } from 'rxjs';
import {
  UserSettingService,
  UserSettingType,
  UserSettingDto,
} from './user-setting.service';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { AuthInterceptorService } from '../http/auth-interceptor.service';

const apiUrl = `${environment.printLogApiUrl}/api/Users/me/user-settings`;

function makeDto(overrides: Partial<UserSettingDto> = {}): UserSettingDto {
  return {
    id: 1,
    userId: 10,
    userSettingTypeId: UserSettingType.Currency_Name,
    value: 'USD',
    createdDate: '2024-01-01T00:00:00Z',
    updatedDate: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('UserSettingService', () => {
  let service: UserSettingService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(UserSettingService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrentUsersSettingByType', () => {
    it('fetches settings on cache miss and returns matching setting', async () => {
      const dto = makeDto({
        userSettingTypeId: UserSettingType.Currency_Name,
        value: 'USD',
      });

      const resultPromise = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      httpTesting.expectOne(apiUrl).flush([dto]);
      const result = await resultPromise;

      expect(result).not.toBeNull();
      expect(result!.userSettingTypeId).toBe(UserSettingType.Currency_Name);
      expect(result!.value).toBe('USD');
      expect(result!.createdDate).toBeInstanceOf(Date);
    });

    it('returns null when the requested setting type is not in the response', async () => {
      const dto = makeDto({
        userSettingTypeId: UserSettingType.Currency_Symbol,
      });

      const resultPromise = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      httpTesting.expectOne(apiUrl).flush([dto]);
      const result = await resultPromise;

      expect(result).toBeNull();
    });

    it('uses the cache on subsequent calls without making additional HTTP requests', async () => {
      const dto = makeDto();

      const first = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      httpTesting.expectOne(apiUrl).flush([dto]);
      await first;

      // Second call — no HTTP request should be made
      await service.getCurrentUsersSettingByType(UserSettingType.Currency_Name);
      httpTesting.expectNone(apiUrl);
    });

    it('rejects (does not swallow) when the fetch fails with an HttpErrorResponse', async () => {
      const promise = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Symbol
      );
      httpTesting
        .expectOne(apiUrl)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      await expectAsync(promise).toBeRejected();
    });

    it('rejects (does not swallow) a response-mapping/programming error', async () => {
      const promise = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Symbol
      );
      // A null body makes `for (const dto of dtos)` throw inside the map — this
      // is not the anonymous auth error and must not be swallowed as empty.
      httpTesting.expectOne(apiUrl).flush(null);

      await expectAsync(promise).toBeRejected();
    });

    it('does not cache an HttpErrorResponse failure (next call refetches)', async () => {
      const first = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Symbol
      );
      httpTesting
        .expectOne(apiUrl)
        .flush('boom', { status: 500, statusText: 'Server Error' });
      await expectAsync(first).toBeRejected();

      const second = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Symbol
      );
      httpTesting.expectOne(apiUrl).flush([]); // a second request IS made
      await second;
    });

    it('deduplicates concurrent cache-miss requests into a single HTTP call', async () => {
      const dtoA = makeDto({
        id: 1,
        userSettingTypeId: UserSettingType.Currency_Name,
        value: 'USD',
      });
      const dtoB = makeDto({
        id: 2,
        userSettingTypeId: UserSettingType.Currency_Symbol,
        value: '$',
      });

      // Start both calls before either resolves
      const call1 = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      const call2 = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Symbol
      );

      // Only one HTTP request should exist
      httpTesting.expectOne(apiUrl).flush([dtoA, dtoB]);

      const [result1, result2] = await Promise.all([call1, call2]);
      expect(result1!.value).toBe('USD');
      expect(result2!.value).toBe('$');
    });
  });

  describe('clearCache', () => {
    it('causes the next call to fetch from the API again', async () => {
      const dto = makeDto();

      const first = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      httpTesting.expectOne(apiUrl).flush([dto]);
      await first;

      service.clearCache();

      const second = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      httpTesting.expectOne(apiUrl).flush([dto]);
      await second;
    });
  });

  describe('updateUserSetting', () => {
    it('replaces the matching setting in the cache', async () => {
      const original = makeDto({ id: 5, value: 'USD' });
      const prime = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      httpTesting.expectOne(apiUrl).flush([original]);
      await prime;

      const updated = makeDto({ id: 5, value: 'EUR' });
      const updatePromise = lastValueFrom(service.updateUserSetting(5, 'EUR'));
      httpTesting.expectOne(apiUrl).flush(updated);
      await updatePromise;

      const result = await service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      expect(result!.value).toBe('EUR');
    });

    it('appends to the cache when the updated ID is not already present', async () => {
      const prime = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      httpTesting.expectOne(apiUrl).flush([]);
      await prime;

      const newSetting = makeDto({ id: 99, value: 'GBP' });
      const updatePromise = lastValueFrom(service.updateUserSetting(99, 'GBP'));
      httpTesting.expectOne(apiUrl).flush(newSetting);
      await updatePromise;

      const result = await service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      expect(result!.value).toBe('GBP');
    });
  });

  describe('addUserSetting', () => {
    it('appends a new setting to the cache', async () => {
      const prime = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      httpTesting.expectOne(apiUrl).flush([]);
      await prime;

      const newDto = makeDto({
        id: 7,
        userSettingTypeId: UserSettingType.Currency_Name,
        value: 'CAD',
      });
      const addPromise = lastValueFrom(
        service.addUserSetting(UserSettingType.Currency_Name, 'CAD')
      );
      httpTesting.expectOne(apiUrl).flush(newDto);
      await addPromise;

      const result = await service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      expect(result!.value).toBe('CAD');
    });

    it('replaces an existing cached setting with the same ID without corrupting other entries', async () => {
      const existingA = makeDto({
        id: 3,
        userSettingTypeId: UserSettingType.Currency_Name,
        value: 'USD',
      });
      const existingB = makeDto({
        id: 4,
        userSettingTypeId: UserSettingType.Currency_Symbol,
        value: '$',
      });
      const prime = service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      httpTesting.expectOne(apiUrl).flush([existingA, existingB]);
      await prime;

      const updatedA = makeDto({
        id: 3,
        userSettingTypeId: UserSettingType.Currency_Name,
        value: 'EUR',
      });
      const addPromise = lastValueFrom(
        service.addUserSetting(UserSettingType.Currency_Name, 'EUR')
      );
      httpTesting.expectOne(apiUrl).flush(updatedA);
      await addPromise;

      const resultA = await service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Name
      );
      const resultB = await service.getCurrentUsersSettingByType(
        UserSettingType.Currency_Symbol
      );
      expect(resultA!.value).toBe('EUR');
      expect(resultB!.value).toBe('$');
    });
  });
});

describe('UserSettingService — anonymous visitor (mocked HttpClient)', () => {
  let service: UserSettingService;
  let mockHttp: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    mockHttp = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    mockHttp.get.and.returnValue(
      throwError(() => ({ error: 'missing_refresh_token' }))
    );

    TestBed.configureTestingModule({
      providers: [{ provide: HttpClient, useValue: mockHttp }],
    });
    service = TestBed.inject(UserSettingService);
  });

  it('resolves to null when the request fails before dispatch', async () => {
    const result = await service.getCurrentUsersSettingByType(
      UserSettingType.Currency_Symbol
    );
    expect(result).toBeNull();
  });

  it('does not cache the anonymous fallback (next call refetches)', async () => {
    await service.getCurrentUsersSettingByType(UserSettingType.Currency_Symbol);
    await service.getCurrentUsersSettingByType(UserSettingType.Currency_Symbol);
    expect(mockHttp.get).toHaveBeenCalledTimes(2);
  });
});

describe('UserSettingService — anonymous through the real interceptor', () => {
  let service: UserSettingService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    (environment as any).devAuthBypass = false;
    const mockAuth = jasmine.createSpyObj<AuthService>('AuthService', [
      'getTokenSilently$',
    ]);
    mockAuth.getTokenSilently$.and.returnValue(
      throwError(() => ({ error: 'missing_refresh_token' }))
    );

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptorService,
          multi: true,
        },
        { provide: AuthService, useValue: mockAuth },
      ],
    });
    service = TestBed.inject(UserSettingService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('returns null and never dispatches the settings request', async () => {
    const result = await service.getCurrentUsersSettingByType(
      UserSettingType.Currency_Symbol
    );
    expect(result).toBeNull();
    httpTesting.expectNone(apiUrl);
  });
});
