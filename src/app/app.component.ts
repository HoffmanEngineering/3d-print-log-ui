import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { LoggingService } from './core/services/logging.service';
import { VersionReleaseNoteDialogService } from './core/services/version-release-note-dialog.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  title = 'print-log-ui';

  /**
   * Be careful when removing "unused" dependencies from here.
   * Often the AppComponent is used to force services to load on startup.
   */
  constructor(
    private auth: AuthService,
    private googleAnalytics: GoogleAnalyticsService,
    private loggingService: LoggingService,
    private releaseNotesService: VersionReleaseNoteDialogService
  ) {}

  ngOnInit() {
    this.auth.localAuthSetup();

    this.auth.userProfile$.subscribe((user) => {
      if (user) {
        this.releaseNotesService.checkLastLoggedInVersion();
      }
    });
  }
}
