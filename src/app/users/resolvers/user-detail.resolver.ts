import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserDetailDto, UserService } from 'src/app/core/services/user.service';

/**
 * The user named by the `id` param. A user that cannot be loaded redirects to
 * the not-found page; completing without a value cancels this navigation.
 *
 * Never resolves null: the profile reads the user unconditionally, and a null here (a
 * non-integer id such as /users/abc) crashed it on `coverPicture`.
 */
export const userDetailResolver: ResolveFn<UserDetailDto> = (route) => {
  const router = inject(Router);
  const notFound = () =>
    new RedirectCommand(router.createUrlTree(['/users', 'not-found']));

  const userId = Number(route.paramMap.get('id'));
  if (!Number.isInteger(userId)) {
    return notFound();
  }

  return inject(UserService)
    .getUserDetail(userId)
    .pipe(
      map((user) => user ?? notFound()),
      catchError(() => {
        router.navigate(['/users', 'not-found']);
        return EMPTY;
      })
    );
};
