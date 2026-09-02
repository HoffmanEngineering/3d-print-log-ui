import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { defer, of } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';
import { SubscriptionService } from './subscription.service';

describe('AuthService', () => {
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockSubscriptionService: jasmine.SpyObj<SubscriptionService>;

  beforeEach(() => {
    mockUserService = jasmine.createSpyObj<UserService>('UserService', [
      'getCurrentUserDetail',
    ]);
    mockNotificationService = jasmine.createSpyObj<NotificationService>(
      'NotificationService',
      ['stopPolling', 'startPolling']
    );
    mockSubscriptionService = jasmine.createSpyObj<SubscriptionService>(
      'SubscriptionService',
      ['loadSubscription']
    );

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    });
  });

  describe('when devAuthBypass is true', () => {
    beforeEach(() => {
      (environment as any).devAuthBypass = true;
    });

    afterEach(() => {
      (environment as any).devAuthBypass = false;
    });

    it('should be created', () => {
      const service: AuthService = TestBed.inject(AuthService);
      expect(service).toBeTruthy();
    });

    it('should emit mock user profile and set loggedIn=true when devAuthBypass is true', (done) => {
      const service = TestBed.inject(AuthService);

      service.localAuthSetup();

      service.userProfile$
        .pipe(
          filter((profile) => profile !== null),
          take(1)
        )
        .subscribe((profile) => {
          expect(profile).not.toBeNull();
          expect(service.loggedIn).toBeTrue();
          done();
        });
    });

    it('sets loggedIn=false and emits no profile when the dev anonymous flag is set', () => {
      sessionStorage.setItem('devUserId', 'anonymous');
      const service = TestBed.inject(AuthService);

      let latestProfile: unknown = 'unset';
      service.userProfile$.subscribe((p) => (latestProfile = p));

      service.localAuthSetup();

      expect(service.loggedIn).toBeFalse();
      expect(latestProfile).toBeNull(); // BehaviorSubject initial null, never overwritten

      sessionStorage.removeItem('devUserId');
    });
  });

  describe('logout push teardown', () => {
    /**
     * Replaces the Auth0 client stream with one that records when it is subscribed, so the
     * ordering claim — teardown finishes BEFORE Auth0 tears the session down — is actually
     * asserted rather than assumed.
     */
    function trackAuth0Logout(service: AuthService, order: string[]) {
      (service as unknown as { auth0Client$: unknown }).auth0Client$ = defer(
        () => {
          order.push('auth0-logout');
          return of({ logout: () => undefined });
        }
      );
    }

    it('awaits the push teardown hook before Auth0 logout, with a live bearer', async () => {
      const service = TestBed.inject(AuthService);
      const order: string[] = [];
      spyOn(service, 'getTokenSilently$').and.returnValue(of('bearer-abc'));
      trackAuth0Logout(service, order);

      service.pushTeardown = async (token) => {
        expect(token).toBe('bearer-abc');
        order.push('push-teardown');
      };

      await service.logout();

      expect(order).toEqual(['push-teardown', 'auth0-logout']);
    });

    it('still logs the user out when the teardown hook throws', async () => {
      const service = TestBed.inject(AuthService);
      const order: string[] = [];
      spyOn(service, 'getTokenSilently$').and.returnValue(of('bearer-abc'));
      trackAuth0Logout(service, order);

      service.pushTeardown = () => Promise.reject(new Error('native gone'));

      await service.logout();

      expect(order).toEqual(['auth0-logout']);
    });

    it('still logs the user out when no token can be minted', async () => {
      const service = TestBed.inject(AuthService);
      const order: string[] = [];
      spyOn(service, 'getTokenSilently$').and.throwError('no refresh token');
      trackAuth0Logout(service, order);

      service.pushTeardown = jasmine.createSpy('pushTeardown').and.resolveTo();

      await service.logout();

      expect(service.pushTeardown).not.toHaveBeenCalled();
      expect(order).toEqual(['auth0-logout']);
    });
  });

  describe('login screen_hint', () => {
    let service: AuthService;
    let client: jasmine.SpyObj<{ loginWithRedirect: (o: unknown) => void }>;

    beforeEach(() => {
      service = TestBed.inject(AuthService);
      client = jasmine.createSpyObj('Auth0Client', ['loginWithRedirect']);
      (service as unknown as { auth0Client$: unknown }).auth0Client$ =
        of(client);
    });

    it('omits screen_hint for an ordinary login', () => {
      service.login('/prints');

      const params = client.loginWithRedirect.calls.mostRecent().args[0] as {
        authorizationParams: Record<string, unknown>;
      };
      expect(params.authorizationParams['screen_hint']).toBeUndefined();
    });

    it('sends screen_hint=signup when asked for signup', () => {
      service.login('/prints', { signup: true });

      const params = client.loginWithRedirect.calls.mostRecent().args[0] as {
        authorizationParams: Record<string, unknown>;
      };
      expect(params.authorizationParams['screen_hint']).toBe('signup');
    });

    it('still carries the redirect target through appState', () => {
      service.login('/prints', { signup: true });

      const params = client.loginWithRedirect.calls.mostRecent().args[0] as {
        appState: { target: string };
      };
      expect(params.appState.target).toBe('/prints');
    });
  });
});
