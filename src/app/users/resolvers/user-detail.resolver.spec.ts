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
  let userService: jasmine.SpyObj<UserService>;
  let router: jasmine.SpyObj<Router>;

  const routeFor = (id: string) => routeSnapshot({ params: { id } });

  beforeEach(() => {
    userService = jasmine.createSpyObj<UserService>('UserService', [
      'getUserDetail',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('resolves the user named by the id param', async () => {
    const user = { id: 12 } as UserDetailDto;
    userService.getUserDetail.and.returnValue(of(user));

    await expectAsync(
      resolveValue(userDetailResolver, routeFor('12'))
    ).toBeResolvedTo(user);
    expect(userService.getUserDetail).toHaveBeenCalledOnceWith(12);
  });

  it('sends the visitor to the not-found page when the user cannot be loaded', () => {
    userService.getUserDetail.and.returnValue(
      throwError(() => ({ status: 404 }))
    );
    const emitted = jasmine.createSpy('next');
    const completed = jasmine.createSpy('complete');

    (
      runResolver(userDetailResolver, routeFor('12')) as Observable<unknown>
    ).subscribe({ next: emitted, complete: completed });

    expect(router.navigate).toHaveBeenCalledOnceWith(['/users', 'not-found']);
    expect(emitted).not.toHaveBeenCalled();
    expect(completed).toHaveBeenCalled();
  });

  it('returns null when the id is not a number', () => {
    expect(runResolver(userDetailResolver, routeFor('abc'))).toBeNull();
  });
});
