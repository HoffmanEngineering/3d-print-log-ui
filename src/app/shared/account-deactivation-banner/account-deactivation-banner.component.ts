import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';
import { SimpleDialogComponent } from '../simple-dialog/simple-dialog.component';

@Component({
  selector: 'app-account-deactivation-banner',
  templateUrl: './account-deactivation-banner.component.html',
  styleUrls: ['./account-deactivation-banner.component.scss'],
  standalone: false,
})
export class AccountDeactivationBannerComponent implements OnInit, OnDestroy {
  userProfileSubscription: Subscription;
  deactivationDate: Date | null = null;

  constructor(
    public auth: AuthService,
    public dialog: MatDialog,
    private readonly userService: UserService
  ) {}

  ngOnInit(): void {
    this.userProfileSubscription = this.auth.userProfile$.subscribe((user) => {
      if (user) {
        this.deactivationDate = user.deactivationDateTime;
      } else {
        this.deactivationDate = null;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userProfileSubscription) {
      this.userProfileSubscription.unsubscribe();
    }
  }

  public reactivateAccount() {
    this.userService.reactivateCurrentUser().subscribe((updatedUser) => {
      this.auth.updateCurrentUserDeactivationDate(
        updatedUser.deactivationDateTime
      );
    });
  }
}
