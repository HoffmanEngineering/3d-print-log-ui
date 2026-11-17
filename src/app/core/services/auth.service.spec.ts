import type { Mock, MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { GoogleAnalyticsService } from './google-analytics.service';
import { defer, firstValueFrom, NEVER, of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
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

  describe('ending a session Auth0 no longer accepts', () => {
    const RELOGIN_KEY = 'pl_session_relogin_at';

    let service: AuthService;
    let client: {
      getTokenSilently: Mock;
      logout: Mock;
      loginWithRedirect: Mock;
    };
    let logEvent: Mock;
    let navigate: Mock;

    /** The SDK's GenericError for a refresh token Auth0 has revoked or rotated away. */
    const invalidGrant = Object.assign(
      new Error('Unknown or invalid refresh token.'),
      {
        error: 'invalid_grant',
        error_description: 'Unknown or invalid refresh token.',
      }
    );

    function currentUrl(): string {
      const { pathname, search, hash } = window.location;
      return `${pathname}${search}${hash}`;
    }

    function failToken(error: unknown = invalidGrant): Promise<unknown> {
      client.getTokenSilently.mockRejectedValue(error);
      return firstValueFrom(service.getTokenSilently$()).catch(
        (e: unknown) => e
      );
    }

    beforeEach(() => {
      sessionStorage.removeItem(RELOGIN_KEY);
      service = TestBed.inject(AuthService);
      client = {
        getTokenSilently: vi.fn(),
        logout: vi.fn().mockResolvedValue(undefined),
        loginWithRedirect: vi.fn().mockResolvedValue(undefined),
      };
      (service as unknown as { auth0Client$: unknown }).auth0Client$ =
        of(client);
      service.loggedIn = true;
      logEvent = vi
        .spyOn(TestBed.inject(LoggingService), 'logEvent')
        .mockReturnValue(undefined);
      vi.spyOn(
        TestBed.inject(LoggingService),
        'clearAuthenticatedUser'
      ).mockReturnValue(undefined);
      navigate = vi
        .spyOn(TestBed.inject(Router), 'navigateByUrl')
        .mockResolvedValue(true);
    });

    afterEach(() => {
      sessionStorage.removeItem(RELOGIN_KEY);
    });

    it.each(['invalid_grant', 'login_required', 'missing_refresh_token'])(
      'on %s, stops polling, clears the local cache without a redirect, then signs in again',
      async (code) => {
        const error = { error: code, message: code };

        const thrown = await failToken(error);
        await vi.waitFor(() =>
          expect(client.loginWithRedirect).toHaveBeenCalled()
        );

        expect(thrown).toBe(error);
        expect(mockNotificationService.stopPolling).toHaveBeenCalled();
        expect(client.logout).toHaveBeenCalledExactlyOnceWith({
          openUrl: false,
        });
        expect(client.logout.mock.invocationCallOrder[0]).toBeLessThan(
          client.loginWithRedirect.mock.invocationCallOrder[0]
        );
        expect(client.loginWithRedirect).toHaveBeenCalledTimes(1);
        expect(client.loginWithRedirect.mock.lastCall![0].appState).toEqual({
          target: currentUrl(),
        });
        expect(service.loggedIn).toBe(false);
        expect(logEvent).toHaveBeenCalledWith('Auth_SessionExpired', {
          reason: code,
          action: 'relogin',
        });
      }
    );

    // Every API call in flight fails at once; they must not each start a redirect.
    it('ends the session once when parallel requests fail together', async () => {
      await Promise.all([failToken(), failToken(), failToken()]);
      await vi.waitFor(() =>
        expect(client.loginWithRedirect).toHaveBeenCalled()
      );

      expect(client.logout).toHaveBeenCalledTimes(1);
      expect(client.loginWithRedirect).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.stopPolling).toHaveBeenCalledTimes(1);
    });

    // A fresh sign-in that fails again within a minute would otherwise loop through Auth0.
    it('goes to / signed out when the session already ended within the last minute', async () => {
      sessionStorage.setItem(RELOGIN_KEY, String(Date.now() - 10 * 1000));

      await failToken();
      await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));

      expect(client.logout).toHaveBeenCalledExactlyOnceWith({
        openUrl: false,
      });
      expect(client.loginWithRedirect).not.toHaveBeenCalled();
      expect(service.loggedIn).toBe(false);
      expect(logEvent).toHaveBeenCalledWith('Auth_SessionExpired', {
        reason: 'invalid_grant',
        action: 'signedOut',
      });
    });

    it('signs in again when the last attempt was more than a minute ago', async () => {
      sessionStorage.setItem(RELOGIN_KEY, String(Date.now() - 2 * 60 * 1000));

      await failToken();
      await vi.waitFor(() =>
        expect(client.loginWithRedirect).toHaveBeenCalled()
      );

      expect(navigate).not.toHaveBeenCalled();
    });

    // Anonymous visitors on public pages get missing_refresh_token on every request.
    it('leaves a signed-out visitor alone', async () => {
      service.loggedIn = false;

      await failToken({ error: 'missing_refresh_token' });
      await Promise.resolve();

      expect(client.logout).not.toHaveBeenCalled();
      expect(client.loginWithRedirect).not.toHaveBeenCalled();
      expect(mockNotificationService.stopPolling).not.toHaveBeenCalled();
    });

    // logout() mints a token for the push teardown; failing there must not start a sign-in.
    it('does not sign in again when the token fails during an explicit logout', async () => {
      client.getTokenSilently.mockRejectedValue(invalidGrant);
      service.pushTeardown = vi.fn().mockResolvedValue(undefined);

      await service.logout();
      await Promise.resolve();

      expect(client.loginWithRedirect).not.toHaveBeenCalled();
      expect(client.logout).toHaveBeenCalledTimes(1);
      expect(client.logout.mock.lastCall![0].openUrl).toBeUndefined();
    });

    it('leaves the session alone on other token errors', async () => {
      const error = { error: 'timeout', message: 'Timeout' };

      const thrown = await failToken(error);
      await Promise.resolve();

      expect(thrown).toBe(error);
      expect(client.logout).not.toHaveBeenCalled();
      expect(client.loginWithRedirect).not.toHaveBeenCalled();
    });
  });

  describe('auth callback errors', () => {
    let service: AuthService;
    let toastr: { error: Mock };
    let logEvent: Mock;
    let logException: Mock;
    let navigate: Mock;
    let loginWithRedirect: Mock;

    function failCallback(error: unknown) {
      const fields = service as unknown as Record<string, unknown>;
      fields['handleRedirectCallback$'] = throwError(() => error);
      service.handleAuthCallback();
    }

    beforeEach(() => {
      toastr = { error: vi.fn() };
      TestBed.overrideProvider(ToastrService, { useValue: toastr });
      service = TestBed.inject(AuthService);
      loginWithRedirect = vi.fn();
      (service as unknown as { auth0Client$: unknown }).auth0Client$ = of({
        loginWithRedirect,
      });
      logEvent = vi
        .spyOn(TestBed.inject(LoggingService), 'logEvent')
        .mockReturnValue(undefined);
      logException = vi
        .spyOn(TestBed.inject(LoggingService), 'logException')
        .mockReturnValue(undefined);
      navigate = vi
        .spyOn(TestBed.inject(Router), 'navigateByUrl')
        .mockResolvedValue(true);
    });

    // A bookmarked or revisited /callback URL, or a login finished in another tab.
    it.each([
      ['missing_transaction', 'Invalid state'],
      ['state_mismatch', 'Invalid state'],
    ])(
      'on %s, drops the callback URL and goes home without signing in',
      (code, message) => {
        failCallback(Object.assign(new Error(message), { error: code }));

        expect(navigate).toHaveBeenCalledExactlyOnceWith('/', {
          replaceUrl: true,
        });
        expect(loginWithRedirect).not.toHaveBeenCalled();
        expect(toastr.error).not.toHaveBeenCalled();
        expect(logEvent).toHaveBeenCalledWith('Auth_CallbackInvalidState', {
          error: code,
        });
        expect(logException).not.toHaveBeenCalled();
      }
    );

    it('shows the description of an Auth0 error such as access_denied', () => {
      failCallback(
        Object.assign(new Error('User did not authorize the request'), {
          error: 'access_denied',
          error_description: 'User did not authorize the request',
        })
      );

      expect(toastr.error).toHaveBeenCalledExactlyOnceWith(
        'User did not authorize the request',
        'Sign-in failed'
      );
      expect(navigate).toHaveBeenCalledExactlyOnceWith('/', {
        replaceUrl: true,
      });
      expect(logEvent).toHaveBeenCalledWith('Auth_CallbackError', {
        error: 'access_denied',
        description: 'User did not authorize the request',
      });
      expect(logException).not.toHaveBeenCalled();
    });

    it('still leaves the callback page on an unexpected error', () => {
      const error = new Error('network down');

      failCallback(error);

      expect(navigate).toHaveBeenCalledExactlyOnceWith('/', {
        replaceUrl: true,
      });
      expect(logException).toHaveBeenCalledWith(error);
    });
  });
});
