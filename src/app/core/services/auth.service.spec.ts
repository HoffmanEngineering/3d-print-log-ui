import type { Mock, MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
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
  let mockUserService: MockedObject<UserService>;
  let mockNotificationService: MockedObject<NotificationService>;
  let mockSubscriptionService: MockedObject<SubscriptionService>;

  beforeEach(() => {
    mockUserService = {
      getCurrentUserDetail: vi
        .fn()
        .mockName('UserService.getCurrentUserDetail'),
    } as unknown as MockedObject<UserService>;
    mockNotificationService = {
      stopPolling: vi.fn().mockName('NotificationService.stopPolling'),
      startPolling: vi.fn().mockName('NotificationService.startPolling'),
    } as unknown as MockedObject<NotificationService>;
    mockSubscriptionService = {
      loadSubscription: vi
        .fn()
        .mockName('SubscriptionService.loadSubscription'),
    } as unknown as MockedObject<SubscriptionService>;

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
      const setUser = vi
        .spyOn(logging, 'setAuthenticatedUser')
        .mockReturnValue(undefined);
      const service = TestBed.inject(AuthService);

      service.localAuthSetup();

      expect(setUser).toHaveBeenCalledWith(1);
    });

    it('should set the mock user profile and loggedIn=true when devAuthBypass is true', () => {
      const service = TestBed.inject(AuthService);

      service.localAuthSetup();

      expect(service.userProfile()).not.toBeNull();
      expect(service.loggedIn).toBe(true);
      expect(service.isLoggedIn()).toBe(true);
    });

    it('sets loggedIn=false and emits no profile when the dev anonymous flag is set', () => {
      sessionStorage.setItem('devUserId', 'anonymous');
      const service = TestBed.inject(AuthService);

      service.localAuthSetup();

      expect(service.loggedIn).toBe(false);
      expect(service.isLoggedIn()).toBe(false);
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
      (
        service as unknown as {
          auth0Client$: unknown;
        }
      ).auth0Client$ = defer(() => {
        order.push('auth0-logout');
        return of({ logout: () => undefined });
      });
    }

    it('awaits the push teardown hook before Auth0 logout, with a live bearer', async () => {
      const service = TestBed.inject(AuthService);
      const order: string[] = [];
      vi.spyOn(service, 'getTokenSilently$').mockReturnValue(of('bearer-abc'));
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
      vi.spyOn(service, 'getTokenSilently$').mockReturnValue(of('bearer-abc'));
      trackAuth0Logout(service, []);
      const store = TestBed.inject(PrinterThumbnailStore);
      const invalidate = vi
        .spyOn(store, 'invalidate')
        .mockReturnValue(undefined);

      await service.logout();

      expect(invalidate).toHaveBeenCalled();
    });

    it('clears the telemetry user and onboarding state on logout', async () => {
      const service = TestBed.inject(AuthService);
      trackAuth0Logout(service, []);
      const logging = TestBed.inject(LoggingService);
      const clearUser = vi
        .spyOn(logging, 'clearAuthenticatedUser')
        .mockReturnValue(undefined);
      const clearOnboarding = vi
        .spyOn(TestBed.inject(OnboardingService), 'clear')
        .mockReturnValue(undefined);

      await service.logout();

      expect(clearUser).toHaveBeenCalled();
      expect(clearOnboarding).toHaveBeenCalled();
    });

    it('still logs the user out when the teardown hook throws', async () => {
      const service = TestBed.inject(AuthService);
      const order: string[] = [];
      vi.spyOn(service, 'getTokenSilently$').mockReturnValue(of('bearer-abc'));
      trackAuth0Logout(service, order);

      service.pushTeardown = () => Promise.reject(new Error('native gone'));

      await service.logout();

      expect(order).toEqual(['auth0-logout']);
    });

    it('still logs the user out when no token can be minted', async () => {
      const service = TestBed.inject(AuthService);
      const order: string[] = [];
      vi.spyOn(service, 'getTokenSilently$').mockImplementation(() => {
        throw new Error('no refresh token');
      });
      trackAuth0Logout(service, order);

      service.pushTeardown = vi.fn().mockResolvedValue(undefined);

      await service.logout();

      expect(service.pushTeardown).not.toHaveBeenCalled();
      expect(order).toEqual(['auth0-logout']);
    });
  });

  describe('telemetry user', () => {
    function stubClient(service: AuthService) {
      (
        service as unknown as {
          auth0Client$: unknown;
        }
      ).auth0Client$ = of({
        getUser: () => Promise.resolve({ nickname: 'nick', picture: 'p' }),
      });
    }

    it('sets the telemetry user when the profile loads', async () => {
      const service = TestBed.inject(AuthService);
      const setUser = vi
        .spyOn(TestBed.inject(LoggingService), 'setAuthenticatedUser')
        .mockReturnValue(undefined);
      stubClient(service);
      mockUserService.getCurrentUserDetail.mockReturnValue(
        of({ id: 77, displayName: 'Named' } as any)
      );

      service.getUser$().subscribe(() => {
        expect(setUser).toHaveBeenCalledWith(77);
      });
    });

    it('sets the telemetry user after the first-login displayName update', async () => {
      const service = TestBed.inject(AuthService);
      const setUser = vi
        .spyOn(TestBed.inject(LoggingService), 'setAuthenticatedUser')
        .mockReturnValue(undefined);
      stubClient(service);
      mockUserService.getCurrentUserDetail.mockReturnValue(
        of({ id: 78, displayName: null } as any)
      );
      (mockUserService as any).updateCurrentUserDetail = vi
        .fn()
        .mockReturnValue(of({ id: 78, displayName: 'nick' }));

      service.getUser$().subscribe(() => {
        expect(setUser).toHaveBeenCalledWith(78);
      });
    });
  });

  describe('login screen_hint', () => {
    let service: AuthService;
    let client: MockedObject<{
      loginWithRedirect: (o: unknown) => void;
    }>;

    beforeEach(() => {
      service = TestBed.inject(AuthService);
      client = {
        loginWithRedirect: vi.fn().mockName('Auth0Client.loginWithRedirect'),
      };
      (
        service as unknown as {
          auth0Client$: unknown;
        }
      ).auth0Client$ = of(client);
    });

    it('omits screen_hint for an ordinary login', () => {
      service.login('/prints');

      const params = vi.mocked(client.loginWithRedirect).mock.lastCall[0] as {
        authorizationParams: Record<string, unknown>;
      };
      expect(params.authorizationParams['screen_hint']).toBeUndefined();
    });

    it('sends screen_hint=signup when asked for signup', () => {
      service.login('/prints', { signup: true });

      const params = vi.mocked(client.loginWithRedirect).mock.lastCall[0] as {
        authorizationParams: Record<string, unknown>;
      };
      expect(params.authorizationParams['screen_hint']).toBe('signup');
    });

    it('still carries the redirect target through appState', () => {
      service.login('/prints', { signup: true });

      const params = vi.mocked(client.loginWithRedirect).mock.lastCall[0] as {
        appState: {
          target: string;
        };
      };
      expect(params.appState.target).toBe('/prints');
    });

    it('carries the sign-up source through appState', () => {
      service.login('/prints', { signup: true, source: 'home' });

      const params = vi.mocked(client.loginWithRedirect).mock.lastCall[0] as {
        appState: {
          target: string;
          source?: string;
        };
      };
      expect(params.appState).toEqual({ target: '/prints', source: 'home' });
    });
  });

  describe('new-user display name', () => {
    function stubClient(service: AuthService, user: unknown) {
      (
        service as unknown as {
          auth0Client$: unknown;
        }
      ).auth0Client$ = of({
        getUser: () => Promise.resolve(user),
      });
    }

    let update: Mock;

    beforeEach(() => {
      mockUserService.getCurrentUserDetail.mockReturnValue(
        of({ id: 90, displayName: null } as any)
      );
      update = vi.fn().mockReturnValue(of({ id: 90, displayName: 'x' }));
      (mockUserService as any).updateCurrentUserDetail = update;
    });

    it('leaves the name null when Auth0 has no nickname', async () => {
      vi.useFakeTimers();
      const service = TestBed.inject(AuthService);
      stubClient(service, { picture: 'p' });

      service.getUser$().subscribe();
      await vi.advanceTimersByTimeAsync(0);

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: null, profilePicture: 'p' })
      );
    });

    it('truncates a long nickname to 29 characters', async () => {
      vi.useFakeTimers();
      const service = TestBed.inject(AuthService);
      stubClient(service, { nickname: 'n'.repeat(40), picture: 'p' });

      service.getUser$().subscribe();
      await vi.advanceTimersByTimeAsync(0);

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'n'.repeat(29) })
      );
    });

    it('sends the PUT once per page load when getUser$ runs twice', async () => {
      vi.useFakeTimers();
      const service = TestBed.inject(AuthService);
      stubClient(service, { nickname: 'nick', picture: 'p' });

      service.getUser$().subscribe();
      service.getUser$().subscribe();
      await vi.advanceTimersByTimeAsync(0);

      expect(update).toHaveBeenCalledTimes(1);
    });
  });

  describe('auth callback', () => {
    const PROFILE_ID = 4242;
    const SIGNUP_KEY = `pl_signup_logged_${PROFILE_ID}`;
    const MINUTE = 60 * 1000;

    let service: AuthService;
    let onboarding: OnboardingService;
    let status: Mock;
    let shouldShowWelcome: Mock;
    let logEvent: Mock;
    let logException: Mock;
    let gaEvent: Mock;
    let navigate: Mock;

    function statusCreated(msAgo: number | null) {
      status.mockResolvedValue({
        onboardingEligible: true,
        createdDate:
          msAgo === null ? null : new Date(Date.now() - msAgo).toISOString(),
        emailVerified: true,
      });
    }

    async function runCallback(appState: { target?: string; source?: string }) {
      const fields = service as unknown as Record<string, unknown>;
      fields['handleRedirectCallback$'] = of({ appState });
      fields['isAuthenticated$'] = of(true);
      fields['auth0Client$'] = of({
        getUser: () => Promise.resolve({ nickname: 'nick', picture: 'p' }),
      });
      service.handleAuthCallback();
      await vi.advanceTimersByTimeAsync(0);
    }

    function signupLogs() {
      return vi
        .mocked(logEvent)
        .mock.calls.filter(([name]) => name === 'Auth_SignedUp');
    }

    beforeEach(() => {
      localStorage.removeItem(SIGNUP_KEY);
      mockUserService.getCurrentUserDetail.mockReturnValue(
        of({ id: PROFILE_ID, displayName: 'Named' } as any)
      );
      service = TestBed.inject(AuthService);
      onboarding = TestBed.inject(OnboardingService);
      status = vi.spyOn(onboarding, 'status').mockReturnValue(undefined);
      statusCreated(1 * MINUTE);
      shouldShowWelcome = vi
        .spyOn(onboarding, 'shouldShowWelcome')
        .mockResolvedValue(false);
      logEvent = vi
        .spyOn(TestBed.inject(LoggingService), 'logEvent')
        .mockReturnValue(undefined);
      vi.spyOn(
        TestBed.inject(LoggingService),
        'setAuthenticatedUser'
      ).mockReturnValue(undefined);
      logException = vi
        .spyOn(TestBed.inject(LoggingService), 'logException')
        .mockReturnValue(undefined);
      gaEvent = vi
        .spyOn(TestBed.inject(GoogleAnalyticsService), 'eventEmitter')
        .mockReturnValue(undefined);
      navigate = vi
        .spyOn(TestBed.inject(Router), 'navigateByUrl')
        .mockResolvedValue(true);
    });

    afterEach(() => {
      localStorage.removeItem(SIGNUP_KEY);
    });

    describe('sign-up logging', () => {
      it('logs Auth_SignedUp once for a new account and sets the key', async () => {
        vi.useFakeTimers();
        await runCallback({ target: '/prints', source: 'home' });

        expect(signupLogs()).toEqual([['Auth_SignedUp', { source: 'home' }]]);
        expect(gaEvent).toHaveBeenCalledTimes(1);
        expect(gaEvent).toHaveBeenCalledWith(
          'sign_up',
          'engagement',
          'sign_up',
          'home'
        );
        expect(localStorage.getItem(SIGNUP_KEY)).not.toBeNull();
      });

      it('does not log twice for the same account', async () => {
        vi.useFakeTimers();
        await runCallback({ target: '/prints', source: 'home' });
        await runCallback({ target: '/prints', source: 'home' });

        expect(signupLogs().length).toBe(1);
      });

      it('does not log when createdDate is older than 10 minutes', async () => {
        vi.useFakeTimers();
        statusCreated(11 * MINUTE);

        await runCallback({ target: '/prints', source: 'home' });

        expect(signupLogs()).toEqual([]);
        expect(gaEvent).not.toHaveBeenCalled();
      });

      it('does not log when createdDate is unknown', async () => {
        vi.useFakeTimers();
        statusCreated(null);

        await runCallback({ target: '/prints' });

        expect(signupLogs()).toEqual([]);
      });

      it('does not log when the key already exists', async () => {
        vi.useFakeTimers();
        localStorage.setItem(SIGNUP_KEY, '1');

        await runCallback({ target: '/prints', source: 'home' });

        expect(signupLogs()).toEqual([]);
        expect(gaEvent).not.toHaveBeenCalled();
      });

      it('uses the source from appState', async () => {
        vi.useFakeTimers();
        await runCallback({ target: '/prints/new/cura?x=1', source: 'home' });

        expect(signupLogs()).toEqual([['Auth_SignedUp', { source: 'home' }]]);
      });

      it('uses slicer for a Cura hand-off target with no source', async () => {
        vi.useFakeTimers();
        await runCallback({ target: '/prints/new/cura?gcode=abc' });

        expect(signupLogs()).toEqual([['Auth_SignedUp', { source: 'slicer' }]]);
      });

      it('uses direct otherwise', async () => {
        vi.useFakeTimers();
        await runCallback({ target: '/settings' });

        expect(signupLogs()).toEqual([['Auth_SignedUp', { source: 'direct' }]]);
      });
    });

    describe('welcome redirect', () => {
      it('navigates to /welcome when shouldShowWelcome is true', async () => {
        vi.useFakeTimers();
        shouldShowWelcome.mockResolvedValue(true);

        await runCallback({ target: '/prints' });

        expect(shouldShowWelcome).toHaveBeenCalledWith('/prints');
        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledWith('/welcome', {
          state: { entry: 'callback' },
        });
      });

      it('navigates to the target when shouldShowWelcome is false', async () => {
        vi.useFakeTimers();
        await runCallback({ target: '/prints' });

        expect(navigate).toHaveBeenCalledTimes(1);

        expect(navigate).toHaveBeenCalledWith('/prints');
      });

      it('navigates to the target when shouldShowWelcome rejects', async () => {
        vi.useFakeTimers();
        shouldShowWelcome.mockRejectedValue(new Error('boom'));

        await runCallback({ target: '/prints' });

        expect(navigate).toHaveBeenCalledTimes(1);

        expect(navigate).toHaveBeenCalledWith('/prints');
      });

      it('defaults the target to / when appState has none', async () => {
        vi.useFakeTimers();
        await runCallback({});

        expect(navigate).toHaveBeenCalledTimes(1);

        expect(navigate).toHaveBeenCalledWith('/');
      });

      it('falls back to the target after 3 s when the lookups hang', async () => {
        vi.useFakeTimers();
        shouldShowWelcome.mockReturnValue(new Promise<boolean>(() => {}));
        status.mockReturnValue(new Promise(() => {}));

        await runCallback({ target: '/prints' });
        expect(navigate).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(3000);

        expect(navigate).toHaveBeenCalledTimes(1);

        expect(navigate).toHaveBeenCalledWith('/prints');
        await vi.runAllTimersAsync(); // the sign-up logging gives up on its own, later
      });

      it('still navigates when the sign-up check rejects', async () => {
        vi.useFakeTimers();
        status.mockRejectedValue(new Error('down'));

        await runCallback({ target: '/prints' });

        expect(navigate).toHaveBeenCalledTimes(1);

        expect(navigate).toHaveBeenCalledWith('/prints');
        expect(signupLogs()).toEqual([]);
      });

      it('goes to /welcome without waiting for a profile that never loads', async () => {
        vi.useFakeTimers();
        shouldShowWelcome.mockResolvedValue(true);
        mockUserService.getCurrentUserDetail.mockReturnValue(NEVER);

        await runCallback({ target: '/prints' });

        expect(navigate).toHaveBeenCalledTimes(1);

        expect(navigate).toHaveBeenCalledWith('/welcome', {
          state: { entry: 'callback' },
        });
        await vi.advanceTimersByTimeAsync(10000); // the background sign-up logging gives up on the profile
        expect(signupLogs()).toEqual([]);
        expect(logException).toHaveBeenCalled();
      });

      it('goes to /welcome when the new-user PUT fails', async () => {
        vi.useFakeTimers();
        shouldShowWelcome.mockResolvedValue(true);
        mockUserService.getCurrentUserDetail.mockReturnValue(
          of({ id: PROFILE_ID, displayName: null } as any)
        );
        (mockUserService as any).updateCurrentUserDetail = vi
          .fn()
          .mockReturnValue(throwError(() => new Error('400')));

        await runCallback({ target: '/prints' });

        expect(navigate).toHaveBeenCalledTimes(1);

        expect(navigate).toHaveBeenCalledWith('/welcome', {
          state: { entry: 'callback' },
        });
        await vi.advanceTimersByTimeAsync(10000); // the background sign-up logging gives up on the profile
        expect(logException).toHaveBeenCalled();
      });

      it('goes to /welcome while the sign-up status lookup hangs', async () => {
        vi.useFakeTimers();
        shouldShowWelcome.mockResolvedValue(true);
        status.mockReturnValue(new Promise(() => {}));

        await runCallback({ target: '/prints' });

        expect(navigate).toHaveBeenCalledTimes(1);

        expect(navigate).toHaveBeenCalledWith('/welcome', {
          state: { entry: 'callback' },
        });
        await vi.runAllTimersAsync();
      });
    });
  });
});
