import { Component, DestroyRef, OnInit, DOCUMENT, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  AuthService,
  UserProfileInfo,
} from 'src/app/core/services/auth.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { MetaTagService } from 'src/app/core/services/meta-tag.service';
import {
  ProfileViewStatus,
  UserDetailDto,
  UserService,
} from 'src/app/core/services/user.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  standalone: false,
})
export class UserProfileComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly toastrService = inject(ToastrService);
  private readonly metaTagService = inject(MetaTagService);
  private readonly loggingService = inject(LoggingService);
  private readonly document = inject<Document>(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  public userDetail: UserDetailDto;

  public currentUser: UserProfileInfo;

  public profileViewStatusTypes = ProfileViewStatus;

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

  ngOnInit(): void {
    this.activatedRoute.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.userDetail = data.userDetail;
        this.viewStatus = this.userDetail.viewStatus;

        this.setMetaTags();
      });

    this.authService.userProfile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.currentUser = user;
      });
  }

  setMetaTags() {
    this.metaTagService.setTitle(
      `${this.userDetail.displayName} Profile - 3D Print Log`.trim()
    );

    const url = `${this.document.location.origin}/users/${this.userDetail.id}`;
    const title =
      `${this.userDetail.displayName} Profile - 3D Print Log`.trim();
    const description =
      `View ${this.userDetail.displayName}'s 3D prints and projects on 3DPrintLog.com`.trim();
    const imageUrl =
      this.userDetail.profilePicture !== ''
        ? this.userDetail.profilePicture
        : '';

    this.metaTagService.setSocialMediaTags(url, title, description, imageUrl);
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

      this.loggingService.logEvent('CoverPhotoRemoved');

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
    this.loggingService.logEvent('UserProfileDescriptionEditStart');
  }

  public cancelEditingDescription() {
    this.bio = this.userDetail.bio ?? '';
    this.isEditingDescription = false;
    this.loggingService.logEvent('UserProfileDescriptionEditCancelled');
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
    this.loggingService.logEvent('DisplayNameEditingStart');
  }

  public cancelEditingDisplayName() {
    this.displayName = this.userDetail.displayName ?? '';
    this.isEditingDisplayName = false;
    this.loggingService.logEvent('DisplayNameEditingCancelled');
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
