import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import {
  AuthService,
  UserProfileInfo,
} from 'src/app/core/services/auth.service';

import { UserProfileComponent } from './user-profile.component';

describe('UserProfileComponent (/profile)', () => {
  it("shows the signed-in user's profile", () => {
    const userProfile$ = new BehaviorSubject<UserProfileInfo | null>({
      id: 3,
      displayName: 'Ada',
    } as UserProfileInfo);
    TestBed.configureTestingModule({
      imports: [UserProfileComponent],
      providers: [{ provide: AuthService, useValue: { userProfile$ } }],
    });

    const fixture = TestBed.createComponent(UserProfileComponent);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('code')?.textContent
    ).toContain('"displayName": "Ada"');
  });
});
