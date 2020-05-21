import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';

import { UserDetailDto, UserService } from 'src/app/core/services/user.service';

@Injectable()
export class UserDetailResolverService implements Resolve<UserDetailDto> {
  constructor(private userService: UserService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const userId = +route.paramMap.get('id');

    if (Number.isInteger(userId)) {
      return this.userService.getUserDetail(userId);
    }

    return null;
  }
}
