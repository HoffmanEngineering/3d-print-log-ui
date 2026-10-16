import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from 'src/app/core/services/auth.service';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { VersionReleaseNoteDialogService } from 'src/app/core/services/version-release-note-dialog.service';
import { environment } from 'src/environments/environment';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  imports: [
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatTooltipModule,
    NotificationBellComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  auth = inject(AuthService);

  public versionNumber = environment.version;

  private readonly user = toSignal(this.auth.userProfile$, {
    initialValue: null,
  });
  readonly profilePictureUrl = computed(
    () => this.user()?.profilePicture || null
  );
  readonly userId = computed(() => this.user()?.id ?? null);

  public isUserProfileFeatureEnabled = environment.features.userProfile;

  private readonly subscriptionService = inject(SubscriptionService);
  readonly isPro = this.subscriptionService.isPro;

  private readonly releaseNotes = inject(VersionReleaseNoteDialogService);

  /**
   * Signed-in users only: the dialog that pairs with this indicator runs on
   * sign in, and a visitor who has never signed in has nothing stored anyway.
   */
  readonly hasUnreadReleases = computed(
    () => !!this.auth.isLoggedIn() && this.releaseNotes.hasUnreadReleases()
  );

  /** Opens the release notes at the first release the user has not read. */
  readonly releaseNotesFragment = computed(() =>
    this.hasUnreadReleases()
      ? (this.releaseNotes.firstUnreadAnchor() ?? undefined)
      : undefined
  );
}
