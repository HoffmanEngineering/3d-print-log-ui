import {
  inject,
  Injectable,
  Injector,
  NgZone,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { createAuth0Client, Auth0Client } from '@auth0/auth0-spa-js';

import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  firstValueFrom,
  from,
  Observable,
  of,
  throwError,
} from 'rxjs';
import {
  catchError,
  concatMap,
  filter,
  shareReplay,
  tap,
  timeout,
} from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isCordova } from '../utils/platform';
import { NotificationService } from './notification.service';
import { GoogleAnalyticsService } from './google-analytics.service';
import { LoggingService } from './logging.service';
import {
  ONBOARDING_LOOKUP_TIMEOUT_MS,
  OnboardingService,
} from '../../onboarding/onboarding.service';
import { withTimeout } from '../utils/with-timeout';
import { PrinterThumbnailStore } from '../stores/printer-thumbnail-store.service';
import { SubscriptionService } from './subscription.service';
import { ProfileViewStatus, UserDetailDto, UserService } from './user.service';
import { UserSettingService } from './user-setting.service';
import { isDevAnonymous } from '../utils/dev-user';
const cordovaCallbackUri =
  'com.hoffmanengineering.printlog://cordova/com.hoffmanengineering.printlog/callback';

/** An account created this recently counts as a new sign-up on its first callback. */
const SIGNUP_WINDOW_MS = 10 * 60 * 1000;
/** Per-account flag that this browser already logged the sign-up. */
const SIGNUP_LOGGED_KEY_PREFIX = 'pl_signup_logged_';
/** How long background sign-up logging waits on the profile, then on the status lookup. */
const SIGNUP_LOG_TIMEOUT_MS = 10000;

export interface UserProfileInfo {
  id: number;
  /**
   * The URL of the user's profile picture
   */
  profilePicture: string;

  /**
   * The URL of the user's cover picture
   */
  coverPicture: string;

  displayName: string;

  bio: string;

  deactivationDateTime: Date | null;

  viewStatus: ProfileViewStatus;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router = inject(Router);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private ngZone = inject(NgZone);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Create an observable of Auth0 instance of client
  auth0Client$ =
    !this.isBrowser || environment.devAuthBypass
      ? EMPTY
      : (
          from(
            createAuth0Client({
              domain: environment.authentication.domain,
              clientId: environment.authentication.client_id,
              authorizationParams: {
                audience: environment.authentication.audience,
                redirect_uri: isCordova
                  ? cordovaCallbackUri
                  : `${window.location.origin}/callback`,
              },
              cacheLocation: 'localstorage',
              useRefreshTokens: true,
            })
          ) as Observable<Auth0Client>
        ).pipe(
          shareReplay(1), // Every subscription receives the same shared value
          catchError((err) => {
            return throwError(err);
          })
        );
  // Define observables for SDK methods that return promises by default
  // For each Auth0 SDK method, first ensure the client instance is ready
  // concatMap: Using the client instance, call SDK method; SDK returns a promise
  // from: Convert that resulting promise into an observable
  isAuthenticated$ = this.auth0Client$.pipe(
    concatMap((client: Auth0Client) => from(client.isAuthenticated())),
    tap((res) => (this.loggedIn = res))
  );
  handleRedirectCallback$ = this.auth0Client$.pipe(
    concatMap((client: Auth0Client) => from(client.handleRedirectCallback()))
  );

  // Create subject and public observable of user profile data
  private userProfileSubject$ = new BehaviorSubject<UserProfileInfo | null>(
    null
  );
  userProfile$ = this.userProfileSubject$.asObservable();
  /**
   * The same profile as a signal. The subject stays the source: several
   * subscribers rely on `userProfile$` emitting synchronously on subscribe,
   * which `toObservable` over a signal would not.
   */
  readonly userProfile = toSignal(this.userProfileSubject$, {
    requireSync: true,
  });
  /** Login status: `null` until setup has run, then true or false. */
  private readonly loggedInState = signal<boolean | null>(null);
  readonly isLoggedIn = this.loggedInState.asReadonly();

  get loggedIn(): boolean | null {
    return this.loggedInState();
  }
  set loggedIn(value: boolean | null) {
    this.loggedInState.set(value);
  }

