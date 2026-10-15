import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { map } from 'rxjs/operators';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';
import { LocaleDatePipe } from '../pipes/locale-date.pipe';

@Component({
  selector: 'app-account-deactivation-banner',
  templateUrl: './account-deactivation-banner.component.html',
  styleUrls: ['./account-deactivation-banner.component.scss'],
  imports: [FlexLayoutModule, MatButtonModule, LocaleDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDeactivationBannerComponent {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);

  readonly deactivationDate = toSignal(
    this.auth.userProfile$.pipe(
      map((user) => user?.deactivationDateTime ?? null)
    ),
    { initialValue: null }
  );

  public reactivateAccount() {
    this.userService.reactivateCurrentUser().subscribe((updatedUser) => {
      this.auth.updateCurrentUserDeactivationDate(
        updatedUser.deactivationDateTime
      );
    });
  }
}
