import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { UserDetailDto, UserService } from 'src/app/core/services/user.service';

export const currentUserDetailResolver: ResolveFn<UserDetailDto> = () =>
  inject(UserService).getCurrentUserDetail();
