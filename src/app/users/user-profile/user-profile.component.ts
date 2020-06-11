import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import {
  AuthService,
  UserProfileInfo,
} from 'src/app/core/services/auth.service';
import { UserDetailDto, UserService } from 'src/app/core/services/user.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {
  public userDetail: UserDetailDto;

  public currentUser: UserProfileInfo;

  authServiceSubscription: Subscription;
  activatedRouteSubscription: Subscription;

  public isEditingDescription = false;

  /**
   * The ngModel used for updating the Bio.
   */
  public bio = '';

  constructor(
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private userService: UserService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.activatedRouteSubscription = this.activatedRoute.data.subscribe(
      (data) => {
        if (this.authServiceSubscription) {
          this.authServiceSubscription.unsubscribe();
        }

        this.userDetail = data.userDetail;

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

            console.log({ ...this.userDetail });

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

      console.log({ ...this.userDetail });

      this.authService.updateCurrentUserCoverPicture(null);
    });
  }

  public startEditingDescription() {
    this.bio = this.userDetail.bio;
    this.isEditingDescription = true;
  }

  public cancelEditingDescription() {
    this.bio = this.userDetail.bio;
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
}
