import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from 'src/app/core/services/auth.service';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
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
})
export class NavbarComponent implements OnInit, OnDestroy {
  public versionNumber = environment.version;
  public profilePictureUrl: string | null = null;
  public userId: number | null = null;

  private userProfileSubscription: Subscription;

  public isUserProfileFeatureEnabled = environment.features.userProfile;

  private readonly subscriptionService = inject(SubscriptionService);
  readonly isPro = this.subscriptionService.isPro;

  constructor(public auth: AuthService) {}

  ngOnInit() {
    this.userProfileSubscription = this.auth.userProfile$.subscribe((user) => {
      if (user && user.profilePicture) {
        this.profilePictureUrl = user.profilePicture;
        this.userId = user.id;
      } else {
        this.profilePictureUrl = null;
        this.userId = null;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userProfileSubscription) {
      this.userProfileSubscription.unsubscribe();
    }
  }
}
