import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';
import {
  AuthService,
  UserProfileInfo,
} from 'src/app/core/services/auth.service';
import { UserDetailDto, UserService } from 'src/app/core/services/user.service';
import { AccountDeactivationBannerComponent } from './account-deactivation-banner.component';

describe('AccountDeactivationBannerComponent', () => {
  let fixture: ComponentFixture<AccountDeactivationBannerComponent>;
  let userProfile$: BehaviorSubject<UserProfileInfo | null>;
  let auth: jasmine.SpyObj<AuthService>;
  let userService: jasmine.SpyObj<UserService>;

  const deactivated = {
    deactivationDateTime: new Date('2026-10-01T12:00:00Z'),
  } as UserProfileInfo;

  const render = (profile: UserProfileInfo | null) => {
    userProfile$ = new BehaviorSubject(profile);
    auth = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['updateCurrentUserDeactivationDate'],
      { userProfile$ }
    );
    TestBed.configureTestingModule({
      imports: [AccountDeactivationBannerComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: UserService, useValue: userService },
        { provide: MatDialog, useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(AccountDeactivationBannerComponent);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector(
      '.pending-deletion-banner'
    );
  };

  beforeEach(() => {
    userService = jasmine.createSpyObj<UserService>('UserService', [
      'reactivateCurrentUser',
    ]);
  });

  it('shows nothing to a signed-out visitor', () => {
    expect(render(null)).toBeNull();
  });

  it('shows nothing to an active account', () => {
    expect(
      render({ deactivationDateTime: null } as UserProfileInfo)
    ).toBeNull();
  });

  it('warns a deactivated account that its data is about to be removed', () => {
    const banner = render(deactivated);

    expect(banner?.textContent).toContain('Your Account was deactivated on');
    expect(banner?.textContent).toContain('Reactivate Account');
  });

  it('reactivates the account and clears the deactivation date', () => {
    userService.reactivateCurrentUser.and.returnValue(
      of({ deactivationDateTime: null } as UserDetailDto)
    );

    render(deactivated)!.querySelector('button')!.click();

    expect(userService.reactivateCurrentUser).toHaveBeenCalled();
    expect(auth.updateCurrentUserDeactivationDate).toHaveBeenCalledOnceWith(
      null
    );
  });

  it('stops listening to the user profile once destroyed', () => {
    render(null);

    fixture.destroy();

    expect(userProfile$.observed).toBeFalse();
  });
});
