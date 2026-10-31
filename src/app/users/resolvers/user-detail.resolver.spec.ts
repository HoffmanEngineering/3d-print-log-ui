import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { UserDetailDto, UserService } from 'src/app/core/services/user.service';
import {
  resolveValue,
  routeSnapshot,
  runResolver,
} from 'src/app/core/resolvers/testing/run-resolver';
import { userDetailResolver } from './user-detail.resolver';

describe('userDetailResolver', () => {
  let userService: MockedObject<UserService>;
  let router: MockedObject<Router>;

  const routeFor = (id: string) => routeSnapshot({ params: { id } });

  beforeEach(() => {
    userService = {
      getUserDetail: vi.fn().mockName('UserService.getUserDetail'),
    } as unknown as MockedObject<UserService>;
    router = {
      navigate: vi.fn().mockName('Router.navigate'),
    } as unknown as MockedObject<Router>;
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('resolves the user named by the id param', async () => {
    const user = { id: 12 } as UserDetailDto;
    userService.getUserDetail.mockReturnValue(of(user));

    await expect(
      resolveValue(userDetailResolver, routeFor('12'))
    ).resolves.toEqual(user);
    expect(userService.getUserDetail).toHaveBeenCalledTimes(1);
    expect(userService.getUserDetail).toHaveBeenCalledWith(12);
  });

  it('sends the visitor to the not-found page when the user cannot be loaded', () => {
    userService.getUserDetail.mockReturnValue(
      throwError(() => ({ status: 404 }))
    );
    const emitted = vi.fn();
    const completed = vi.fn();

    (
      runResolver(userDetailResolver, routeFor('12')) as Observable<unknown>
    ).subscribe({ next: emitted, complete: completed });

    expect(router.navigate).toHaveBeenCalledTimes(1);

    expect(router.navigate).toHaveBeenCalledWith(['/users', 'not-found']);
    expect(emitted).not.toHaveBeenCalled();
    expect(completed).toHaveBeenCalled();
  });

  it('returns null when the id is not a number', () => {
    expect(runResolver(userDetailResolver, routeFor('abc'))).toBeNull();
  });
});
