import {
  fakeAsync,
  flush,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { GoogleAnalyticsService } from './google-analytics.service';
import { defer, NEVER, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';
import { SubscriptionService } from './subscription.service';
import { LoggingService } from './logging.service';
import { OnboardingService } from '../../onboarding/onboarding.service';
import { PrinterThumbnailStore } from '../stores/printer-thumbnail-store.service';

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

    it('does not know the login state before setup runs', () => {
      const service = TestBed.inject(AuthService);

      expect(service.isLoggedIn()).toBeNull();
    });

    it('sets the telemetry user to the dev id', () => {
      const logging = TestBed.inject(LoggingService);
      const setUser = spyOn(logging, 'setAuthenticatedUser');
      const service = TestBed.inject(AuthService);

      service.localAuthSetup();

      expect(setUser).toHaveBeenCalledWith(1);
    });

    it('should set the mock user profile and loggedIn=true when devAuthBypass is true', () => {
      const service = TestBed.inject(AuthService);

      service.localAuthSetup();

      expect(service.userProfile()).not.toBeNull();
      expect(service.loggedIn).toBeTrue();
      expect(service.isLoggedIn()).toBeTrue();
    });

    it('sets loggedIn=false and emits no profile when the dev anonymous flag is set', () => {
      sessionStorage.setItem('devUserId', 'anonymous');
      const service = TestBed.inject(AuthService);

      service.localAuthSetup();

      expect(service.loggedIn).toBeFalse();
      expect(service.isLoggedIn()).toBeFalse();
      expect(service.userProfile()).toBeNull();

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

    // The signed thumbnail map is per user. Left behind, the previous user's printer
    // photos stay on screen in any session that outlives the Auth0 redirect.
    it('clears the printer thumbnail map on logout', async () => {
      const service = TestBed.inject(AuthService);
      spyOn(service, 'getTokenSilently$').and.returnValue(of('bearer-abc'));
      trackAuth0Logout(service, []);
      const store = TestBed.inject(PrinterThumbnailStore);
      const invalidate = spyOn(store, 'invalidate');

      await service.logout();

      expect(invalidate).toHaveBeenCalled();
    });

    it('clears the telemetry user and onboarding state on logout', async () => {
      const service = TestBed.inject(AuthService);
      trackAuth0Logout(service, []);
      const logging = TestBed.inject(LoggingService);
      const clearUser = spyOn(logging, 'clearAuthenticatedUser');
      const clearOnboarding = spyOn(TestBed.inject(OnboardingService), 'clear');

      await service.logout();

      expect(clearUser).toHaveBeenCalled();
      expect(clearOnboarding).toHaveBeenCalled();
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

  describe('telemetry user', () => {
    function stubClient(service: AuthService) {
      (service as unknown as { auth0Client$: unknown }).auth0Client$ = of({
        getUser: () => Promise.resolve({ nickname: 'nick', picture: 'p' }),
      });
    }

    it('sets the telemetry user when the profile loads', (done) => {
      const service = TestBed.inject(AuthService);
      const setUser = spyOn(
        TestBed.inject(LoggingService),
        'setAuthenticatedUser'
      );
      stubClient(service);
      mockUserService.getCurrentUserDetail.and.returnValue(
        of({ id: 77, displayName: 'Named' } as any)
      );

      service.getUser$().subscribe(() => {
        expect(setUser).toHaveBeenCalledWith(77);
        done();
      });
    });

    it('sets the telemetry user after the first-login displayName update', (done) => {
      const service = TestBed.inject(AuthService);
      const setUser = spyOn(
        TestBed.inject(LoggingService),
        'setAuthenticatedUser'
      );
      stubClient(service);
      mockUserService.getCurrentUserDetail.and.returnValue(
        of({ id: 78, displayName: null } as any)
      );
      (mockUserService as any).updateCurrentUserDetail = jasmine
        .createSpy()
        .and.returnValue(of({ id: 78, displayName: 'nick' }));

      service.getUser$().subscribe(() => {
        expect(setUser).toHaveBeenCalledWith(78);
        done();
      });
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

    it('carries the sign-up source through appState', () => {
      service.login('/prints', { signup: true, source: 'home' });

      const params = client.loginWithRedirect.calls.mostRecent().args[0] as {
        appState: { target: string; source?: string };
      };
      expect(params.appState).toEqual({ target: '/prints', source: 'home' });
    });
  });

  describe('new-user display name', () => {
    function stubClient(service: AuthService, user: unknown) {
      (service as unknown as { auth0Client$: unknown }).auth0Client$ = of({
        getUser: () => Promise.resolve(user),
      });
    }

    let update: jasmine.Spy;

    beforeEach(() => {
      mockUserService.getCurrentUserDetail.and.returnValue(
        of({ id: 90, displayName: null } as any)
      );
      update = jasmine
        .createSpy('updateCurrentUserDetail')
        .and.returnValue(of({ id: 90, displayName: 'x' }));
      (mockUserService as any).updateCurrentUserDetail = update;
    });

    it('leaves the name null when Auth0 has no nickname', fakeAsync(() => {
      const service = TestBed.inject(AuthService);
      stubClient(service, { picture: 'p' });

      service.getUser$().subscribe();
      flushMicrotasks();

      expect(update).toHaveBeenCalledWith(
        jasmine.objectContaining({ displayName: null, profilePicture: 'p' })
      );
    }));

    it('truncates a long nickname to 29 characters', fakeAsync(() => {
      const service = TestBed.inject(AuthService);
      stubClient(service, { nickname: 'n'.repeat(40), picture: 'p' });

      service.getUser$().subscribe();
      flushMicrotasks();

      expect(update).toHaveBeenCalledWith(
        jasmine.objectContaining({ displayName: 'n'.repeat(29) })
      );
    }));

    it('sends the PUT once per page load when getUser$ runs twice', fakeAsync(() => {
      const service = TestBed.inject(AuthService);
      stubClient(service, { nickname: 'nick', picture: 'p' });

      service.getUser$().subscribe();
      service.getUser$().subscribe();
      flushMicrotasks();

      expect(update).toHaveBeenCalledTimes(1);
    }));
  });

  describe('auth callback', () => {
    const PROFILE_ID = 4242;
    const SIGNUP_KEY = `pl_signup_logged_${PROFILE_ID}`;
    const MINUTE = 60 * 1000;

    let service: AuthService;
    let onboarding: OnboardingService;
    let status: jasmine.Spy;
    let shouldShowWelcome: jasmine.Spy;
    let logEvent: jasmine.Spy;
    let logException: jasmine.Spy;
    let gaEvent: jasmine.Spy;
    let navigate: jasmine.Spy;

    function statusCreated(msAgo: number | null) {
      status.and.resolveTo({
        onboardingEligible: true,
        createdDate:
          msAgo === null ? null : new Date(Date.now() - msAgo).toISOString(),
        emailVerified: true,
      });
    }

    function runCallback(appState: { target?: string; source?: string }) {
      const fields = service as unknown as Record<string, unknown>;
      fields['handleRedirectCallback$'] = of({ appState });
      fields['isAuthenticated$'] = of(true);
      fields['auth0Client$'] = of({
        getUser: () => Promise.resolve({ nickname: 'nick', picture: 'p' }),
      });
      service.handleAuthCallback();
      flushMicrotasks();
    }

    function signupLogs() {
      return logEvent.calls
        .allArgs()
        .filter(([name]) => name === 'Auth_SignedUp');
    }

    beforeEach(() => {
      localStorage.removeItem(SIGNUP_KEY);
      mockUserService.getCurrentUserDetail.and.returnValue(
        of({ id: PROFILE_ID, displayName: 'Named' } as any)
      );
      service = TestBed.inject(AuthService);
      onboarding = TestBed.inject(OnboardingService);
      status = spyOn(onboarding, 'status');
      statusCreated(1 * MINUTE);
      shouldShowWelcome = spyOn(onboarding, 'shouldShowWelcome').and.resolveTo(
        false
      );
      logEvent = spyOn(TestBed.inject(LoggingService), 'logEvent');
      spyOn(TestBed.inject(LoggingService), 'setAuthenticatedUser');
      logException = spyOn(TestBed.inject(LoggingService), 'logException');
      gaEvent = spyOn(TestBed.inject(GoogleAnalyticsService), 'eventEmitter');
      navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(
        true
      );
    });

    afterEach(() => {
      localStorage.removeItem(SIGNUP_KEY);
    });

    describe('sign-up logging', () => {
      it('logs Auth_SignedUp once for a new account and sets the key', fakeAsync(() => {
        runCallback({ target: '/prints', source: 'home' });

        expect(signupLogs()).toEqual([['Auth_SignedUp', { source: 'home' }]]);
        expect(gaEvent).toHaveBeenCalledOnceWith(
          'sign_up',
          'engagement',
          'sign_up',
          'home'
        );
        expect(localStorage.getItem(SIGNUP_KEY)).not.toBeNull();
      }));

      it('does not log twice for the same account', fakeAsync(() => {
        runCallback({ target: '/prints', source: 'home' });
        runCallback({ target: '/prints', source: 'home' });

        expect(signupLogs().length).toBe(1);
      }));

      it('does not log when createdDate is older than 10 minutes', fakeAsync(() => {
        statusCreated(11 * MINUTE);

        runCallback({ target: '/prints', source: 'home' });

        expect(signupLogs()).toEqual([]);
        expect(gaEvent).not.toHaveBeenCalled();
      }));

      it('does not log when createdDate is unknown', fakeAsync(() => {
        statusCreated(null);

        runCallback({ target: '/prints' });

        expect(signupLogs()).toEqual([]);
      }));

      it('does not log when the key already exists', fakeAsync(() => {
        localStorage.setItem(SIGNUP_KEY, '1');

        runCallback({ target: '/prints', source: 'home' });

        expect(signupLogs()).toEqual([]);
        expect(gaEvent).not.toHaveBeenCalled();
      }));

      it('uses the source from appState', fakeAsync(() => {
        runCallback({ target: '/prints/new/cura?x=1', source: 'home' });

        expect(signupLogs()).toEqual([['Auth_SignedUp', { source: 'home' }]]);
      }));

      it('uses slicer for a Cura hand-off target with no source', fakeAsync(() => {
        runCallback({ target: '/prints/new/cura?gcode=abc' });

        expect(signupLogs()).toEqual([['Auth_SignedUp', { source: 'slicer' }]]);
      }));

      it('uses direct otherwise', fakeAsync(() => {
        runCallback({ target: '/settings' });

        expect(signupLogs()).toEqual([['Auth_SignedUp', { source: 'direct' }]]);
      }));
    });

    describe('welcome redirect', () => {
      it('navigates to /welcome when shouldShowWelcome is true', fakeAsync(() => {
        shouldShowWelcome.and.resolveTo(true);

        runCallback({ target: '/prints' });

        expect(shouldShowWelcome).toHaveBeenCalledWith('/prints');
        expect(navigate).toHaveBeenCalledOnceWith('/welcome', {
          state: { entry: 'callback' },
        });
      }));

      it('navigates to the target when shouldShowWelcome is false', fakeAsync(() => {
        runCallback({ target: '/prints' });

        expect(navigate).toHaveBeenCalledOnceWith('/prints');
      }));

      it('navigates to the target when shouldShowWelcome rejects', fakeAsync(() => {
        shouldShowWelcome.and.rejectWith(new Error('boom'));

        runCallback({ target: '/prints' });

        expect(navigate).toHaveBeenCalledOnceWith('/prints');
      }));

      it('defaults the target to / when appState has none', fakeAsync(() => {
        runCallback({});

        expect(navigate).toHaveBeenCalledOnceWith('/');
      }));

      it('falls back to the target after 3 s when the lookups hang', fakeAsync(() => {
        shouldShowWelcome.and.returnValue(new Promise<boolean>(() => {}));
        status.and.returnValue(new Promise(() => {}));

        runCallback({ target: '/prints' });
        expect(navigate).not.toHaveBeenCalled();

        tick(3000);

        expect(navigate).toHaveBeenCalledOnceWith('/prints');
        flush(); // the sign-up logging gives up on its own, later
      }));

      it('still navigates when the sign-up check rejects', fakeAsync(() => {
        status.and.rejectWith(new Error('down'));

        runCallback({ target: '/prints' });

        expect(navigate).toHaveBeenCalledOnceWith('/prints');
        expect(signupLogs()).toEqual([]);
      }));

      it('goes to /welcome without waiting for a profile that never loads', fakeAsync(() => {
        shouldShowWelcome.and.resolveTo(true);
        mockUserService.getCurrentUserDetail.and.returnValue(NEVER);

        runCallback({ target: '/prints' });

        expect(navigate).toHaveBeenCalledOnceWith('/welcome', {
          state: { entry: 'callback' },
        });
        tick(10000); // the background sign-up logging gives up on the profile
        expect(signupLogs()).toEqual([]);
        expect(logException).toHaveBeenCalled();
      }));

      it('goes to /welcome when the new-user PUT fails', fakeAsync(() => {
        shouldShowWelcome.and.resolveTo(true);
        mockUserService.getCurrentUserDetail.and.returnValue(
          of({ id: PROFILE_ID, displayName: null } as any)
        );
        (mockUserService as any).updateCurrentUserDetail = jasmine
          .createSpy('updateCurrentUserDetail')
          .and.returnValue(throwError(() => new Error('400')));

        runCallback({ target: '/prints' });

        expect(navigate).toHaveBeenCalledOnceWith('/welcome', {
          state: { entry: 'callback' },
        });
        tick(10000); // the background sign-up logging gives up on the profile
        expect(logException).toHaveBeenCalled();
      }));

      it('goes to /welcome while the sign-up status lookup hangs', fakeAsync(() => {
        shouldShowWelcome.and.resolveTo(true);
        status.and.returnValue(new Promise(() => {}));

        runCallback({ target: '/prints' });

        expect(navigate).toHaveBeenCalledOnceWith('/welcome', {
          state: { entry: 'callback' },
        });
        flush();
      }));
    });
  });
});