  private readonly subscriptionService = inject(SubscriptionService);
  private readonly userSettingService = inject(UserSettingService);
  /**
   * Resolved lazily on logout rather than injected: PrinterThumbnailStore injects this
   * service, so a direct dependency here would be a cycle.
   */
  private readonly injector = inject(Injector);
  /** Set once the first-login display-name PUT has been sent; never reset (one per page load). */
  private newUserPutStarted = false;

  constructor() {
    if (isCordova) {
      (window as any).handleOpenURL = (url: string) => {
        // Called by cordova-plugin-customurlscheme when the app receives a callback URL
        if (url && url.indexOf('/callback?') !== -1) {
          const qs = url.substring(url.indexOf('?'));
          this.ngZone.run(() => {
            this.router.navigateByUrl('/callback' + qs);
          });
        }
      };
    }
  }

  /** Resolved lazily: LoggingService must not become a constructor dependency of this root service. */
  private setTelemetryUser(id: number | undefined): void {
    if (id != null) {
      this.injector.get(LoggingService).setAuthenticatedUser(id);
    }
  }

  // When calling, options can be passed if desired
  // https://auth0.github.io/auth0-spa-js/classes/auth0client.html#getuser
  getUser$(): Observable<any> {
    return this.auth0Client$.pipe(
      concatMap((client: Auth0Client) => from(client.getUser())),
      tap((user) => {
        this.subscriptionService.loadSubscription();
        this.userService.getCurrentUserDetail().subscribe((currentUser) => {
          if (currentUser.displayName === null) {
            // localAuthSetup and handleAuthCallback can both run getUser$ on one page load;
            // the first-login PUT goes out once, and its response emits the profile.
            if (this.newUserPutStarted) {
              return;
            }
            this.newUserPutStarted = true;
            const userInfo: UserDetailDto = {
              ...currentUser,
              // Some identity providers send no nickname: leave the name unset, don't throw.
              displayName: (user?.nickname ?? '').slice(0, 29) || null,
              profilePicture: user?.picture,
            };

            this.userService.updateCurrentUserDetail(userInfo).subscribe({
              next: (updatedUser) => {
                // TODO: Save this updated user back to the userProfile$ object.
                this.userProfileSubject$.next(updatedUser);
                this.setTelemetryUser(updatedUser.id);
              },
              // A rejected PUT used to surface as an unhandled error; record it instead.
              error: (error) => this.logException(error),
            });
          } else {
            this.userProfileSubject$.next(currentUser);
            this.setTelemetryUser(currentUser.id);
          }
        });
      })
    );

    // this.userProfileSubject$.next(user))
  }

  updateCurrentUserCoverPicture(newUrl: string) {
    const profile = this.userProfileSubject$.value;
    if (!profile) {
      return;
    }

    this.userProfileSubject$.next({ ...profile, coverPicture: newUrl });
  }

  updateCurrentUserDeactivationDate(deactivationDate: Date | null) {
    const profile = this.userProfileSubject$.value;
    if (!profile) {
      return;
    }

    this.userProfileSubject$.next({
      ...profile,
      deactivationDateTime: deactivationDate,
    });
  }

  updateCurrentUserProfilePicture(newUrl: string) {
    const profile = this.userProfileSubject$.value;
    if (!profile) {
      return;
    }

    this.userProfileSubject$.next({
      ...profile,
      profilePicture: newUrl,
    });
  }

  getTokenSilently$(options?): Observable<string> {
    return this.auth0Client$.pipe(
      concatMap((client: Auth0Client) =>
        from(client.getTokenSilently({ ...options, detailedResponse: false }))
      ),
      catchError((err) => {
        if (err.error === 'missing_refresh_token') {
          if (this.loggedIn) {
            // logout is async now (push teardown runs first); nothing here can await it.
            void this.logout();
          }
        }

        return throwError(err);
      })
    ) as unknown as Observable<string>; // TODO: Figure out why getTokenSilently isn't giving the right type
  }

