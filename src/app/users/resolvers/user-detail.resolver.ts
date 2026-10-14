import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserDetailDto, UserService } from 'src/app/core/services/user.service';

/**
 * The user named by the `id` param. A user that cannot be loaded redirects to
 * the not-found page; completing without a value cancels this navigation.
 */
export const userDetailResolver: ResolveFn<UserDetailDto | null> = (route) => {
  const userId = +route.paramMap.get('id');

  if (Number.isInteger(userId)) {
    const router = inject(Router);
    return inject(UserService)
      .getUserDetail(userId)
      .pipe(
        catchError(() => {
          router.navigate(['/users', 'not-found']);
          return EMPTY;
        })
      );
  }

  return null;
};
