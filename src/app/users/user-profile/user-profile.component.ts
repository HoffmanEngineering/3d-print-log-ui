import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  DOCUMENT,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/core/services/auth.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { MetaTagService } from 'src/app/core/services/meta-tag.service';
import {
  SEO_PENDING,
  SeoLookupState,
  SeoService,
} from 'src/app/core/services/seo.service';
import {
  ProfileViewStatus,
  UserDetailDto,
  UserService,
} from 'src/app/core/services/user.service';
import { MatCard, MatCardHeader, MatCardContent } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { FormsModule } from '@angular/forms';
import { StatsComponent } from '../stats/stats.component';
import { AchievementStripComponent } from '../achievement-strip/achievement-strip.component';
import { AdComponent } from '../../shared/ad/ad.component';
import { UserPrintsComponent } from '../user-prints/user-prints.component';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    MatButton,
    MatMenuTrigger,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatFormField,
    MatLabel,
    MatInput,
    CdkTextareaAutosize,
    FormsModule,
    MatHint,
    StatsComponent,
    AchievementStripComponent,
    AdComponent,
    MatCardContent,
    UserPrintsComponent,
  ],
})
export class UserProfileComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly toastrService = inject(ToastrService);
  private readonly metaTagService = inject(MetaTagService);
  private readonly seoService = inject(SeoService);
  private readonly loggingService = inject(LoggingService);
  private readonly document = inject<Document>(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly userDetail = signal<UserDetailDto>(null);

  readonly currentUser = this.authService.userProfile;

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

  /**
   * The API's `/seo` answer for the profile on the route. Never waited on: until it settles,
   * and whenever it is not `ok`, the page describes itself from the resolved user.
   */
  private readonly seoLookup = toSignal(
    this.activatedRoute.data.pipe(
      map((data) => (data['userDetail'] as UserDetailDto | null)?.id),
      distinctUntilChanged(),
      switchMap(
        (id): Observable<SeoLookupState> =>
          id != null
            ? this.seoService
                .forUser(id)
                .pipe(startWith<SeoLookupState>(SEO_PENDING))
            : of<SeoLookupState>({ kind: 'unavailable' })
      )
    ),
    { initialValue: SEO_PENDING as SeoLookupState }
  );

  constructor() {
    effect(() => this.setMetaTags());

    // A public profile lifts the shell's noindex; the next page, reached in-app, gets it back.
    this.destroyRef.onDestroy(() => this.metaTagService.restoreShellRobots());
  }

  ngOnInit(): void {
    this.activatedRoute.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.userDetail.set(data.userDetail);
        this.viewStatus.set(data.userDetail.viewStatus);
      });
  }

  setMetaTags() {
    const userDetail = this.userDetail();
    const seo = this.seoLookup();

    if (seo.kind === 'ok') {
      this.metaTagService.applySeoMetadata(seo.seo);
      return;
    }
    if (seo.kind === 'not-public') {
      this.metaTagService.preventIndexing();
    } else {
      this.metaTagService.restoreShellRobots();
    }
    if (!userDetail) {
      return;
    }

    this.metaTagService.setTitle(
      `${userDetail.displayName} Profile - 3D Print Log`.trim()
    );

    const url = `${this.document.location.origin}/users/${userDetail.id}`;
    const title = `${userDetail.displayName} Profile - 3D Print Log`.trim();
    const description =
      `View ${userDetail.displayName}'s 3D prints and projects on 3DPrintLog.com`.trim();
    const imageUrl =
      userDetail.profilePicture !== '' ? userDetail.profilePicture : '';

    this.metaTagService.setSocialMediaTags(url, title, description, imageUrl, {
      type: 'profile',
    });
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
