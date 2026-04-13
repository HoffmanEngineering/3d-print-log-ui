import { Component, computed, OnInit } from '@angular/core';
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
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    this.themeService.initialize();
    this.auth.localAuthSetup();

    this.auth.userProfile$.subscribe((user) => {
      if (user) {
        this.releaseNotesService.checkLastLoggedInVersion();
      }
    });
  }
}
