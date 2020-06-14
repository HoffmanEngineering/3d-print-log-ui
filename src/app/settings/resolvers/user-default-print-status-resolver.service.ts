import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  Router,
  RouterStateSnapshot,
} from '@angular/router';

import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserDetailDto, UserService } from 'src/app/core/services/user.service';

@Injectable()
export class CurrentUserDetailResolverService
  implements Resolve<UserDetailDto> {
  constructor(private userService: UserService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userService.getCurrentUserDetail();
  }
}
