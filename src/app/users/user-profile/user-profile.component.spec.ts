import { NO_ERRORS_SCHEMA, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, of, Subject } from 'rxjs';
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

import { UserProfileComponent } from './user-profile.component';

describe('UserProfileComponent', () => {
  let fixture: ComponentFixture<UserProfileComponent>;
  let component: UserProfileComponent;
  let userProfile$: BehaviorSubject<null>;
  let userService: jasmine.SpyObj<UserService>;
  let authService: jasmine.SpyObj<AuthService>;
  let metaTags: jasmine.SpyObj<MetaTagService>;
  let toastr: jasmine.SpyObj<ToastrService>;

  const user = {
    id: 12,
    displayName: 'Ada',
    bio: 'Prints things',
    profilePicture: 'https://img/ada.png',
    coverPicture: 'https://img/cover.png',
    viewStatus: ProfileViewStatus.Public,
  } as UserDetailDto;

  beforeEach(() => {
    userService = jasmine.createSpyObj<UserService>('UserService', [
      'updateCurrentUserDetail',
      'updateCurrentUserCoverPicture',
      'removeCurrentUserCoverPicture',
    ]);
    userService.updateCurrentUserDetail.and.callFake((detail) =>
      of(detail as UserDetailDto)
    );
    authService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['updateCurrentUserCoverPicture'],
      { userProfile$: (userProfile$ = new BehaviorSubject(null)) }
    );
    metaTags = jasmine.createSpyObj<MetaTagService>('MetaTagService', [
      'setTitle',
      'setSocialMediaTags',
    ]);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['error']);

    TestBed.configureTestingModule({
      declarations: [UserProfileComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { data: of({ userDetail: user }) },
        },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
        { provide: ToastrService, useValue: toastr },
        { provide: MetaTagService, useValue: metaTags },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
    });
    TestBed.overrideTemplate(UserProfileComponent, '');
    fixture = TestBed.createComponent(UserProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('titles the page and its share card after the user', () => {
    expect(metaTags.setTitle).toHaveBeenCalledWith(
      'Ada Profile - 3D Print Log'
    );
    expect(metaTags.setSocialMediaTags).toHaveBeenCalledWith(
      `${location.origin}/users/12`,
      'Ada Profile - 3D Print Log',
      "View Ada's 3D prints and projects on 3DPrintLog.com",
      'https://img/ada.png'
    );
  });

  it('saves a new profile visibility', () => {
    component.saveProfileVisibility(ProfileViewStatus.Private);

    expect(userService.updateCurrentUserDetail).toHaveBeenCalledOnceWith({
      ...user,
      viewStatus: ProfileViewStatus.Private,
    });
    expect(component.viewStatus()).toBe(ProfileViewStatus.Private);
  });

  it('saves a trimmed bio and leaves edit mode', () => {
    component.startEditingDescription();
    component.bio.set('  New bio  ');

    component.saveDescription();

    expect(
      userService.updateCurrentUserDetail.calls.mostRecent().args[0].bio
    ).toBe('New bio');
    expect(component.userDetail().bio).toBe('New bio');
    expect(component.isEditingDescription()).toBeFalse();
  });

  it('restores the saved bio when editing is cancelled', () => {
    component.startEditingDescription();
    component.bio.set('Draft');

    component.cancelEditingDescription();

    expect(component.bio()).toBe('Prints things');
    expect(component.isEditingDescription()).toBeFalse();
  });

  it('refuses a cover photo that is not an image', () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });

    component.addCoverPhoto({ target: { files: [file] } });

    expect(toastr.error).toHaveBeenCalled();
    expect(userService.updateCurrentUserCoverPicture).not.toHaveBeenCalled();
  });

  it('removes the cover photo everywhere it is shown', () => {
    userService.removeCurrentUserCoverPicture.and.returnValue(of(undefined));

    component.removeCoverPhoto();

    expect(component.userDetail().coverPicture).toBeNull();
    expect(authService.updateCurrentUserCoverPicture).toHaveBeenCalledOnceWith(
      null
    );
  });

  it('stops listening to the signed-in user once destroyed', () => {
    fixture.destroy();

    expect(userProfile$.observed).toBeFalse();
  });
});

/**
 * The real template, with responses that arrive after the first render the way
 * HTTP does. Zone change detection like the app, and startup settled first, so
 * a view that is not repainted shows up as stale.
 */
describe('UserProfileComponent rendering', () => {
  let fixture: ComponentFixture<UserProfileComponent>;
  let signedIn: BehaviorSubject<UserProfileInfo | null>;
  let saved: Subject<UserDetailDto>;

  const ada = {
    id: 12,
    displayName: 'Ada',
    bio: 'Prints things',
    profilePicture: '',
    coverPicture: '',
    viewStatus: ProfileViewStatus.Public,
  } as UserDetailDto;
  const host = () => fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    Array.from(host().querySelectorAll('button')).find((b) =>
      b.textContent!.includes(label)
    );

  beforeEach(async () => {
    signedIn = new BehaviorSubject<UserProfileInfo | null>(null);
    saved = new Subject();
    const userService = jasmine.createSpyObj<UserService>('UserService', [
      'updateCurrentUserDetail',
    ]);
    userService.updateCurrentUserDetail.and.returnValue(saved);

    TestBed.configureTestingModule({
      declarations: [UserProfileComponent],
      imports: [FormsModule, MatMenuModule],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ActivatedRoute,
          useValue: { data: of({ userDetail: ada }) },
        },
        { provide: AuthService, useValue: { userProfile$: signedIn } },
        { provide: UserService, useValue: userService },
        { provide: ToastrService, useValue: {} },
        {
          provide: MetaTagService,
          useValue: jasmine.createSpyObj('MetaTagService', [
            'setTitle',
            'setSocialMediaTags',
          ]),
        },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    fixture = TestBed.createComponent(UserProfileComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('offers Edit Bio once the owner turns out to be signed in', () => {
    expect(button('Edit Bio')).toBeUndefined();

    signedIn.next({ id: 12 } as UserProfileInfo);
    fixture.detectChanges();

    expect(button('Edit Bio')).toBeDefined();
  });

  it('shows the new bio once the save comes back', async () => {
    signedIn.next({ id: 12 } as UserProfileInfo);
    fixture.detectChanges();
    button('Edit Bio')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const textarea = host().querySelector('textarea')!;
    textarea.value = 'Prints boats';
    textarea.dispatchEvent(new Event('input'));
    button('Submit')!.click();
    fixture.detectChanges();

    saved.next({ ...ada, bio: 'Prints boats' });
    fixture.detectChanges();

    expect(host().querySelector('textarea')).toBeNull();
    expect(host().textContent).toContain('Prints boats');
  });
});
