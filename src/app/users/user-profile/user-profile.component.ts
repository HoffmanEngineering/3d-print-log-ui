import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  DOCUMENT,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/core/services/auth.service';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  readonly userDetail = signal<UserDetailDto>(null);

  readonly currentUser = toSignal(this.authService.userProfile$, {
    initialValue: null,
  });

  public profileViewStatusTypes = ProfileViewStatus;

  readonly isEditingDescription = signal(false);

  /**
   * The ngModel used for updating the Bio.
   */
  readonly bio = signal('');

  /**
   * The ngModel used for updating the Profile View Status.
   */
  readonly viewStatus = signal<ProfileViewStatus>(null);

  /**
   * The ngModel used for updating the user's Display name
   */
  readonly displayName = signal('');
  readonly isEditingDisplayName = signal(false);

  ngOnInit(): void {
    this.activatedRoute.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.userDetail.set(data.userDetail);
        this.viewStatus.set(data.userDetail.viewStatus);

        this.setMetaTags();
      });
  }

  setMetaTags() {
    const userDetail = this.userDetail();
    this.metaTagService.setTitle(
      `${userDetail.displayName} Profile - 3D Print Log`.trim()
    );

    const url = `${this.document.location.origin}/users/${userDetail.id}`;
    const title = `${userDetail.displayName} Profile - 3D Print Log`.trim();
    const description =
      `View ${userDetail.displayName}'s 3D prints and projects on 3DPrintLog.com`.trim();
    const imageUrl =
      userDetail.profilePicture !== '' ? userDetail.profilePicture : '';

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
            this.userDetail.update((detail) => ({
              ...detail,
              coverPicture: newPictureUrl,
            }));

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
            this.userDetail.update((detail) => ({
              ...detail,
              profilePicture: newPictureUrl,
            }));

            this.authService.updateCurrentUserProfilePicture(newPictureUrl);
          });
      }
    }
  }

  public removeCoverPhoto() {
    this.userService.removeCurrentUserCoverPicture().subscribe(() => {
      this.userDetail.update((detail) => ({
        ...detail,
        coverPicture: null,
      }));

      this.loggingService.logEvent('CoverPhotoRemoved');

      this.authService.updateCurrentUserCoverPicture(null);
    });
  }

  public saveProfileVisibility(newViewStatus: ProfileViewStatus) {
    const newUserDetail: UserDetailDto = {
      ...this.userDetail(),
      viewStatus: newViewStatus,
    };
    this.userService
      .updateCurrentUserDetail(newUserDetail)
      .subscribe((user) => {
        this.userDetail.set(user);
        this.viewStatus.set(user.viewStatus);
      });
  }

  public startEditingDescription() {
    this.bio.set(this.userDetail().bio ?? '');
    this.isEditingDescription.set(true);
    this.loggingService.logEvent('UserProfileDescriptionEditStart');
  }

  public cancelEditingDescription() {
    this.bio.set(this.userDetail().bio ?? '');
    this.isEditingDescription.set(false);
    this.loggingService.logEvent('UserProfileDescriptionEditCancelled');
  }

  public saveDescription() {
    const newUserDetail: UserDetailDto = {
      ...this.userDetail(),
      bio: this.bio().trim(),
    };
    this.userService
      .updateCurrentUserDetail(newUserDetail)
      .subscribe((user) => {
        this.userDetail.set(user);

        this.bio.set('');
        this.isEditingDescription.set(false);
      });
  }

  public startEditingDisplayName() {
    this.displayName.set(this.userDetail().displayName ?? '');
    this.isEditingDisplayName.set(true);
    this.loggingService.logEvent('DisplayNameEditingStart');
  }

  public cancelEditingDisplayName() {
    this.displayName.set(this.userDetail().displayName ?? '');
    this.isEditingDisplayName.set(false);
    this.loggingService.logEvent('DisplayNameEditingCancelled');
  }

  public saveDisplayName() {
    const newUserDetail: UserDetailDto = {
      ...this.userDetail(),
      displayName: this.displayName().trim(),
    };
    this.userService
      .updateCurrentUserDetail(newUserDetail)
      .subscribe((user) => {
        this.userDetail.set(user);

        this.displayName.set('');
        this.isEditingDisplayName.set(false);
      });
  }
}
