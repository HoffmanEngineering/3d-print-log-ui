import {
  Component,
  computed,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AdsenseLoaderService } from './core/services/adsense-loader.service';
import { AuthService } from './core/services/auth.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { LoggingService } from './core/services/logging.service';
import { NativeBridgeService } from './core/services/native-bridge.service';
import { PushRegistrationService } from './core/services/push-registration.service';
import { ThemeService } from './core/services/theme.service';
import { VersionReleaseNoteDialogService } from './core/services/version-release-note-dialog.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  title = 'print-log-ui';

  /** Whether native accepted our pending-tap listener, so we stop retrying. */
  private tapListenerInstalled = false;

  readonly loadingBarColor = computed(() =>
    this.themeService.isDark() ? '#283593' : '#3f51b5'
  );

  /**
   * Be careful when removing "unused" dependencies from here.
   * Often the AppComponent is used to force services to load on startup.
   */
  constructor(
    private auth: AuthService,
    private googleAnalytics: GoogleAnalyticsService,
    private loggingService: LoggingService,
    private releaseNotesService: VersionReleaseNoteDialogService,
    private themeService: ThemeService,
    private adsenseLoader: AdsenseLoaderService,
    private pushRegistration: PushRegistrationService,
    private nativeBridge: NativeBridgeService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit() {
    this.themeService.initialize();
    this.auth.localAuthSetup();

    this.auth.userProfile$.subscribe((user) => {
      if (user) {
        this.releaseNotesService.checkLastLoggedInVersion();
        this.registerForPush();
        this.watchForWarmStartTaps();
      }
    });

    // Ordered teardown: the native side needs a still-valid bearer to delete its
    // registration, so AuthService awaits this before starting Auth0 logout.
    this.auth.pushTeardown = (token) => this.pushRegistration.onLogout(token);

    this.watchForWarmStartTaps();

    this.deferAdsenseLoad();
  }

  /**
   * Driven by an authenticated profile rather than by bridge availability alone: at cold
   * start the bridge is ready long before Auth0 has rehydrated, and a registration POST
   * without a bearer 401s with nothing to retry it.
   */
  private registerForPush() {
    this.auth.getTokenSilently$().subscribe({
      next: (token) => void this.pushRegistration.onAuthenticated(token),
      // No token means no registration this launch; the next authenticated emission
      // retries. Never surface this to the user — push is optional.
      error: () => undefined,
    });
  }

  /**
   * A tap while the app is already running resumes it rather than starting it, so the
   * pending tap has to be drained then as well as at registration time.
   *
   * Native signals us; we do not listen for Cordova's `resume`. The WebView navigates to
   * this origin and cordova.js is gone from that point, so a `resume` listener here would
   * never fire — it silently swallowed every warm-start tap.
   */
  private watchForWarmStartTaps() {
    if (!isPlatformBrowser(this.platformId) || this.tapListenerInstalled)
      return;

    // Retried rather than attempted once: the app shell injects window.PrintLogNative on
    // page load, which can land after Angular has bootstrapped. A single attempt in ngOnInit
    // would then install nothing at all, and every later tap would be signalled into an
    // empty listener list — silently, which is the failure mode this replaced.
    this.tapListenerInstalled = this.nativeBridge.onPendingTap(() => {
      void this.pushRegistration.handlePendingTap();
    });
  }

  /**
   * Load AdSense on the first real user interaction. Lighthouse never
   * interacts, so the ad script (and its unload handler) stays out of the
   * audited load, keeping the home page bf-cache eligible and cutting TBT.
   * Trade-off: visitors who bounce without any interaction see no ads.
   */
  private deferAdsenseLoad() {
    if (!isPlatformBrowser(this.platformId)) return;

    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    const trigger = () => {
      this.adsenseLoader.load();
      events.forEach((e) =>
        window.removeEventListener(e, trigger, { capture: true } as never)
      );
    };
    events.forEach((e) =>
      window.addEventListener(e, trigger, {
        once: true,
        passive: true,
        capture: true,
      })
    );
  }
}
