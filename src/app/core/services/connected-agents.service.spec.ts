import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment.unittest';

import {
  ConnectedAgent,
  ConnectedAgentsService,
} from './connected-agents.service';

describe('ConnectedAgentsService', () => {
  let service: ConnectedAgentsService;
  let httpController: HttpTestingController;
  const baseApi = environment.printLogApiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ConnectedAgentsService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getConnectedAgents GETs /api/connected-agents and returns the typed contract', (done) => {
    const expected: ConnectedAgent[] = [
      { grantId: 'grant-1', clientId: 'client-1', scopes: ['read:printdata'] },
    ];

    service.getConnectedAgents().subscribe((agents) => {
      expect(agents).toEqual(expected);
      done();
    });

    const req = httpController.expectOne(`${baseApi}/api/connected-agents`);
    expect(req.request.method).toBe('GET');
    req.flush(expected);
  });

  it('revoke DELETEs /api/connected-agents/{grantId}', (done) => {
    service.revoke('grant-1').subscribe(() => {
      done();
    });

    const req = httpController.expectOne(
      `${baseApi}/api/connected-agents/grant-1`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
