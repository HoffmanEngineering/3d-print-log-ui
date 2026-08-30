import { inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
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
import { catchError, concatMap, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isCordova } from '../utils/platform';
import { NotificationService } from './notification.service';
import { SubscriptionService } from './subscription.service';
import { ProfileViewStatus, UserDetailDto, UserService } from './user.service';
import { UserSettingService } from './user-setting.service';
import { isDevAnonymous } from '../utils/dev-user';
const cordovaCallbackUri =
  'com.hoffmanengineering.printlog://cordova/com.hoffmanengineering.printlog/callback';

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
  // Create a local property for login status
  loggedIn: boolean | null = null;

  private readonly subscriptionService = inject(SubscriptionService);
  private readonly userSettingService = inject(UserSettingService);

  constructor(
    private router: Router,
    private userService: UserService,
    private notificationService: NotificationService,
    private ngZone: NgZone
  ) {
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

  // When calling, options can be passed if desired
  // https://auth0.github.io/auth0-spa-js/classes/auth0client.html#getuser
  getUser$(): Observable<any> {
    return this.auth0Client$.pipe(
      concatMap((client: Auth0Client) => from(client.getUser())),
      tap((user) => {
        this.subscriptionService.loadSubscription();
        this.userService.getCurrentUserDetail().subscribe((currentUser) => {
          if (currentUser.displayName === null) {
            const userInfo: UserDetailDto = {
              ...currentUser,
              displayName:
                user.nickname.length > 30
                  ? user.nickname.substring(0, 29)
                  : user.nickname,
              profilePicture: user.picture,
            };

            this.userService
              .updateCurrentUserDetail(userInfo)
              .subscribe((updatedUser) => {
                // TODO: Save this updated user back to the userProfile$ object.
                this.userProfileSubject$.next(updatedUser);
              });
          } else {
            this.userProfileSubject$.next(currentUser);
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

  login(redirectPath: string = '/') {
    if (environment.devAuthBypass) {
      return;
    }
    // A desired redirect path can be passed to login method
    // (e.g., from a route guard)
    // Ensure Auth0 client instance exists
    this.auth0Client$.subscribe((client: Auth0Client) => {
      // Call method to log in
      client.loginWithRedirect({
        appState: { target: redirectPath },
        authorizationParams: {
          redirect_uri: isCordova
            ? cordovaCallbackUri
            : `${window.location.origin}/callback`,
          ...(isCordova && { prompt: 'select_account' }),
        },
      });
    });
  }

  handleAuthCallback() {
    // Only the callback component should call this method
    // Call when app reloads after user logs in with Auth0
    let targetRoute: string; // Path to redirect to after login processsed
    const authComplete$ = this.handleRedirectCallback$.pipe(
      // Have client, now call method to handle auth callback redirect
      tap((cbRes) => {
        // Get and set target redirect route from callback results
        targetRoute =
          cbRes.appState && cbRes.appState.target ? cbRes.appState.target : '/';
      }),
      concatMap(() => {
        // Redirect callback complete; get user and login status
        return combineLatest([this.getUser$(), this.isAuthenticated$]);
      })
    );
    // Subscribe to authentication completion observable
    // Response will be an array of user and login status
    authComplete$.subscribe(([user, loggedIn]) => {
      // Redirect to target route after callback processing
      this.router.navigateByUrl(targetRoute);
    });
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
