import type { MockedObject } from 'vitest';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import {
  AuthService,
  UserProfileInfo,
} from 'src/app/core/services/auth.service';
import { UserDetailDto, UserService } from 'src/app/core/services/user.service';
import { AccountDeactivationBannerComponent } from './account-deactivation-banner.component';

describe('AccountDeactivationBannerComponent', () => {
  let fixture: ComponentFixture<AccountDeactivationBannerComponent>;
  let userProfile: WritableSignal<UserProfileInfo | null>;
  let auth: MockedObject<AuthService>;
  let userService: MockedObject<UserService>;

  const deactivated = {
    deactivationDateTime: new Date('2026-10-01T12:00:00Z'),
  } as UserProfileInfo;

  const render = (profile: UserProfileInfo | null) => {
    userProfile = signal(profile);
    auth = {
      updateCurrentUserDeactivationDate: vi
        .fn()
        .mockName('AuthService.updateCurrentUserDeactivationDate'),
      userProfile,
    } as unknown as MockedObject<AuthService>;
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
    userService = {
      reactivateCurrentUser: vi
        .fn()
        .mockName('UserService.reactivateCurrentUser'),
    } as unknown as MockedObject<UserService>;
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

  it('appears when the account is deactivated while the page is open', () => {
    render({ deactivationDateTime: null } as UserProfileInfo);

    userProfile.set(deactivated);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.pending-deletion-banner'
      )
    ).not.toBeNull();
  });

  it('reactivates the account and clears the deactivation date', () => {
    userService.reactivateCurrentUser.mockReturnValue(
      of({ deactivationDateTime: null } as UserDetailDto)
    );

    render(deactivated)!.querySelector('button')!.click();

    expect(userService.reactivateCurrentUser).toHaveBeenCalled();
    expect(auth.updateCurrentUserDeactivationDate).toHaveBeenCalledTimes(1);
    expect(auth.updateCurrentUserDeactivationDate).toHaveBeenCalledWith(null);
  });
});