  private readonly devMockProfile: UserProfileInfo = {
    id: 1,
    profilePicture:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23666"/><text x="20" y="26" text-anchor="middle" font-size="16" fill="white">D</text></svg>',
    coverPicture: '',
    displayName: 'Dev User',
    bio: '',
    deactivationDateTime: null,
    viewStatus: ProfileViewStatus.Public,
  };

  localAuthSetup() {
    // This should only be called on app initialization
    // Set up local authentication streams

    // Auth0 depends on browser globals; skip entirely during prerender.
    if (!this.isBrowser) {
      return;
    }

    if (environment.devAuthBypass) {
      if (isDevAnonymous(window.location.search)) {
        // Dev-only: render the logged-out state for E2E / manual testing.
        this.loggedIn = false;
        return;
      }
      this.loggedIn = true;
      this.userProfileSubject$.next(this.devMockProfile);
      this.setTelemetryUser(this.devMockProfile.id);
      return;
    }

    const checkAuth$ = this.isAuthenticated$.pipe(
      concatMap((loggedIn: boolean) => {
        if (loggedIn) {
          // If authenticated, get user and set in app
          // NOTE: you could pass options here if needed
          return this.getUser$();
        }
        // If not authenticated, return stream that emits 'false'
        return of(loggedIn);
      })
    );
    checkAuth$.subscribe((response: { [key: string]: any } | boolean) => {
      // If authenticated, response will be user object
      // If not authenticated, response will be 'false'
      this.loggedIn = !!response;
    });
  }

  login(
    redirectPath: string = '/',
    options?: { signup?: boolean; source?: string }
  ) {
    if (environment.devAuthBypass) {
      return;
    }
    // A desired redirect path can be passed to login method
    // (e.g., from a route guard)
    // Ensure Auth0 client instance exists
    this.auth0Client$.subscribe((client: Auth0Client) => {
      // Call method to log in
      client.loginWithRedirect({
        appState: {
          target: redirectPath,
          ...(options?.source && { source: options.source }),
        },
        authorizationParams: {
          redirect_uri: isCordova
            ? cordovaCallbackUri
            : `${window.location.origin}/callback`,
          // Auth0's New Universal Login opens the signup screen on this hint;
          // Classic ignores it. Verify against the tenant before trusting the
          // CTA copy.
          ...(options?.signup && { screen_hint: 'signup' }),
          ...(isCordova && { prompt: 'select_account' }),
        },
      });
    });
  }

  handleAuthCallback() {
    // Only the callback component should call this method
    // Call when app reloads after user logs in with Auth0
    let targetRoute: string; // Path to redirect to after login processed
    let source: string | undefined; // Where a sign-up started, from login()
    const authComplete$ = this.handleRedirectCallback$.pipe(
      // Have client, now call method to handle auth callback redirect
      tap((cbRes) => {
        // Get and set target redirect route from callback results
        targetRoute = cbRes.appState?.target ?? '/';
        source = cbRes.appState?.source;
      }),
      concatMap(() => {
        // Redirect callback complete; get user and login status
        return combineLatest([this.getUser$(), this.isAuthenticated$]);
      })
    );
    // Subscribe to authentication completion observable
    // Response will be an array of user and login status
    authComplete$.subscribe(() => {
      void this.navigateAfterCallback(targetRoute, source);
    });
  }

  /**
   * Logs a new sign-up (in the background) and sends a new user to /welcome instead of the
   * target. Onboarding never blocks the app: a failed welcome lookup falls back to the
   * target, and so does one still pending after ONBOARDING_LOOKUP_TIMEOUT_MS. Navigation never
   * waits on the sign-up logging, which needs the profile (and, for a new user, its PUT).
   */
  private async navigateAfterCallback(
    target: string,
    source: string | undefined
  ): Promise<void> {
    void this.logSignupIfNewOnceProfileLoads(source, target);

    const showWelcome = await withTimeout(
      this.injector.get(OnboardingService).shouldShowWelcome(target),
      false,
      ONBOARDING_LOOKUP_TIMEOUT_MS
    ).catch(() => false);

    if (showWelcome) {
      this.router.navigateByUrl('/welcome', { state: { entry: 'callback' } });
    } else {
      this.router.navigateByUrl(target);
    }
  }

