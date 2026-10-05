import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { LoggingService } from '../../core/services/logging.service';
import {
  UserSettingService,
  UserSettingType,
} from '../../core/services/user-setting.service';

type DismissAction = 'got-it' | 'settings';

/**
 * Tells a signed-in user, once, that we send engagement email and where the switch is. Until
 * they dismiss it the API sends them none (`Email:Notice:Required`), so the banner is the
 * gate, not decoration.
 */
@Component({
  selector: 'app-email-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule],
  templateUrl: './email-notice.component.html',
  styleUrl: './email-notice.component.scss',
})
export class EmailNoticeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly settings = inject(UserSettingService);
  private readonly logging = inject(LoggingService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly visible = signal(false);

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.auth.userProfile$
      .pipe(
        map((user) => !!user),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((signedIn) => {
        if (signedIn) {
          void this.checkSeen();
        } else {
          this.visible.set(false);
        }
      });
  }

  async dismiss(action: DismissAction): Promise<void> {
    this.visible.set(false);
    this.logging.logEvent('EmailNotice_Dismissed', { action });
    if (action === 'settings') {
      void this.router.navigate(['/settings'], { fragment: 'email' });
    }
    try {
      await this.settings.addOrUpdateSetting(
        UserSettingType.Email_NoticeSeenAt,
        new Date().toISOString()
      );
    } catch (e) {
      this.logging.logException(e as Error);
    }
  }

  private async checkSeen(): Promise<void> {
    try {
      const seen = await this.settings.getCurrentUsersSettingByType(
        UserSettingType.Email_NoticeSeenAt
      );
      this.visible.set(!seen?.value);
    } catch (e) {
      // Unknown is not "unseen": better to miss one visit than to nag over a failed request.
      this.logging.logException(e as Error);
      this.visible.set(false);
    }
  }
}
