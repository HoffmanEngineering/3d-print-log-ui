import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';

import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserDetailDto, UserService } from 'src/app/core/services/user.service';

@Injectable()
export class UserDetailResolverService  {
  constructor(
    private userService: UserService,
    private readonly router: Router
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const userId = +route.paramMap.get('id');

    if (Number.isInteger(userId)) {
      return this.userService.getUserDetail(userId).pipe(
        catchError(() => {
          this.router.navigate(['/users', 'not-found']);
          return EMPTY;
        })
      );
    }

    return null;
  }
}