  /**
   * The profile id comes from the first profile getUser$ emits after the callback. Never
   * rejects, and gives up after SIGNUP_LOG_TIMEOUT_MS at each step so nothing waits forever.
   */
  private async logSignupIfNewOnceProfileLoads(
    source: string | undefined,
    target: string
  ): Promise<void> {
    try {
      const profile = await firstValueFrom(
        this.userProfile$.pipe(
          filter((p) => p !== null),
          timeout(SIGNUP_LOG_TIMEOUT_MS)
        )
      );
      await withTimeout(
        this.logSignupIfNew(profile.id, source, target),
        undefined,
        SIGNUP_LOG_TIMEOUT_MS
      );
    } catch (error) {
      // Best-effort: a missed sign-up event must not change where the user lands.
      this.logException(error);
    }
  }

  /**
   * Logs Auth_SignedUp (and GA4 sign_up) once per account, for an account created in the
   * last ten minutes. The localStorage key keeps a second callback on this browser from
   * counting the same sign-up again.
   */
  private async logSignupIfNew(
    profileId: number,
    source: string | undefined,
    target: string
  ): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    const status = await this.injector.get(OnboardingService).status();
    const created = status.createdDate ? Date.parse(status.createdDate) : NaN;
    if (Number.isNaN(created) || Date.now() - created > SIGNUP_WINDOW_MS) {
      return;
    }

    const key = `${SIGNUP_LOGGED_KEY_PREFIX}${profileId}`;
    try {
      if (localStorage.getItem(key) !== null) {
        return;
      }
    } catch {
      // Storage unavailable: log anyway; a rare double count beats a missed sign-up.
    }

    const signupSource =
      source ?? (target.startsWith('/prints/new/cura') ? 'slicer' : 'direct');
    this.injector
      .get(LoggingService)
      .logEvent('Auth_SignedUp', { source: signupSource });
    this.injector
      .get(GoogleAnalyticsService)
      .eventEmitter('sign_up', 'engagement', 'sign_up', signupSource);

    try {
      localStorage.setItem(key, new Date().toISOString());
    } catch {
      // Storage unavailable; nothing else to do.
    }
  }

  /** Resolved lazily, like setTelemetryUser. */
  private logException(error: unknown): void {
    this.injector
      .get(LoggingService)
      .logException(error instanceof Error ? error : new Error(String(error)));
  }

  /**
   * Registered by PushRegistrationService. Awaited before Auth0 logout so the device's push
   * registration is deleted while the bearer is still valid — once Auth0 tears the session
   * down there is no credential left to authorize the DELETE with, and the phone would keep
   * receiving the previous user's notifications.
   */
  public pushTeardown: ((bearerToken: string) => Promise<void>) | null = null;

  async logout() {
    if (environment.devAuthBypass) {
      return;
    }
    // Stop notification polling
    this.notificationService.stopPolling();
    this.userSettingService.clearCache();
    // The signed thumbnail map is per user. Clearing it here rather than waiting for the
    // store's own next read means the previous user's printer photos cannot survive on
    // screen in a session that outlives the Auth0 redirect.
    this.injector.get(PrinterThumbnailStore).invalidate();
    this.injector.get(LoggingService).clearAuthenticatedUser();
    this.injector.get(OnboardingService).clear();

    await this.runPushTeardown();

    // Ensure Auth0 client instance exists
    this.auth0Client$.subscribe((client: Auth0Client) => {
      // Call method to log out
      client.logout({
        clientId: environment.authentication.client_id,
        logoutParams: { returnTo: `${window.location.origin}` },
      });
    });
  }

  /**
   * Best-effort: a device that cannot be unregistered is a stale row the API prunes on the
   * next UNREGISTERED response from FCM. Failing to log the user out over it would be far
   * worse, so every failure here — including not being able to mint a token — is swallowed.
   */
  private async runPushTeardown(): Promise<void> {
    if (!this.pushTeardown) {
      return;
    }

    try {
      const token = await firstValueFrom(this.getTokenSilently$());
      await this.pushTeardown(token);
    } catch {
      // Intentionally ignored — see above.
    }
  }
}
