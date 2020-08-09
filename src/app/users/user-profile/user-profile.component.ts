import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import {
  AuthService,
  UserProfileInfo,
} from 'src/app/core/services/auth.service';
import {
  ProfileViewStatus,
  UserDetailDto,
  UserService,
} from 'src/app/core/services/user.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {
  public userDetail: UserDetailDto;

  public currentUser: UserProfileInfo;

  public profileViewStatusTypes = ProfileViewStatus;

  authServiceSubscription: Subscription;
  activatedRouteSubscription: Subscription;

  public isEditingDescription = false;

  /**
   * The ngModel used for updating the Bio.
   */
  public bio = '';

  /**
   * The ngModel used for updating the Profile View Status.
   */
  public viewStatus: ProfileViewStatus = null;

  /**
   * The ngModel used for updating the user's Display name
   */
  public displayName = '';
  public isEditingDisplayName = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private userService: UserService,
    private toastrService: ToastrService,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.activatedRouteSubscription = this.activatedRoute.data.subscribe(
      (data) => {
        if (this.authServiceSubscription) {
          this.authServiceSubscription.unsubscribe();
        }

        this.userDetail = data.userDetail;
        this.viewStatus = this.userDetail.viewStatus;

        this.titleService.setTitle(
          `${this.userDetail.displayName} Profile - 3D Print Log`.trim()
        );

        this.authServiceSubscription = this.authService.userProfile$.subscribe(
          (user) => {
            this.currentUser = user;
          }
        );
      }
    );
  }

  addCoverPhoto(event) {
    const files = event.target.files;
    if (files) {
      for (const file of files) {
        if (!file.type.match(/image.*/)) {
          this.toastrService.error(
            'Please select an image.',
            'Selected file is not an Image'
          );
          continue;
        }

        this.userService
          .updateCurrentUserCoverPicture(file)
          .subscribe((newPictureUrl) => {
            this.userDetail = {
              ...this.userDetail,
              coverPicture: newPictureUrl,
            };

            this.authService.updateCurrentUserCoverPicture(newPictureUrl);
          });
      }
    }
  }

  addProfilePicture(event) {
    const files = event.target.files;
    if (files) {
      for (const file of files) {
        if (!file.type.match(/image.*/)) {
          this.toastrService.error(
            'Please select an image.',
            'Selected file is not an Image'
          );
          continue;
        }

        this.userService
          .updateCurrentUserProfilePicture(file)
          .subscribe((newPictureUrl) => {
            this.userDetail = {
              ...this.userDetail,
              profilePicture: newPictureUrl,
            };

            this.authService.updateCurrentUserProfilePicture(newPictureUrl);
          });
      }
    }
  }

  public removeCoverPhoto() {
    this.userService.removeCurrentUserCoverPicture().subscribe(() => {
      this.userDetail = {
        ...this.userDetail,
        coverPicture: null,
      };

      this.authService.updateCurrentUserCoverPicture(null);
    });
  }

  public saveProfileVisibility(newViewStatus: ProfileViewStatus) {
    const newUserDetail: UserDetailDto = {
      ...this.userDetail,
      viewStatus: newViewStatus,
    };
    this.userService
      .updateCurrentUserDetail(newUserDetail)
      .subscribe((user) => {
        this.userDetail = user;
        this.viewStatus = this.userDetail.viewStatus;
      });
  }

  public startEditingDescription() {
    this.bio = this.userDetail.bio ?? '';
    this.isEditingDescription = true;
  }

  public cancelEditingDescription() {
    this.bio = this.userDetail.bio ?? '';
    this.isEditingDescription = false;
  }

  public saveDescription() {
    const newUserDetail: UserDetailDto = {
      ...this.userDetail,
      bio: this.bio.trim(),
    };
    this.userService
      .updateCurrentUserDetail(newUserDetail)
      .subscribe((user) => {
        this.userDetail = user;

        this.bio = '';
        this.isEditingDescription = false;
      });
  }

  public startEditingDisplayName() {
    this.displayName = this.userDetail.displayName ?? '';
    this.isEditingDisplayName = true;
  }

  public cancelEditingDisplayName() {
    this.displayName = this.userDetail.displayName ?? '';
    this.isEditingDisplayName = false;
  }

  public saveDisplayName() {
    const newUserDetail: UserDetailDto = {
      ...this.userDetail,
      displayName: this.displayName.trim(),
    };
    this.userService
      .updateCurrentUserDetail(newUserDetail)
      .subscribe((user) => {
        this.userDetail = user;

        this.displayName = '';
        this.isEditingDisplayName = false;
      });
  }
}
