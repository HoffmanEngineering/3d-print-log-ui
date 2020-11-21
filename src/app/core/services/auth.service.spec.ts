import { TestBed } from '@angular/core/testing';

import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { UserService } from './user.service';

xdescribe('AuthService', () => {
  beforeEach(() => {
    const mockUserService = jasmine.createSpyObj<UserService>('UserService', {
      getCurrentUserDetail: of(null),
    });

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
    });
  });

  it('should be created', () => {
    const service: AuthService = TestBed.inject(AuthService);
    expect(service).toBeTruthy();
  });
});
