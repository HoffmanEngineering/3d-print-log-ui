import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment.unittest';

import { ApiKeyService, UserApiKeySummary } from './api-key.service';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

describe('ApiKeyService', () => {
  let service: ApiKeyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ApiKeyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getApiKeySummaryForUser', () => {
    it('should make a GET request to the /api/UserApiKeys endpoint', (done) => {
      const httpController = TestBed.inject(HttpTestingController);

      const testResult: UserApiKeySummary[] = [];

      service.getApiKeySummaryForUser().subscribe(() => {
        done();
      });

      const request = httpController.expectOne(
        `${environment.printLogApiUrl}/api/UserApiKeys`
      );
      expect(request.request.method).toEqual('GET');

      request.flush(testResult);
    });

    it('should return an array of UserApiKeySummary', (done) => {
      const httpController = TestBed.inject(HttpTestingController);

      const testResult: UserApiKeySummary[] = [
        {
          id: 'TEST-GUID-1',
          description: 'test description 1',
          isDeleted: false,
          createdById: 123,
          createdDate: new Date('2021-05-26 10:00:00Z'),
          updatedById: 123,
          updatedDate: new Date('2021-05-26 10:00:00Z'),
        },
        {
          id: 'TEST-GUID-2',
          description: 'test description 2',
          isDeleted: false,
          createdById: 123,
          createdDate: new Date('2021-05-24 10:00:00Z'),
          updatedById: 123,
          updatedDate: new Date('2021-05-24 10:00:00Z'),
        },
      ];

      service.getApiKeySummaryForUser().subscribe((actualResult) => {
        expect(actualResult.length).toEqual(testResult.length);
        done();
      });

      const request = httpController.expectOne(
        `${environment.printLogApiUrl}/api/UserApiKeys`
      );

      request.flush(testResult);
    });
  });

  describe('createNewApiKey', () => {
    it('should make a POST request to the /api/UserApiKeys endpoint', (done) => {
      const httpController = TestBed.inject(HttpTestingController);

      const testDescription = 'test description 1';
      const testResult: UserApiKeySummary = {
        id: 'NEW-TEST-GUID-1',
        description: testDescription,
        isDeleted: false,
        createdById: 123,
        createdDate: new Date('2021-05-26 10:00:00Z'),
        updatedById: 123,
        updatedDate: new Date('2021-05-26 10:00:00Z'),
      };

      service.createNewApiKey(testDescription).subscribe((actualKey) => {
        done();
      });

      const request = httpController.expectOne(
        `${environment.printLogApiUrl}/api/UserApiKeys`
      );
      expect(request.request.method).toEqual('POST');

      request.flush(testResult);
    });

    it('should return the newly created key', (done) => {
      const httpController = TestBed.inject(HttpTestingController);

      const testDescription = 'test description 1';
      const testResult: UserApiKeySummary = {
        id: 'NEW-TEST-GUID-1',
        description: testDescription,
        isDeleted: false,
        createdById: 123,
        createdDate: new Date('2021-05-26 10:00:00Z'),
        updatedById: 123,
        updatedDate: new Date('2021-05-26 10:00:00Z'),
      };

      service.createNewApiKey(testDescription).subscribe((actualKey) => {
        expect(actualKey.description).toEqual(testDescription);
        expect(actualKey.id).toEqual(testResult.id);
        done();
      });

      const request = httpController.expectOne(
        `${environment.printLogApiUrl}/api/UserApiKeys`
      );

      request.flush(testResult);
    });
  });
  describe('deleteApiKey', () => {
    it('should make a DELETE request to the /api/UserApiKeys/:id endpoint', (done) => {
      const httpController = TestBed.inject(HttpTestingController);

      const testId = 'NEW-TEST-GUID-1';

      service.deleteApiKey(testId).subscribe((_) => {
        done();
      });

      const request = httpController.expectOne(
        `${environment.printLogApiUrl}/api/UserApiKeys/${testId}`
      );
      expect(request.request.method).toEqual('DELETE');

      request.flush({});
    });
  });
});
