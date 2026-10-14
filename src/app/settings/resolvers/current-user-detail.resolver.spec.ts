import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserDetailDto, UserService } from 'src/app/core/services/user.service';
import { resolveValue } from 'src/app/core/resolvers/testing/run-resolver';
import { currentUserDetailResolver } from './current-user-detail.resolver';

describe('currentUserDetailResolver', () => {
  it('resolves the signed-in user', async () => {
    const user = { id: 1 } as UserDetailDto;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UserService,
          useValue: { getCurrentUserDetail: () => of(user) },
        },
      ],
    });

    await expectAsync(resolveValue(currentUserDetailResolver)).toBeResolvedTo(
      user
    );
  });
});
