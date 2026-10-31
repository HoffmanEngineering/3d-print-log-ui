import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';
import { LocaleDatePipe } from '../pipes/locale-date.pipe';

@Component({
  selector: 'app-account-deactivation-banner',
  templateUrl: './account-deactivation-banner.component.html',
  styleUrls: ['./account-deactivation-banner.component.scss'],
  imports: [MatButtonModule, LocaleDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDeactivationBannerComponent {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);

  readonly deactivationDate = computed(
    () => this.auth.userProfile()?.deactivationDateTime ?? null
  );

  public reactivateAccount() {
    this.userService.reactivateCurrentUser().subscribe((updatedUser) => {
      this.auth.updateCurrentUserDeactivationDate(
        updatedUser.deactivationDateTime
      );
    });
  }
}
