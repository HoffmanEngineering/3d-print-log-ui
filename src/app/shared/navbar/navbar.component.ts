import { MediaMatcher } from '@angular/cdk/layout';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  public versionNumber = environment.version;
  public profilePictureUrl: string | null = null;
  public userId: number | null = null;

  private userProfileSubscription: Subscription;

  public isUserProfileFeatureEnabled = environment.features.userProfile;

  mobileQuery: MediaQueryList;
  private mobileQueryListener: () => void;

  constructor(
    public auth: AuthService,
    private media: MediaMatcher,
    private changeDetectorRef: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

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

    this.setupMobileListener();
  }
  setupMobileListener() {
    this.mobileQuery = this.media.matchMedia('(max-width: 450px)');

    this.mobileQueryListener = () => {
      this.ngZone.run(() => {
        this.changeDetectorRef.detectChanges();
      });
    };
    // tslint:disable-next-line: deprecation
    this.mobileQuery.addListener(this.mobileQueryListener);
  }

  ngOnDestroy(): void {
    // tslint:disable-next-line: deprecation
    this.mobileQuery.removeListener(this.mobileQueryListener);

    if (this.userProfileSubscription) {
      this.userProfileSubscription.unsubscribe();
    }
  }
}
