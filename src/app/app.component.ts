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
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit() {
    this.themeService.initialize();
    this.auth.localAuthSetup();

    this.auth.userProfile$.subscribe((user) => {
      if (user) {
        this.releaseNotesService.checkLastLoggedInVersion();
      }
    });

    this.deferAdsenseLoad();
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
