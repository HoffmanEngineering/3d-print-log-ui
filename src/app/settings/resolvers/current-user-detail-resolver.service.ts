import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';

import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserDetailDto, UserService } from 'src/app/core/services/user.service';

@Injectable()
export class CurrentUserDetailResolverService {
  constructor(private userService: UserService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userService.getCurrentUserDetail();
  }
}
